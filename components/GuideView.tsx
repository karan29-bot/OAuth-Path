// components/GuideView.tsx
// ---------------------------------------------------------------------------
// Renders one Guide. This is a SERVER component (no "use client"): it just turns
// data into HTML, so it needs no state and sends no JavaScript to the browser.
// ---------------------------------------------------------------------------
import Link from "next/link";
import type { Confidence, Difficulty, Evidence, Guide, Owner } from "@/lib/types";
import CopyLink from "./CopyLink";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  gated: "Gated",
};
const DIFFICULTY_LEVEL: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3, gated: 4 };

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  official: "Official source",
  "third-party": "Third-party only",
  uncertain: "Uncertain",
};

const OWNER_LABEL: Record<Owner, string> = {
  agent: "Agent can do",
  human: "You must do",
  either: "Agent prepares, you finish",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`badge ${difficulty}`}>
      <span className="meter" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= DIFFICULTY_LEVEL[difficulty] ? "on" : ""} />
        ))}
      </span>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

// "[1][2]" links that jump to the numbered source list at the bottom
function Cites({ ids }: { ids: number[] }) {
  if (!ids.length) return null;
  return (
    <span className="cite">
      {ids.map((n) => (
        <a key={n} href={`#src-${n}`} aria-label={`Source ${n + 1}`}>
          [{n + 1}]
        </a>
      ))}
    </span>
  );
}

function EvidenceBadge({ evidence }: { evidence: Evidence }) {
  return (
    <span className="meta">
      <span className={`badge ${evidence.confidence}`}>{CONFIDENCE_LABEL[evidence.confidence]}</span>
      <Cites ids={evidence.sources} />
    </span>
  );
}

export default function GuideView({ guide }: { guide: Guide }) {
  const agentSteps = guide.steps.filter((s) => s.owner === "agent" || s.owner === "either");
  const humanSteps = guide.steps.filter((s) => s.owner === "human" || s.owner === "either");

  return (
    <article>
      <div className="guide-head">
        <div className="crumbs">
          <Link href="/">← All guides</Link>
        </div>
        <h1>
          {guide.app} <span style={{ color: "var(--muted)", fontWeight: 400 }}>OAuth app guide</span>
        </h1>
        <p className="lede">{guide.summary}</p>
        <div className="actions">
          <CopyLink />
          {guide.website && (
            <a className="btn secondary" href={guide.website} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              Provider site
            </a>
          )}
        </div>
      </div>

      {/* ---- the answer to the 4 questions a developer asks first ---- */}
      <section className="verdict" aria-label="At a glance">
        <div>
          <span className="label">How hard</span>
          <span className="value">
            <DifficultyBadge difficulty={guide.difficulty} />
          </span>
          <p className="value" style={{ margin: "8px 0 0" }}>
            {guide.difficultyWhy}
          </p>
        </div>
        <div>
          <span className="label">Your hands-on time</span>
          <span className="value">{guide.time.setup}</span>
        </div>
        <div>
          <span className="label">Waiting on the provider</span>
          <span className="value">{guide.time.approvalWait}</span>
          <EvidenceBadge evidence={guide.time.evidence} />
        </div>
        <div>
          <span className="label">Approval required</span>
          <span className="value">{guide.approvalRequired ? "Yes, for the full path" : "No review step found"}</span>
        </div>
      </section>

      <div className="callout">
        <b>Start here</b>
        {guide.startHere}
      </div>

      {/* ---- who does what ---- */}
      <section className="section">
        <h2>What an agent can do, and where you take over</h2>
        <p className="sub">
          An agent can read docs and prepare values and drafts. Logins, legal wording, identity checks and final
          submit buttons need a person.
        </p>
        <div className="split">
          <div className="item">
            <h3>An agent can do or prepare</h3>
            <ul>
              {agentSteps.map((s, i) => (
                <li key={i}>
                  {s.title}
                  {s.owner === "either" ? " (draft only)" : ""}
                </li>
              ))}
              {agentSteps.length === 0 && <li>Nothing end-to-end. Every step needs a person.</li>}
            </ul>
          </div>
          <div className="item">
            <h3>You take over for</h3>
            <ul>
              {humanSteps.map((s, i) => (
                <li key={i}>
                  {s.title}
                  {s.owner === "either" ? " (final click)" : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- steps ---- */}
      <section className="section">
        <h2>Steps</h2>
        <ol className="steps">
          {guide.steps.map((s, i) => (
            <li key={i} className="item">
              <div className="step-top">
                <h3>{s.title}</h3>
                <span className={`badge ${s.owner}`}>{OWNER_LABEL[s.owner]}</span>
              </div>
              <p>{s.detail}</p>
              {s.link && (
                <p>
                  <a href={s.link} target="_blank" rel="noreferrer">
                    Open the page
                  </a>
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ---- requirements ---- */}
      <section className="section">
        <h2>Requirements and details that can affect you</h2>
        {guide.requirements.map((r, i) => (
          <div key={i} className="item">
            <h3>{r.title}</h3>
            <p>{r.detail}</p>
            <EvidenceBadge evidence={r.evidence} />
          </div>
        ))}
      </section>

      {/* ---- blockers ---- */}
      <section className="section">
        <h2>If you get blocked</h2>
        {guide.blockers.map((b, i) => (
          <div key={i} className="item">
            <h3>{b.problem}</h3>
            <p>
              <span className="label">Why: </span>
              {b.why}
            </p>
            <p>
              <span className="label">What to do: </span>
              {b.whatToDo}
            </p>
            <EvidenceBadge evidence={b.evidence} />
          </div>
        ))}
      </section>

      {/* ---- evidence and limits ---- */}
      <section className="section">
        <h2>What this guide is based on</h2>
        <p className="sub">
          Generated {guide.meta.generatedAt}
          {guide.meta.origin === "live-agent" ? ` by a live agent (${guide.meta.model})` : " from hand-checked research"}.
        </p>

        <div className="item">
          <h3>What was tested</h3>
          <p>
            <b>{guide.testing.attemptedSetup ? "A real setup was attempted." : "No OAuth app was created."}</b>{" "}
            {guide.testing.notes}
          </p>
        </div>

        {guide.meta.unverifiedSourceUrls && guide.meta.unverifiedSourceUrls.length > 0 && (
          <div className="warn" role="note">
            <b>Check these sources yourself.</b> The agent cited {guide.meta.unverifiedSourceUrls.length} link
            {guide.meta.unverifiedSourceUrls.length > 1 ? "s" : ""} that its search never returned. Claims that rest
            only on them are marked Uncertain.
          </div>
        )}

        <div className="item">
          <h3>What we could not confirm</h3>
          {guide.uncertainties.length ? (
            <ul className="plain">
              {guide.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          ) : (
            <p>Nothing flagged.</p>
          )}
        </div>

        <div className="item">
          <h3>Where sources disagreed or a claim was corrected</h3>
          {guide.corrections.length ? (
            <ul className="plain">
              {guide.corrections.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <p>No conflicts found between the sources read.</p>
          )}
        </div>

        <div className="item">
          <h3>Sources</h3>
          <ol className="sources">
            {guide.sources.map((s, i) => (
              <li key={i} id={`src-${i}`}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
                <span className="kind">{s.kind === "primary" ? "provider's own docs" : "third party"}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </article>
  );
}
