# Study guide: the live agent

Written so you can explain every part to an interviewer. Status of everything below: unit-tested with a mock and a fake `fetch`. Two apps (Notion, Shopify) have been generated end to end live and their links checked, as reported by the author; **claims were not all checked against the sources** (see VERIFICATION.md).

## The one idea

The app has **one shared pipeline** (`lib/agent.ts`) and **one small adapter per AI provider** (`lib/providers/`). Only an Ollama adapter exists today. The pipeline talks only to the `ResearchProvider` interface, so adding a provider later means writing one more adapter, not changing the pipeline.

```
getProvider()  -->  OllamaProvider (if OLLAMA_API_KEY and TAVILY_API_KEY are set, else null)
                         |
generateGuide(query)     v
  1. provider.research(query)      search the web -> { notes, sources }
  2. provider.formatGuide(...)     notes -> Guide JSON text
  3. extractJson + zod             parse and validate
  4. repair once                   if invalid, ask again with the errors
  5. auditSources                  flag cited URLs the search never returned
  6. we set slug, meta, attemptedSetup=false
```

## Why two steps (research, then format)?

Searching and writing strict JSON are different jobs. Splitting them keeps each prompt simple and lets the pipeline validate and repair the JSON step on its own.

## How the Ollama adapter researches (`lib/providers/ollama.ts`)

Ollama writes text but does not search by itself, and its own search API needs paid credits (it answered HTTP 402). So Tavily does the searching (`lib/providers/search.ts`) and the adapter runs the loop:
1. The model proposes 4 to 6 search queries (if its answer is not a usable JSON list, three fallback queries are used).
2. We call Tavily (`POST https://api.tavily.com/search`) for each query, in parallel. One failing search is tolerated; all failing is not, and the HTTP status is passed on.
3. The model writes research notes from the returned snippets.
4. The sources returned are exactly the pages the search found, with real URLs.

Trade-off: the model does not decide mid-research to search again. The default model `gemma4:31b` comes from an example in the docs; `OLLAMA_MODEL` overrides it without a code change.

## Why we never trust the model

- **Schema:** `GuideBodySchema` (zod). Invalid output gets exactly one repair attempt, then a readable error.
- **We own the trusted fields:** the model cannot set `slug`, `meta`, or claim `attemptedSetup=true`.
- **Evidence audit:** a source the model cites but the search never returned is flagged "(not retrieved by the agent)", listed in `meta.unverifiedSourceUrls`, and any claim resting only on such sources becomes `uncertain`. Because the sources are real URLs from the search, this check is exact.

## Error handling

`friendlyMessage` (`lib/providers/errors.ts`) turns failures into one short sentence (bad key, no credit, rate limit or usage limit, unknown model, provider down) using only the HTTP status and a few keywords. It never forwards raw error text, because a provider may echo part of an API key. The server log shows the same, with key-like strings blanked out.

## Likely interview questions

- *Why an interface with only one implementation?* The pipeline needs only "research" and "format"; the interface keeps it testable (a MockProvider runs the whole pipeline offline) and lets another provider be added without touching it.
- *What does the audit not catch?* Misreadings of real pages.
- *What is untested?* Only two apps were run live and only the links were checked, not every claim. Next step: more apps and spot-checking claims against the sources.
- *Why is the model name configurable?* Model names change often; it is one constant plus an optional `OLLAMA_MODEL` override.
