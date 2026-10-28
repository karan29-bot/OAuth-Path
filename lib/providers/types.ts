// lib/providers/types.ts
// ---------------------------------------------------------------------------
// The ONE contract every AI provider must satisfy. The shared pipeline in
// lib/agent.ts only ever talks to this interface, so it never knows (or cares)
// which provider is behind it.
//
// Why two steps instead of one? Searching and strict JSON output are different
// jobs, and splitting them keeps each prompt simple. So:
//   step 1  research()    = search the web, write free-text notes   (search ON,  no JSON)
//   step 2  formatGuide() = turn the notes into the Guide JSON      (search OFF, JSON)
// ---------------------------------------------------------------------------

export interface Source {
  title: string;
  url: string;
}

export interface ResearchResult {
  notes: string; // detailed research notes, plain text
  sources: Source[]; // every page the search really returned
}

export interface ResearchProvider {
  name: string; // e.g. "ollama" (a test mock may use anything)
  model: string; // shown on the guide page

  // Step 1: search the web and write detailed research notes.
  research(query: string, onProgress: (message: string) => void): Promise<ResearchResult>;

  // Step 2: turn notes + sources into the Guide JSON text. NO search tools here.
  formatGuide(notes: string, sources: Source[], systemPrompt: string): Promise<string>;
}
