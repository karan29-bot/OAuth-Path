// app/api/generate/route.ts
// ---------------------------------------------------------------------------
// POST /api/generate   body: { "query": "Notion" }
//
// Runs the agent and STREAMS progress back to the browser using
// "Server-Sent Events" (SSE): a response that stays open and sends small
// text messages as they happen. That is how the user watches the agent work
// ("Searching: ...") instead of staring at a spinner for a minute.
//
// Each message looks like:   data: {"type":"progress","message":"..."}\n\n
// The last one is either    {"type":"done","slug":"g-..."}  or  {"type":"error",...}
// ---------------------------------------------------------------------------
import type { NextRequest } from "next/server";
import { generateGuide } from "@/lib/agent";
import { getProvider, KEY_VARS } from "@/lib/providers";
import { friendlyMessage } from "@/lib/providers/errors";
import { saveGuide } from "@/lib/store";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300; // seconds; research takes a while

export async function POST(request: NextRequest) {
  // 1. Validate the input first (never trust the browser)
  let query = "";
  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
  } catch {
    /* fall through to the length check */
  }
  if (query.length < 2 || query.length > 120) {
    return Response.json({ error: "Enter an app name or website (2 to 120 characters)." }, { status: 400 });
  }

  // 2. Is the server configured? (we only learn the NAMES of variables, never their values)
  const provider = getProvider();
  if (!provider) {
    return Response.json(
      {
        error:
          `Live generation is turned off: no AI provider is configured. Set ${KEY_VARS.join(" and ")} in .env.local ` +
          `and restart the server.`,
      },
      { status: 503 },
    );
  }

  // 3. Rate limit per visitor (best-effort: uses the forwarded IP header)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) {
    return Response.json(
      { error: "Too many guides generated from your connection. Try again in an hour." },
      { status: 429 },
    );
  }

  // 4. Stream the agent's progress
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const guide = await generateGuide(query, (message) => send({ type: "progress", message }), provider);
        await saveGuide(guide);
        send({ type: "done", slug: guide.slug });
      } catch (err) {
        // Server log only (never sent to the browser). We log the type, HTTP status and a
        // SHORT message with key-like strings blanked out, because provider errors can
        // contain part of an API key. Never log the whole error object.
        const status = (err as { status?: unknown } | null)?.status;
        const detail = (err instanceof Error ? err.message : "")
          .replace(/AIza[\w-]{10,}|sk-[\w-]{10,}|[A-Za-z0-9_-]{32,}/g, "[redacted]")
          .slice(0, 300);
        console.error("generate failed:", err instanceof Error ? err.name : "unknown error", status ?? "", detail);
        send({ type: "error", message: friendlyMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
