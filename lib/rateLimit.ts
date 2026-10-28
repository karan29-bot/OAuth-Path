// lib/rateLimit.ts
// ---------------------------------------------------------------------------
// A very small "N requests per hour per visitor" limiter.
// Why: every live guide costs real money (LLM + web search). Without a limit,
// anyone who finds the URL could run up the bill.
// LIMITATION: it lives in memory, so it resets when the server restarts and is
// not shared across multiple server instances. Fine for a demo, not production.
// ---------------------------------------------------------------------------
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = Number(process.env.GENERATE_LIMIT_PER_HOUR || 6);

const hits = new Map<string, number[]>();

export function allow(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
