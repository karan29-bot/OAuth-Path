// app/guide/[slug]/page.tsx : the page for ONE guide, e.g. /guide/slack or /guide/g-notion-x7k2q9
//
// The [slug] folder name is a "dynamic segment": whatever is in that part of
// the URL arrives as params.slug. In this version of Next.js, params is a
// Promise, so we `await` it.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GuideView from "@/components/GuideView";
import { getLibraryGuide } from "@/lib/library";
import { loadGuide } from "@/lib/store";
import type { Guide } from "@/lib/types";

// Look in the curated library first, then in saved live-generated guides.
async function findGuide(slug: string): Promise<Guide | null> {
  return getLibraryGuide(slug) ?? (await loadGuide(slug));
}

export async function generateMetadata({ params }: PageProps<"/guide/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await findGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.app} OAuth app guide | OAuth Path`,
    description: guide.summary,
  };
}

export default async function GuidePage({ params }: PageProps<"/guide/[slug]">) {
  const { slug } = await params;
  const guide = await findGuide(slug);
  if (!guide) notFound();
  return <GuideView guide={guide} />;
}
