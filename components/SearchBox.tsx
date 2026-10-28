"use client";
// components/SearchBox.tsx
// ---------------------------------------------------------------------------
// The search box on the home page. "use client" (line 1) means this file runs
// in the BROWSER, because it needs state (what you typed, progress so far) and
// click handlers. Most of the app is server-rendered; only this part is interactive.
//
// What it does on submit:
//   1. POST the query to /api/generate
//   2. Read the streamed response chunk by chunk (Server-Sent Events)
//   3. Show each "progress" message in a list
//   4. When a "done" message arrives, navigate to /guide/<slug>
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useRouter } from "next/navigation";
import { drainEvents } from "@/lib/sse";

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    if (busy || query.trim().length < 2) return;

    setBusy(true);
    setSteps([]);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      // Errors found BEFORE streaming starts (bad input, no API key, rate limit) come as plain JSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed.");
      }

      // Read the stream. A network chunk may contain half a message, so we keep a buffer
      // and only process complete messages (they end with a blank line, "\n\n").
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Pull out every complete message; keep the incomplete tail for the next chunk.
        const { events, rest } = drainEvents(buffer);
        buffer = rest;

        for (const event of events) {
          if (event.type === "progress") {
            setSteps((prev) => [...prev, event.message]);
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "done") {
            router.push(`/guide/${event.slug}`);
            return; // keep "busy" on while the page changes
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <div>
      <form className="search" onSubmit={onSubmit}>
        <label htmlFor="q" style={{ position: "absolute", left: -9999 }}>
          App name or website
        </label>
        <input
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="An app name or website, e.g. Notion or asana.com"
          maxLength={120}
          autoComplete="off"
          disabled={busy}
        />
        <button className="btn" type="submit" disabled={busy || query.trim().length < 2}>
          {busy ? "Researching…" : "Generate guide"}
        </button>
      </form>
      <p className="hint">
        An agent searches the web live and builds the guide. It usually takes 1 to 3 minutes. It reads sources, it does
        not create an OAuth app for you.
      </p>

      {steps.length > 0 && (
        <div className="progress" role="status" aria-live="polite">
          <strong>Agent progress</strong>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
