"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { parsedToForm, type ParsedHousehold } from "@/lib/screener/parse";
import type { FormState } from "@/lib/screener/form";

export function TextMode({ onParsed }: { onParsed: (f: FormState, banner: string) => void }) {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error();
      const { parsed, source } = (await res.json()) as { parsed: ParsedHousehold; source: "llm" | "rules" };
      const form = parsedToForm(parsed);
      const found = [
        parsed.borough && t(`borough.${parsed.borough}`),
        parsed.bill && t(`bill.${parsed.bill}`),
        parsed.people.length > 1 && `${parsed.people.length} ${t("step.members.title").replace("?", "").toLowerCase()}`,
        ...parsed.people.flatMap((p) => p.benefits.map((b) => `${p.relationship === "self" ? t("member.you") : t(`rel.${p.relationship}`)}: ${t(`benefitShort.${b}`)}`)),
        parsed.annualIncome !== undefined && `$${parsed.annualIncome.toLocaleString()}`,
      ].filter(Boolean);
      onParsed(form, `${found.join(" · ")}${source === "rules" ? ` — ${t("text.noKey")}` : ""}`);
    } catch {
      setError(t("text.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="h2">{t("text.title")}</h2>
      <label className="mt-4 block">
        <span className="sr-only">{t("text.title")}</span>
        <textarea
          className="field min-h-40 leading-relaxed"
          placeholder={t("text.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="free-text"
        />
      </label>
      <p className="mt-2 flex items-start gap-2 text-sm text-muted">
        <span aria-hidden="true">🔒</span>
        {t("text.aiNote")}
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-brick-100 px-3 py-2 text-sm text-brick-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={submit} disabled={busy || text.trim().length < 5}>
          {busy ? t("text.parsing") : t("text.parse")}
        </button>
        <button className="btn-ghost" onClick={() => setText(t("text.placeholder").replace(/^[^:：]*[:：]\s*/, ""))}>
          ✎ Example
        </button>
      </div>
    </div>
  );
}
