import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <h1>Guide not found</h1>
      <p>
        Live-generated guides are saved on the server&apos;s temporary disk, so an old share link may have expired.
        Generate it again, or pick one of the ready-made guides.
      </p>
      <Link className="btn" href="/" style={{ textDecoration: "none", display: "inline-block" }}>
        Back to all guides
      </Link>
    </section>
  );
}
