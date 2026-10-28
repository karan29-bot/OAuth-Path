// lib/providers/errors.ts
// ---------------------------------------------------------------------------
// Turns whatever went wrong into ONE short sentence for the browser.
//
// Security rule: we NEVER forward raw error text, because a provider may echo
// part of an API key in it. We only look at the HTTP status (which our adapter
// attaches to its errors as `status`) and a few keywords, then use our own words.
// ---------------------------------------------------------------------------

// An error whose message is already safe and readable. The pipeline throws
// these itself; they are the only messages passed to the user unchanged.
export class UserFacingError extends Error {}

export function friendlyMessage(err: unknown): string {
  if (err instanceof UserFacingError) return err.message;

  const status =
    typeof err === "object" && err !== null && "status" in err ? Number((err as { status: unknown }).status) : NaN;
  const text = (err instanceof Error ? err.message : "").toLowerCase();

  if (status === 401 || status === 403) {
    return "An API key was rejected (the AI model's or the web search service's: missing, invalid, or without access). Check the keys in .env.local and restart the server.";
  }
  if (status === 402) {
    return "The AI provider says this account has no credit. Check the account's billing page.";
  }
  // 432 and 433 are Tavily's "usage limit reached" codes.
  if (status === 429 || status === 432 || status === 433) {
    return "A quota or rate limit was reached (the AI model or the web search service). Free tiers have low limits. Wait a minute and retry, or check your usage in the provider's dashboard.";
  }
  if (status === 404) {
    return "The AI provider does not know the model name. Set OLLAMA_MODEL to a model from https://ollama.com/api/tags and restart.";
  }
  if (status >= 500 || /timeout|timed out|fetch failed|econnreset/.test(text)) {
    return "The AI provider is temporarily unavailable. Please try again.";
  }
  return "Something went wrong while researching. Please try again.";
}
