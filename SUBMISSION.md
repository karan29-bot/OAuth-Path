# OAuth Path: assignment submission

**Live app:** [LIVE LINK]
**Source code:** [REPO LINK]

## What it is

Look up an app and get a shareable guide to registering its OAuth app and getting it approved: how hard it is, how long it takes (hands-on time and waiting time shown separately), the requirements that trip people up, what to do when blocked, and which steps an agent can do versus which need a person.

- **Four hand-checked guides**, each hard in a different way: GitHub (self-serve), Slack (manual review queue), Google/Gmail (scope-driven verification), LinkedIn (application-only access).
- **Live generation** for any other app: an agent searches the web, reads sources and builds a guide in real time, with a shareable link. Progress is streamed so you watch the searches happen.

## How to try it

1. Open the live link and click any ready-made guide.
2. Type an app name (for example "Notion") and click **Generate guide**. It takes 1 to 3 minutes.
3. Look at the evidence labels and source links on each claim.

If live generation shows an error about credits or limits, the model and search services run on free or prepaid plans. The four ready-made guides always work.

## The decisions that matter

1. **Every claim carries evidence.** Each requirement, blocker and time estimate is marked `official`, `third-party` or `uncertain`, with numbered sources. Conflicts between sources are listed in the guide, not hidden.
2. **The model is never trusted blindly.** Its output must match a strict schema; if it does not, it gets one repair attempt and then a readable error. The model cannot set the guide's id or metadata, and it cannot claim that anyone created the OAuth app. None did.
3. **An evidence audit on live guides.** Any source the agent cites that its search never returned is flagged "not retrieved", and claims resting only on such sources are downgraded to `uncertain`.
4. **Two kinds of time.** Hands-on setup and waiting on the provider are separate, because they plan completely differently.
5. **Agent versus human is explicit per step** (`agent`, `either`, `human`), which answers "where do I take over?".
6. **Provider-independent design.** One shared pipeline and a small adapter interface. Today one adapter exists (Ollama Cloud writes the text; Tavily does the web search). Another model provider means writing one more adapter.

## What was and was not verified

- **Automated:** 27 tests (no network, no keys), a type check and a production build all pass. They cover the schema, the evidence rules, the audit, the pipeline with a mock provider, error handling and the storage layer.
- **Live:** guides for Notion and Shopify were generated end to end and all their source links opened. That is a small sample.
- **Not checked:** that every claim in a live guide matches its source (only that the links open); more than two apps; behaviour at the services' free-tier limits.
- **The four hand-checked guides:** how each claim was confirmed, corrected or left unconfirmed is in `VERIFICATION.md`. Nothing was "tested" by actually creating an OAuth app, because that needs real accounts, logins and business details.

## Known limitations

- Generated guides are stored on local disk. On serverless hosting this is temporary, so share links to generated guides can expire. A database would fix it.
- Rate limiting is in memory (6 guides per visitor per hour) and resets on restart.
- Live guides are only as good as what the search finds. The audit catches invented links, not misreadings.
- Four curated guides, not a hundred. At scale the same agent would draft them, a person would review them, and they would live in a database.

## If I had more time

Check more live claims against sources, add a database for guides, show a "last verified" date per claim, and let a person review and promote a live guide into the hand-checked library.

More detail: `README.md` (run it, layout), `VERIFICATION.md` (what was checked), `STUDY-GUIDE.md` (how the agent works).
