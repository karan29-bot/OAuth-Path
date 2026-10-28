// tests/providers.test.ts
// Provider selection, error mapping, Tavily search and the Ollama adapter.
// No network and no real keys: we set FAKE values in process.env, then restore it,
// and the adapter gets a fake `fetch`. (We never read any .env file.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { getProvider } from "../lib/providers";
import { friendlyMessage, UserFacingError } from "../lib/providers/errors";
import { OllamaProvider } from "../lib/providers/ollama";
import { searchWeb } from "../lib/providers/search";

const VARS = ["OLLAMA_API_KEY", "TAVILY_API_KEY", "OLLAMA_MODEL"];

// Run `fn` with exactly these env values, then put the old values back.
function withEnv(values: Record<string, string>, fn: () => void) {
  const saved = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
  try {
    for (const v of VARS) delete process.env[v];
    Object.assign(process.env, values);
    fn();
  } finally {
    for (const v of VARS) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
  }
}

test("getProvider needs BOTH keys; a missing or blank one gives null", () => {
  withEnv({}, () => assert.equal(getProvider(), null));
  withEnv({ OLLAMA_API_KEY: "fake" }, () => assert.equal(getProvider(), null)); // no search key
  withEnv({ TAVILY_API_KEY: "fake" }, () => assert.equal(getProvider(), null)); // no model key
  withEnv({ OLLAMA_API_KEY: "fake", TAVILY_API_KEY: "   " }, () => assert.equal(getProvider(), null));
  withEnv({ OLLAMA_API_KEY: "", TAVILY_API_KEY: "fake" }, () => assert.equal(getProvider(), null));
});

test("getProvider returns the Ollama provider when both keys are set", () => {
  withEnv({ OLLAMA_API_KEY: "fake", TAVILY_API_KEY: "fake" }, () => assert.equal(getProvider()?.name, "ollama"));
});

test("friendlyMessage maps errors to short messages and never leaks the raw text", () => {
  const leaky = (status: number, text: string) => Object.assign(new Error(text), { status });

  assert.match(friendlyMessage(leaky(401, "Incorrect API key provided: sk-SECRET123")), /API key was rejected/);
  assert.match(friendlyMessage(leaky(403, "forbidden")), /API key was rejected/);
  assert.match(friendlyMessage(leaky(402, "payment required")), /no credit/);
  assert.match(friendlyMessage(leaky(429, "Too many requests")), /quota or rate limit/);
  assert.match(friendlyMessage(leaky(432, "usage limit")), /quota or rate limit/); // Tavily plan limit
  assert.match(friendlyMessage(leaky(433, "pay-as-you-go limit")), /quota or rate limit/);
  assert.match(friendlyMessage(leaky(404, "model not found")), /OLLAMA_MODEL/);
  assert.match(friendlyMessage(leaky(503, "Overloaded")), /temporarily unavailable/);
  assert.match(friendlyMessage(new Error("fetch failed")), /temporarily unavailable/);
  assert.match(friendlyMessage(new Error("boom")), /Something went wrong/);

  assert.doesNotMatch(friendlyMessage(leaky(401, "Incorrect API key provided: sk-SECRET123")), /SECRET/);
  assert.equal(friendlyMessage(new UserFacingError("Readable.")), "Readable."); // our own messages pass through
});

// ---- Tavily search, with a fake fetch ----

test("searchWeb sends the key as a Bearer token and maps results", async () => {
  let seen: { url: string; auth: string | null; body: any } | null = null;
  const fn = (async (url: string, init: RequestInit) => {
    seen = { url, auth: new Headers(init.headers).get("authorization"), body: JSON.parse(String(init.body)) };
    return Response.json({ results: [{ title: "T", url: "https://a.example.com", content: "c", score: 0.9 }, { title: "no url" }] });
  }) as unknown as typeof fetch;

  const out = await (async () => {
    const saved = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = "tvly-FAKE";
    try {
      return await searchWeb("my query", fn);
    } finally {
      if (saved === undefined) delete process.env.TAVILY_API_KEY;
      else process.env.TAVILY_API_KEY = saved;
    }
  })();

  assert.deepEqual(out, [{ title: "T", url: "https://a.example.com", content: "c" }]); // result without a url is dropped
  assert.equal(seen!.url, "https://api.tavily.com/search");
  assert.equal(seen!.auth, "Bearer tvly-FAKE");
  assert.equal(seen!.body.query, "my query");
});

test("searchWeb turns an HTTP error into an error carrying the status", async () => {
  const fn = (async () => new Response('{"detail":"limit"}', { status: 432 })) as unknown as typeof fetch;
  await assert.rejects(searchWeb("q", fn), (e: unknown) => {
    assert.equal((e as { status: number }).status, 432);
    assert.match(friendlyMessage(e), /quota or rate limit/);
    return true;
  });
});

// ---- Ollama adapter, with a fake fetch (no network, no key) ----

// Answers Ollama chat (/api/chat) and Tavily search (/search) like the real ones would. `calls` records what was asked.
function fakeOllama(opts: { plan?: string; searchStatus?: number } = {}) {
  const calls: { path: string; body: any }[] = [];
  let chatCount = 0;
  const fn = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(String(init.body));
    calls.push({ path, body });
    if (path === "/search") {
      if (opts.searchStatus) return new Response("nope", { status: opts.searchStatus });
      return Response.json({
        results: [
          { title: "Docs", url: "https://docs.example.com/oauth", content: "Register an app." },
          { title: "Blog", url: "https://blog.example.com/x", content: "Takes a week." },
        ],
      });
    }
    chatCount++;
    const content = chatCount === 1 ? (opts.plan ?? '["q one", "q two"]') : "NOTES TEXT";
    return Response.json({ message: { content } });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

test("OllamaProvider: plans queries, searches, returns exact sources and notes", async () => {
  const { fn, calls } = fakeOllama();
  const progress: string[] = [];
  const r = await new OllamaProvider(fn).research("Example", (m) => progress.push(m));

  assert.equal(r.notes, "NOTES TEXT");
  assert.deepEqual(r.sources, [
    { title: "Docs", url: "https://docs.example.com/oauth" }, // two searches returned the same pages: de-duplicated
    { title: "Blog", url: "https://blog.example.com/x" },
  ]);
  assert.deepEqual(calls.filter((c) => c.path === "/search").map((c) => c.body.query).sort(), ["q one", "q two"]);
  assert.ok(progress.includes("Searching: q one"));
});

test("OllamaProvider: an unusable plan falls back to default queries", async () => {
  const { fn, calls } = fakeOllama({ plan: "sorry, no" });
  await new OllamaProvider(fn).research("Example", () => {});
  assert.equal(calls.filter((c) => c.path === "/search").length, 3);
});

test("OllamaProvider: formatGuide passes the system prompt through and returns the model text", async () => {
  // the fake's first chat reply is the "plan" text, so a lone formatGuide call returns exactly that
  const { fn, calls } = fakeOllama({ plan: '{"app":"X"}' });
  assert.equal(await new OllamaProvider(fn).formatGuide("n", [], "SYS"), '{"app":"X"}');
  assert.equal(calls[0].path, "/api/chat");
  assert.equal(calls[0].body.messages[0].content, "SYS");
});

test("OllamaProvider: when every search fails, the HTTP status surfaces as a key error", async () => {
  const { fn } = fakeOllama({ searchStatus: 401 });
  await assert.rejects(new OllamaProvider(fn).research("Example", () => {}), (e: unknown) => {
    assert.match(friendlyMessage(e), /API key was rejected/);
    return true;
  });
});

test("OllamaProvider: OLLAMA_MODEL overrides the default model", () => {
  withEnv({ OLLAMA_MODEL: "my-model:cloud" }, () => assert.equal(new OllamaProvider().model, "my-model:cloud"));
  withEnv({}, () => assert.equal(new OllamaProvider().model, "gemma4:31b"));
});

test("OllamaProvider: an HTTP error while planning (e.g. 402 no credit) is surfaced, not hidden by the fallback", async () => {
  const fn = (async () => new Response('{"error":"Add usage credits"}', { status: 402 })) as unknown as typeof fetch;
  await assert.rejects(new OllamaProvider(fn).research("Example", () => {}), (e: unknown) => {
    assert.equal((e as { status: number }).status, 402);
    return true;
  });
});
