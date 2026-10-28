import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Path: how hard is it to get an OAuth app approved?",
  description:
    "Look up any app and get a shareable guide to registering and getting its OAuth app approved: difficulty, time, requirements, blockers, and what an agent can do for you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ◆
            </span>
            OAuth Path
          </Link>
          <span className="tagline">Know the road to an approved OAuth app before you start</span>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer wrap">
          Guides state what they were checked against. Nothing here is legal advice, and provider rules change,
          so confirm requirements on the provider&apos;s own pages before committing to a launch date.
        </footer>
      </body>
    </html>
  );
}
