"use client";
// components/CopyLink.tsx : a "Copy share link" button (needs the browser clipboard, so it is a client component)
import { useState } from "react";

export default function CopyLink() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href); // fallback if clipboard is blocked
    }
  }

  return (
    <button className="btn secondary" onClick={copy} type="button">
      {copied ? "Link copied" : "Copy share link"}
    </button>
  );
}
