# Verification notes

Research date: 2026-10-28. Method: web search to find pages, then fetching the provider's own pages and reading them. No OAuth app was created or submitted for any provider (that needs real accounts, logins and business details), so **nothing here was "tested" by doing the setup**. What was tested is the product itself (see the last section).

Legend: **Confirmed** = read on the provider's own current page. **Third-party** = only non-provider sources. **Not confirmed** = could not find or retrieve.

## GitHub

| Claim | Status |
|---|---|
| Register under personal account or any org where you are admin | Confirmed (GitHub Enterprise Server 3.x versions of the page) |
| Fields: name, homepage URL, optional description, callback URL; only one callback URL for OAuth apps; optional device flow | Confirmed (same) |
| Org members need an owner's approval to authorize an app when OAuth app access restrictions are on | Confirmed (current docs page) |
| GitHub suggests considering a GitHub App | Confirmed |
| No review step | **Not confirmed explicitly.** The steps end at "Register application" and mention no review. Inferred from absence. |
| Generating a client secret | Not on the pages retrieved |

**Could not do:** the current cloud version of "Creating an OAuth app" was not retrievable here, so steps come from versioned Enterprise Server copies.

## Slack

| Claim | Status |
|---|---|
| Review stages and durations: preliminary up to 10 business days; functional up to 10 weeks (new) / 6 weeks (resubmission) | Confirmed (Slack review guide) |
| Must be installed on 10+ active workspaces (used in last 28 days) before submitting | Confirmed (Slack review guide and guidelines) |
| Live app is locked after publishing; new scopes need resubmission | Confirmed |
| Public landing page, support within 2 business days, privacy policy contents | Confirmed (guidelines) |
| Unsuitable apps (Sign in with Slack only, LLM training on Slack data, MCP-only, etc.) | Confirmed |
| Unlisted public distribution needs no review | Third-party plus the listed/unlisted distinction in Slack's docs. No primary statement found. |

**Corrected:** a third-party snippet suggested a lower install threshold (cut off at "5 or"). Slack's own docs say 10. A 2026 blog described roughly a 12-week clock. Slack's own figures are 10 business days plus up to 10 weeks.

## Google (Gmail API)

| Claim | Status |
|---|---|
| Sensitive or restricted scopes require verification; non-sensitive-only apps need not verify (brand verification optional for name and logo) | Confirmed (Google help and developer pages) |
| Restricted scopes need annual re-verification | Confirmed (Google help) |
| Testing mode: 100 test users, refresh tokens expire after 7 days; Workspace admin "Trusted" overrides | Confirmed (Google developer page) |
| Unverified published apps with sensitive/restricted scopes: capped at 100 users, warning screen | Confirmed |
| Verification needs privacy policy URL, Search Console ownership, request submitted from consent screen | Confirmed |
| Which Gmail scopes are restricted (readonly, modify, compose, insert, metadata) vs sensitive (send) | **Third-party consensus** (Nylas, EmailEngine, Nango). Google's own list was not retrieved. |
| Review durations | Not stated by Google in pages read. Third-party anecdotes only. |
| Cost of the assessment | Not found. Deliberately not quoted. |

**Corrected:** one third-party guide called gmail.readonly "sensitive". Three others call it restricted, so the guide uses restricted and tells you to confirm in Cloud Console. Another said Gmail "always" triggers verification, but Google's page says non-sensitive-only apps are exempt.

## LinkedIn

| Claim | Status |
|---|---|
| Development tier then Standard tier, applied for separately | Confirmed (Microsoft Learn) |
| Screen recording required for Standard tier | Confirmed |
| Rejected app cannot re-apply for the same tier; create a new app | Confirmed (versioned page, 2023-11) |
| Development tier request needs a new app with no other API product | Confirmed |
| Sign-in and basic sharing open without approval | Third-party (Elfsight) |
| Review time of 4 weeks to 4 months | Third-party (single source) |
| Price | Not found on LinkedIn's pages. One third party gives an estimate, which is not repeated. |

**Corrected:** blogs call the gated tier "Marketing Developer Platform". Microsoft's current pages say Advertising API and Community Management API, so the guide uses those. An older scope name (r_liteprofile) seen in some guides was not repeated, but the current scope list was not confirmed on a LinkedIn page.

## What was tested in the product itself

- 27 automated tests (`npm test`, no network, no keys). Of these, 9 are the original ones: every curated guide matches the schema, every evidence reference points to a real source, every "official" claim cites a primary source, the evidence audit catches invented URLs, JSON extraction, the storage layer (including path-traversal rejection), and stream parsing with messages split mid-chunk.
- **Pipeline tests with a MockProvider** (`tests/agent.test.ts`): valid JSON becomes a guide with slug, meta and `attemptedSetup=false` set by us (even if the model claims otherwise); invalid JSON is repaired once with the validation errors included; two failures give a readable error; a cited-but-never-retrieved source is flagged and the claims resting on it downgraded; empty research notes; no provider.
- **Provider tests** (`tests/providers.test.ts`): `getProvider()` (needs both keys; blank or missing gives null), error mapping that never repeats raw provider text (including Tavily's 432/433 limit codes), Tavily search with a faked `fetch` (Bearer header, result mapping, HTTP status carried on errors), and the Ollama adapter with a faked `fetch` (query planning, fallback queries, de-duplicated exact sources, the system prompt passed through, a 401 from the search call surfacing as a key error, `OLLAMA_MODEL` override).
- `npx tsc --noEmit` and `npm run build` pass.
- **Observed live, reported by the user (not an automated test, and not re-run by the assistant):**
  - Notion and Shopify guides were generated end to end with Ollama Cloud (model) plus Tavily (search), and all the source links in them opened.
  - Along the way: Ollama's own web search and its cloud chat both answered HTTP 402 "Add usage credits" until the account had credit; search was moved to Tavily for that reason. An earlier note here that the chat call "worked" was wrong: the planning call was failing and the code silently used fallback queries. That is fixed (HTTP errors while planning now surface) and covered by a test.
- **Not checked:** that every claim in the live guides matches the provider's page (only that the links open); more than two apps; behaviour on the free-tier limits of either service; the default model name `gemma4:31b` on other accounts (`OLLAMA_MODEL` overrides it).
- Run it on two or three apps before submitting and read the output critically.
