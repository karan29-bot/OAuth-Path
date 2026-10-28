// app/page.tsx : the home page ("/")
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import { DifficultyBadge } from "@/components/GuideView";
import { LIBRARY } from "@/lib/library";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Know how hard an OAuth app is to get approved, before you start.</h1>
        <p>
          To let your users connect an app, you often must register an OAuth app with that provider, and sometimes get
          it approved. It can take ten minutes or four months. Look up an app and get a guide with the real path, the
          time, the blockers, and what an agent can do for you.
        </p>
        <SearchBox />
      </section>

      <h2 className="section-title">Ready-made guides</h2>
      <div className="grid">
        {LIBRARY.map((g) => (
          <Link key={g.slug} href={`/guide/${g.slug}`} className="card">
            <h3>{g.app}</h3>
            <DifficultyBadge difficulty={g.difficulty} />
            <p>{g.difficultyWhy}</p>
          </Link>
        ))}
      </div>
      <p className="hint">
        Four apps were chosen because each is hard in a different way: self-serve, a manual review queue, scope-driven
        verification, and application-only access.
      </p>

      <h2 className="section-title">How to read a guide</h2>
      <div className="explain">
        <div>
          <strong>Two kinds of time</strong>
          Your hands-on setup time is shown separately from the time you just wait on the provider, because they plan
          very differently.
        </div>
        <div>
          <strong>Every claim shows its evidence</strong>
          Official source, third-party only, or uncertain, with numbered links. Conflicts between sources are listed
          rather than hidden.
        </div>
        <div>
          <strong>Honest about testing</strong>
          Each guide says whether anyone actually created the OAuth app. None of these did, and the guide says so.
        </div>
      </div>
    </>
  );
}
