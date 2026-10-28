// lib/types.ts
// ---------------------------------------------------------------------------
// The "shape" of a guide. Every guide in the library AND every guide the live
// agent generates must match this shape. We describe it once with zod so we can
//   1. get TypeScript types for free (z.infer), and
//   2. VALIDATE what the AI agent returns (never trust model output blindly).
// ---------------------------------------------------------------------------
import { z } from "zod";

// How much we trust a single claim. This is the heart of the "evidence" idea.
//   official    = stated on the provider's own documentation
//   third-party = only found on blogs / partner docs / forums (useful, not authoritative)
//   uncertain   = sources conflict, or we are inferring it, or we could not confirm it
export const Confidence = z.enum(["official", "third-party", "uncertain"]);
export type Confidence = z.infer<typeof Confidence>;

// A piece of evidence attached to a claim: how confident we are + which
// numbered sources (see `sources` below) back it up.
export const Evidence = z.object({
  confidence: Confidence,
  sources: z.array(z.number().int()).default([]), // indexes into guide.sources
});
export type Evidence = z.infer<typeof Evidence>;

// Who does a step? This answers the assignment question:
// "what can an agent do for me, and where do I take over?"
//   agent  = an AI agent can do this with no human (e.g. read docs, draft text)
//   human  = needs a real person (login, 2FA, legal sign-off, payment, CAPTCHA...)
//   either = an agent can prepare it, a human must click the final button
export const Owner = z.enum(["agent", "human", "either"]);
export type Owner = z.infer<typeof Owner>;

export const Difficulty = z.enum([
  "easy", // self-serve, minutes
  "moderate", // self-serve but with extra prep, or a short review
  "hard", // formal review with real waiting time
  "gated", // partner / application-only: approval is not guaranteed
]);
export type Difficulty = z.infer<typeof Difficulty>;

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  kind: z.enum(["primary", "secondary"]), // primary = the provider's own site
});

export const GuideSchema = z.object({
  slug: z.string(),
  app: z.string(), // e.g. "Slack"
  website: z.string().optional(),
  summary: z.string(), // 1-2 sentences: what this OAuth setup is like

  difficulty: Difficulty,
  difficultyWhy: z.string(), // one sentence explaining the rating

  // Time is split in two because they are very different things:
  //   setup    = hands-on work YOU do
  //   approval = time you just WAIT for the provider
  time: z.object({
    setup: z.string(), // e.g. "10-20 minutes"
    approvalWait: z.string(), // e.g. "None" or "10 business days + up to 10 weeks"
    evidence: Evidence,
  }),
  approvalRequired: z.boolean(),

  startHere: z.string(), // the single best first action

  // Facts that can block or shape your setup (privacy policy, domain, scopes...)
  requirements: z.array(
    z.object({ title: z.string(), detail: z.string(), evidence: Evidence }),
  ),

  steps: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      owner: Owner,
      link: z.string().optional(),
    }),
  ),

  // "If this goes wrong, here's why and what to do"
  blockers: z.array(
    z.object({
      problem: z.string(),
      why: z.string(),
      whatToDo: z.string(),
      evidence: Evidence,
    }),
  ),

  // Honest limits of THIS guide
  uncertainties: z.array(z.string()), // things we could not confirm
  corrections: z.array(z.string()), // places where sources disagreed / we fixed a claim
  testing: z.object({
    attemptedSetup: z.boolean(), // did anyone actually create the OAuth app?
    notes: z.string(), // plain-English description of what was / wasn't tested
  }),

  sources: z.array(SourceSchema),

  meta: z.object({
    origin: z.enum(["curated", "live-agent"]),
    generatedAt: z.string(), // ISO date
    model: z.string().optional(),
    // URLs the agent cited that it never actually retrieved (possible hallucinations).
    unverifiedSourceUrls: z.array(z.string()).optional(),
  }),
});

export type Guide = z.infer<typeof GuideSchema>;
