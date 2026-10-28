// tests/agent.test.ts
// End-to-end tests of the SHARED pipeline (generateGuide) using a MockProvider.
// No network, no API keys: the mock implements the same interface as the real adapters.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGuide } from "../lib/agent";
import { UserFacingError } from "../lib/providers/errors";
import type { ResearchProvider, Source } from "../lib/providers/types";
import { LIBRARY } from "../lib/library";

// A valid guide body (the curated Slack-style guide minus slug/meta), with our own sources.
function validBody(overrides: Record<string, unknown> = {}) {
  const { slug: _slug, meta: _meta, ...rest } = LIBRARY[0];
  return {
    ...rest,
    sources: [
      { title: "Real docs", url: "https://docs.example.com/oauth", kind: "primary" },
      { title: "Invented page", url: "https://invented.example.com/never-seen", kind: "primary" },
    ],
    time: { ...rest.time, evidence: { confidence: "official", sources: [0] } },
    requirements: [
      { title: "Real", detail: "d", evidence: { confidence: "official", sources: [0] } },
      { title: "Only invented", detail: "d", evidence: { confidence: "official", sources: [1] } },
    ],
    blockers: [],
    ...overrides,
  };
}

// The pages the "search" returned: only the real one.
const SEEN: Source[] = [{ title: "Real docs", url: "https://docs.example.com/oauth/" }];

class MockProvider implements ResearchProvider {
  name = "mock";
  model = "mock-model-1";
  formatCalls: string[] = []; // the systemPrompt of every formatGuide call
  constructor(
    private replies: string[],
    private seen: Source[] = SEEN,
    private notes = "Some research notes.",
  ) {}
  async research(_q: string, onProgress: (m: string) => void) {
    onProgress("Searching: mock query");
    return { notes: this.notes, sources: this.seen };
  }
  async formatGuide(_n: string, _s: Source[], systemPrompt: string) {
    this.formatCalls.push(systemPrompt);
    return this.replies[Math.min(this.formatCalls.length - 1, this.replies.length - 1)];
  }
}

test("valid JSON becomes a guide; WE set slug, meta and attemptedSetup", async () => {
  const messages: string[] = [];
  // the model lies and claims it tested the setup; the pipeline must override that
  const body = validBody({ testing: { attemptedSetup: true, notes: "I did it." } });
  const provider = new MockProvider(["```json\n" + JSON.stringify(body) + "\n```"]);

  const guide = await generateGuide("Example", (m) => messages.push(m), provider);

  assert.match(guide.slug, /^g-[a-z0-9-]+-[a-z0-9]{1,6}$/);
  assert.equal(guide.meta.origin, "live-agent");
  assert.equal(guide.meta.model, "mock-model-1");
  assert.equal(guide.testing.attemptedSetup, false);
  assert.match(guide.testing.notes, /No OAuth app was created/);
  assert.equal(provider.formatCalls.length, 1); // no repair needed
  assert.ok(messages.some((m) => m.includes("Searching: mock query")));
  assert.equal(messages.at(-1), "Guide ready");
});

test("invalid JSON is repaired once, with the validation errors in the repair request", async () => {
  const broken = JSON.stringify({ ...validBody(), difficulty: "impossible" });
  const provider = new MockProvider([broken, JSON.stringify(validBody())]);

  const guide = await generateGuide("Example", () => {}, provider);

  assert.equal(provider.formatCalls.length, 2);
  assert.match(provider.formatCalls[1], /FAILED VALIDATION/);
  assert.match(provider.formatCalls[1], /difficulty/); // names the bad field
  assert.equal(guide.difficulty, validBody().difficulty);
});

test("text that is not JSON at all is also repaired", async () => {
  const provider = new MockProvider(["Sorry, I cannot do that.", JSON.stringify(validBody())]);
  const guide = await generateGuide("Example", () => {}, provider);
  assert.equal(provider.formatCalls.length, 2);
  assert.ok(guide.app);
});

test("if the repair is also invalid we give up with a readable error (no third try)", async () => {
  const provider = new MockProvider(["nope", "still nope"]);
  await assert.rejects(generateGuide("Example", () => {}, provider), (e: unknown) => {
    assert.ok(e instanceof UserFacingError);
    assert.match((e as Error).message, /valid guide/);
    return true;
  });
  assert.equal(provider.formatCalls.length, 2);
});

test("a cited-but-never-retrieved source is flagged and claims resting on it are downgraded", async () => {
  const provider = new MockProvider([JSON.stringify(validBody())]);
  const guide = await generateGuide("Example", () => {}, provider);

  assert.deepEqual(guide.meta.unverifiedSourceUrls, ["https://invented.example.com/never-seen"]);
  assert.match(guide.sources[1].title, /not retrieved/);
  assert.doesNotMatch(guide.sources[0].title, /not retrieved/); // trailing-slash difference still matches
  assert.equal(guide.requirements[0].evidence.confidence, "official"); // real source keeps its rating
  assert.equal(guide.requirements[1].evidence.confidence, "uncertain"); // only the invented source
});

test("empty research notes fail early with a readable error", async () => {
  const provider = new MockProvider([JSON.stringify(validBody())], SEEN, "   ");
  await assert.rejects(generateGuide("Example", () => {}, provider), UserFacingError);
  assert.equal(provider.formatCalls.length, 0); // never reached step 2
});

test("no provider configured gives a readable error", async () => {
  await assert.rejects(generateGuide("Example", () => {}, null), UserFacingError);
});
