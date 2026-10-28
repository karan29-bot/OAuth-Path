// lib/providers/search.ts
// ---------------------------------------------------------------------------
// Web search through Tavily (https://tavily.com). Reads TAVILY_API_KEY from the
// environment. One function: query in, list of pages out.
//
// Checked against docs.tavily.com on 2026-10-28: POST https://api.tavily.com/search,
// header "Authorization: Bearer <key>", body {query, max_results, search_depth},
// response {results:[{title,url,content,score}]}. NOT run live yet.
// Status codes that matter: 401 bad key, 429 rate limit, 432/433 usage limit reached.
// ---------------------------------------------------------------------------

export interface SearchResult {
  title: string;
  url: string;
  content: string; // a snippet of the page
}

// `fetchFn` is a parameter only so tests can pass a fake instead of the network.
export async function searchWeb(query: string, fetchFn: typeof fetch = fetch): Promise<SearchResult[]> {
  const res = await fetchFn("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, "Content-Type": "application/json" },
    // "basic" costs 1 credit per search ("advanced" costs 2).
    body: JSON.stringify({ query, max_results: 5, search_depth: "basic" }),
    signal: AbortSignal.timeout(30_000), // one slow search must not hang the whole run
  });
  if (!res.ok) {
    // The browser only gets friendlyMessage(), which reads just `status`. The message is for
    // the SERVER log only (the route blanks key-like strings before printing it).
    const reply = (await res.text().catch(() => "")).slice(0, 200);
    throw Object.assign(new Error(`Tavily search failed (${res.status}): ${reply}`), { status: res.status });
  }
  const data = await res.json();
  const results: { title?: string; url?: string; content?: string }[] = Array.isArray(data?.results) ? data.results : [];
  return results
    .filter((r) => typeof r.url === "string" && r.url !== "")
    .map((r) => ({ title: r.title || r.url!, url: r.url!, content: r.content ?? "" }));
}
