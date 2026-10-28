// lib/store.ts
// ---------------------------------------------------------------------------
// Where generated guides are saved so their share link keeps working.
// Deliberately simple: one JSON file per guide on disk.
//
// LIMITATION (also in the README): on serverless hosts such as Vercel the disk
// is temporary, so share links for live-generated guides can expire. For a real
// product you would swap these two functions for a database (Postgres, KV...).
// The rest of the app would not change, because only these two functions know
// where guides live.
// ---------------------------------------------------------------------------
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GuideSchema, type Guide } from "./types";

const DIR = process.env.GUIDE_STORE_DIR || path.join(os.tmpdir(), "oauth-path-guides");

// Only allow ids we generated ourselves. This also blocks "../../etc/passwd" tricks.
const SAFE_ID = /^g-[a-z0-9-]{3,60}$/;

export function isGeneratedSlug(slug: string): boolean {
  return SAFE_ID.test(slug);
}

export async function saveGuide(guide: Guide): Promise<void> {
  if (!isGeneratedSlug(guide.slug)) throw new Error("Bad guide id");
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${guide.slug}.json`), JSON.stringify(guide), "utf8");
}

export async function loadGuide(slug: string): Promise<Guide | null> {
  if (!isGeneratedSlug(slug)) return null;
  try {
    const raw = await fs.readFile(path.join(DIR, `${slug}.json`), "utf8");
    // Validate again on the way out: never trust a file just because we wrote it.
    const parsed = GuideSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
