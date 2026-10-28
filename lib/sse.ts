// lib/sse.ts
// ---------------------------------------------------------------------------
// Parsing for the streamed messages from /api/generate.
//
// The server sends text like:
//     data: {"type":"progress","message":"Searching..."}\n\n
//     data: {"type":"done","slug":"g-abc"}\n\n
// Network chunks do NOT line up with messages: one chunk can hold half a message
// or three messages. So we keep a "buffer" of leftover text between chunks.
//
// drainEvents takes everything received so far and returns:
//   events = the complete messages found
//   rest   = the incomplete tail, to be put back at the front of the next chunk
// It is a pure function (no side effects), which makes it easy to test.
// ---------------------------------------------------------------------------

// The three kinds of messages the server can send (see app/api/generate/route.ts)
export type ServerEvent =
  | { type: "progress"; message: string }
  | { type: "done"; slug: string }
  | { type: "error"; message: string };

export function drainEvents(buffer: string): { events: ServerEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? ""; // the last piece has no blank line after it yet: it may be incomplete
  const events: ServerEvent[] = [];

  for (const part of parts) {
    const line = part.split("\n").find((l) => l.startsWith("data: "));
    if (!line) continue; // e.g. a comment/keep-alive line
    try {
      events.push(JSON.parse(line.slice(6)) as ServerEvent);
    } catch {
      /* ignore a malformed message rather than crash the whole stream */
    }
  }
  return { events, rest };
}
