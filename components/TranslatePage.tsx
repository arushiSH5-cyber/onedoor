"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";
import { LANG_NAMES } from "@/lib/i18n";

/**
 * Long policy/method pages are written in English. When a non-English language is picked,
 * this offers an AI translation of the page text (needs ANTHROPIC_API_KEY on the server).
 */
export function TranslatePage() {
  const { lang } = useLang();
  const [state, setState] = useState<"idle" | "busy" | "done" | "unavailable" | "error">("idle");
  if (lang === "en") return null;

  async function run() {
    setState("busy");
    const root = document.getElementById("main");
    if (!root) return setState("error");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.nodeValue && n.nodeValue.trim().length > 2 && !n.parentElement?.closest("code,script,style,[data-no-translate]")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    try {
      for (let i = 0; i < nodes.length; i += 120) {
        const batch = nodes.slice(i, i + 120);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lang, texts: batch.map((n) => n.nodeValue) }),
        });
        if (res.status === 501) return setState("unavailable");
        if (!res.ok) throw new Error();
        const { texts } = (await res.json()) as { texts: string[] };
        batch.forEach((n, j) => (n.nodeValue = texts[j]));
      }
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-3 text-sm" data-no-translate>
      <span>
        This page is written in English.{" "}
        {state === "unavailable" && "AI translation is not configured on this server; the screener, results and SMS are fully translated."}
        {state === "error" && "Translation failed — please try again."}
        {state === "done" && `Translated to ${LANG_NAMES[lang]} by AI — may contain errors.`}
      </span>
      {(state === "idle" || state === "error") && (
        <button className="btn-ghost py-1.5 text-sm" onClick={run}>
          Translate to {LANG_NAMES[lang]} (AI)
        </button>
      )}
      {state === "busy" && <span className="text-muted">Translating…</span>}
    </div>
  );
}
