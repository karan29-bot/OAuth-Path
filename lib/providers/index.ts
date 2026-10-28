// lib/providers/index.ts
// ---------------------------------------------------------------------------
// Returns the AI provider to use, or null if it is not configured.
// Today there is one provider (Ollama Cloud for the text, Tavily for the web
// search), so BOTH keys are needed. Adding another provider later means writing
// one more adapter that implements ResearchProvider and returning it from here.
//
// We only check that the keys EXIST. We never read their values or log them.
// ---------------------------------------------------------------------------
import { OllamaProvider } from "./ollama";
import type { ResearchProvider } from "./types";

export const KEY_VARS = ["OLLAMA_API_KEY", "TAVILY_API_KEY"];

export function getProvider(): ResearchProvider | null {
  const allSet = KEY_VARS.every((v) => Boolean(process.env[v]?.trim()));
  return allSet ? new OllamaProvider() : null;
}
