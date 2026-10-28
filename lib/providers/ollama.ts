// lib/providers/ollama.ts
// ---------------------------------------------------------------------------
// Ollama Cloud adapter. Reads OLLAMA_API_KEY from the environment.
// Ollama writes the text; the web search is done by Tavily (see search.ts), because
// Ollama's own web search needs paid credits. WE run the search loop:
//   1. ask the model for 4-6 search queries
//   2. search each query with Tavily (searchWeb)
//   3. ask the model to write notes from the returned snippets
// Bonus: the sources are exactly the pages the search returned, with real URLs,
// so the evidence audit is exact.
//
// Checked against docs.ollama.com on 2026-10-28: POST https://ollama.com/api/chat with
// Authorization: Bearer <key>. The chat call ran live (it planned queries). UNCERTAIN:
//  - the default model name (the docs only show "gemma4:31b" as an example);
//    set OLLAMA_MODEL to use another one without editing code.
// ---------------------------------------------------------------------------
import { buildFormatInput, RESEARCH_PROMPT, researchRequest } from "./prompts";
import { UserFacingError } from "./errors";
import { searchWeb } from "./search";
import type { ResearchProvider, ResearchResult, Source } from "./types";

const BASE_URL = "https://ollama.com";
// The ONLY place the default model name lives. OLLAMA_MODEL overrides it.
const DEFAULT_MODEL = "gemma4:31b";

const PLAN_PROMPT = `You plan web searches for an OAuth integration researcher. Reply with ONLY a JSON array of 4 to 6 short web search queries (strings) that will find: how a developer registers an OAuth app for the given app, its scopes and redirect URI rules, any review/verification/partner approval, review durations, and prerequisites. Start with queries aimed at the provider's own developer documentation.`;

const NOTES_PROMPT = `${RESEARCH_PROMPT}

You cannot search yourself. Write the notes ONLY from the SEARCH RESULTS you are given, and name the page (title and URL) for every fact.`;

const FALLBACK_QUERIES = (q: string) => [
  `${q} OAuth app registration developer documentation`,
  `${q} API OAuth scopes redirect URI`,
  `${q} OAuth app review approval verification`,
];

export class OllamaProvider implements ResearchProvider {
  name = "ollama";
  model = process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;

  // `fetchFn` is a parameter only so tests can pass a fake instead of the network.
  constructor(private fetchFn: typeof fetch = fetch) {}

  private async post(path: string, body: unknown): Promise<any> {
    const res = await this.fetchFn(BASE_URL + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000), // one slow call must not hang the whole run
    });
    if (!res.ok) {
      // The browser only ever gets friendlyMessage(), which reads just `status`. The message
      // below (endpoint + first 200 characters of Ollama's reply) is for the SERVER log only,
      // where the route blanks out anything key-like before printing.
      const reply = (await res.text().catch(() => "")).slice(0, 200);
      throw Object.assign(new Error(`Ollama ${path} failed (${res.status}): ${reply}`), { status: res.status });
    }
    return res.json();
  }

  private async chat(system: string, user: string): Promise<string> {
    const data = await this.post("/api/chat", {
      model: this.model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return String(data?.message?.content ?? "");
  }

  async research(query: string, onProgress: (m: string) => void): Promise<ResearchResult> {
    // 1. Which searches should we run?
    onProgress("Planning searches");
    let queries: string[] = [];
    try {
      const text = await this.chat(PLAN_PROMPT, researchRequest(query));
      const parsed: unknown = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
      if (Array.isArray(parsed)) queries = parsed.filter((q): q is string => typeof q === "string" && q.trim() !== "");
    } catch (err) {
      // A plan we cannot PARSE is not fatal: use the fallback queries below.
      // But an HTTP error (bad key, no credit, rate limit) is real: surface it instead of
      // hiding it. (An earlier version swallowed these and looked like it was working.)
      if (typeof (err as { status?: unknown }).status === "number") throw err;
    }
    queries = (queries.length ? queries : FALLBACK_QUERIES(query)).slice(0, 6);

    // 2. Run the searches in parallel. One failing search is tolerated; all failing is not.
    const settled = await Promise.allSettled(
      queries.map(async (q) => {
        onProgress(`Searching: ${q}`);
        return searchWeb(q, this.fetchFn);
      }),
    );
    const failures = settled.filter((s): s is PromiseRejectedResult => s.status === "rejected");
    if (failures.length === settled.length) throw failures[0].reason; // e.g. bad key, quota

    const pages = new Map<string, { title: string; url: string; content: string }>(); // by URL
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const r of s.value) {
        if (r.url && !pages.has(r.url)) pages.set(r.url, { title: r.title || r.url, url: r.url, content: r.content ?? "" });
      }
    }
    if (pages.size === 0) throw new UserFacingError("The web search returned no results. Please try again.");
    onProgress(`Read ${pages.size} pages`);

    // 3. Notes from the snippets (each cut to 1500 characters to keep the prompt small).
    onProgress("Writing research notes");
    const list = [...pages.values()];
    const results = list.map((p, i) => `[${i}] ${p.title}\n${p.url}\n${p.content.slice(0, 1500)}`).join("\n\n");
    const notes = await this.chat(NOTES_PROMPT, `App: "${query}"\n\nSEARCH RESULTS:\n${results}`);

    const sources: Source[] = list.map((p) => ({ title: p.title, url: p.url }));
    return { notes, sources };
  }

  async formatGuide(notes: string, sources: Source[], systemPrompt: string): Promise<string> {
    return this.chat(systemPrompt, buildFormatInput(notes, sources));
  }
}
