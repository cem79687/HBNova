"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "Copier le texte",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand"
    >
      {copied ? "Copié" : label}
    </button>
  );
}
