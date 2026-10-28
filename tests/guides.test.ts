// tests/guides.test.ts
// Run with:  npm test
// These tests need no network and no API key. They protect the parts of the app
// that must never silently break: the data shape, the evidence rules, and the store.
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.GUIDE_STORE_DIR = path.join(os.tmpdir(), `oauth-path-test-${process.pid}`);

import { LIBRARY } from "../lib/library";
import { GuideSchema } from "../lib/types";
import { auditSources, extractJson, GuideBodySchema } from "../lib/agent";
import { isGeneratedSlug, loadGuide, saveGuide } from "../lib/store";

test("every curated guide matches the Guide schema", () => {
  for (const g of LIBRARY) {
    const r = GuideSchema.safeParse(g);
    assert.ok(r.success, `${g.slug}: ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3))}`);
  }
});

test("every evidence reference points at a real source", () => {
  for (const g of LIBRARY) {
    const evidences = [g.time.evidence, ...g.requirements.map((r) => r.evidence), ...g.blockers.map((b) => b.evidence)];
    for (const e of evidences) {
      for (const n of e.sources) {
        assert.ok(n >= 0 && n < g.sources.length, `${g.slug}: source index ${n} out of range`);
      }
    }
  }
});

test("a claim marked 'official' cites at least one PRIMARY source", () => {
  for (const g of LIBRARY) {
    const evidences = [g.time.evidence, ...g.requirements.map((r) => r.evidence), ...g.blockers.map((b) => b.evidence)];
    for (const e of evidences) {
      if (e.confidence === "official") {
        assert.ok(e.sources.length > 0, `${g.slug}: official claim with no source`);
        assert.ok(
          e.sources.some((n) => g.sources[n].kind === "primary"),
          `${g.slug}: 'official' claim cites only secondary sources`,
        );
      }
    }
  }
});

test("curated guides never claim a setup was attempted unless they say what was done", () => {
  for (const g of LIBRARY) {
    assert.equal(g.testing.attemptedSetup, false);
    assert.ok(g.testing.notes.length > 20);
  }
});

test("all source URLs are https and unique within a guide", () => {
  for (const g of LIBRARY) {
    const urls = g.sources.map((s) => s.url);
    assert.ok(urls.every((u) => u.startsWith("https://")), `${g.slug}: non-https source`);
    assert.equal(new Set(urls).size, urls.length, `${g.slug}: duplicate source`);
  }
});

test("auditSources flags unretrieved URLs and downgrades claims that rest only on them", () => {
  const base = LIBRARY[0];
  const body = GuideBodySchema.parse({
    ...base,
    sources: [
      { title: "Real", url: "https://docs.example.com/a/", kind: "primary" },
      { title: "Made up", url: "https://fake.example.com/b", kind: "primary" },
    ],
    time: { ...base.time, evidence: { confidence: "official", sources: [1] } },
    requirements: [
      { title: "ok", detail: "d", evidence: { confidence: "official", sources: [0] } },
      { title: "bad", detail: "d", evidence: { confidence: "official", sources: [1] } },
      { title: "none", detail: "d", evidence: { confidence: "official", sources: [] } },
      { title: "range", detail: "d", evidence: { confidence: "official", sources: [0, 99] } },
    ],
    blockers: [],
  });
  // the search tool "returned" only the first URL (note: no trailing slash, to test normalisation)
  const { body: audited, unverified } = auditSources(body, new Set(["https://docs.example.com/a"]));

  assert.deepEqual(unverified, ["https://fake.example.com/b"]);
  assert.equal(audited.time.evidence.confidence, "uncertain");
  assert.equal(audited.requirements[0].evidence.confidence, "official"); // genuine source keeps its rating
  assert.equal(audited.requirements[1].evidence.confidence, "uncertain"); // only an unretrieved source
  assert.equal(audited.requirements[2].evidence.confidence, "uncertain"); // no source at all
  assert.deepEqual(audited.requirements[3].evidence.sources, [0]); // bad index dropped
  assert.match(audited.sources[1].title, /not retrieved/);
});

test("extractJson copes with fences and chatter", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here you go: {"a":{"b":2}} thanks'), { a: { b: 2 } });
  assert.throws(() => extractJson("no json here"));
});

test("store round-trips a generated guide and rejects unsafe ids", async () => {
  assert.equal(isGeneratedSlug("g-notion-abc123"), true);
  assert.equal(isGeneratedSlug("../etc/passwd"), false);
  assert.equal(isGeneratedSlug("slack"), false);
  assert.equal(await loadGuide("../../etc/passwd"), null);

  const guide = { ...LIBRARY[0], slug: "g-test-abc123", meta: { origin: "live-agent" as const, generatedAt: "2026-10-28" } };
  await saveGuide(guide);
  const back = await loadGuide("g-test-abc123");
  assert.equal(back?.app, guide.app);
  await assert.rejects(saveGuide({ ...guide, slug: "../evil" }));
});

// ---- stream parsing (the browser side of live generation) ----
import { drainEvents } from "../lib/sse";

test("drainEvents handles whole, split and batched messages", () => {
  const a = 'data: {"type":"progress","message":"one"}\n\n';
  const b = 'data: {"type":"done","slug":"g-x-abc123"}\n\n';

  // two complete messages in one chunk
  let r = drainEvents(a + b);
  assert.equal(r.events.length, 2);
  assert.equal(r.rest, "");

  // a message cut in half by the network: nothing yet, then complete after the next chunk
  const cut = 20;
  r = drainEvents(a.slice(0, cut));
  assert.equal(r.events.length, 0);
  r = drainEvents(r.rest + a.slice(cut));
  assert.deepEqual(r.events, [{ type: "progress", message: "one" }]);

  // split exactly between the two newlines of the separator
  r = drainEvents(a.slice(0, -1));
  assert.equal(r.events.length, 0);
  r = drainEvents(r.rest + a.slice(-1) + b);
  assert.equal(r.events.length, 2);

  // junk and keep-alive lines are ignored, not fatal
  r = drainEvents(": keep-alive\n\ndata: {not json}\n\n" + b);
  assert.deepEqual(r.events, [{ type: "done", slug: "g-x-abc123" }]);
});
