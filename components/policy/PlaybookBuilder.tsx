"use client";

import { useState } from "react";

type Answer = "yes" | "partial" | "no";

const QUESTIONS: { id: string; q: string; why: string; fix: string }[] = [
  {
    id: "registry",
    q: "Is there a benefits registry that knows who qualifies (and who lives with whom)?",
    why: "Automatic enrollment needs a list the state already holds. Household composition is what makes a Household Link possible.",
    fix: "Start with the programs that already share data (e.g. heating aid). Add a 'household members' field to benefit records, or use a social registry like Brazil's CadÚnico.",
  },
  {
    id: "key",
    q: "Is there a shared key between that registry and utility accounts?",
    why: "Names fail when the bill holder isn't the recipient. A normalized service address (or meter ID / national ID) matches homes, not people.",
    fix: "Use a normalized, hashed service address as the match key (USPS/CASS or a national address file). Avoid account-holder name matching.",
  },
  {
    id: "mandate",
    q: "Is there a legal mandate or regulator order to enroll eligible households?",
    why: "Utilities move when the regulator requires identification and enrollment of all eligible customers.",
    fix: "Ask the regulator to order auto-enrollment from data matches (NY: PSC Case 14-M-0565). Long-term: a statute like Brazil's Law 14,203/2021.",
  },
  {
    id: "gateway",
    q: "Is there a legal data-sharing gateway between benefit agencies and utilities?",
    why: "Benefit records are confidential. Each program needs a lawful basis to disclose — a statute, an agreement, or consent.",
    fix: "Sign data-sharing agreements through a neutral matching hub; where program law requires it, collect consent (OneDoor's consent-to-match) or add an opt-in to benefit applications.",
  },
  {
    id: "consent",
    q: "Is there a consent mechanism where the law requires one?",
    why: "Programs like Medicaid and SNAP restrict disclosure. Consent closes the gap without new legislation.",
    fix: "Add a one-line consent-to-match on benefit applications and in outreach tools; store a reference code so households can withdraw.",
  },
  {
    id: "renewal",
    q: "Can renewal happen by data instead of paperwork?",
    why: "Re-application deadlines are a major drop-off point (the income pathway in NY ends after 18 months).",
    fix: "Re-run the match on a schedule; only contact households who no longer match.",
  },
  {
    id: "funding",
    q: "Is the cost visible and funded (rates or budget)?",
    why: "Regulators weigh the cost to other ratepayers; a transparent ledger keeps the program durable.",
    fix: "Publish a ratepayer ledger: discount cost vs. avoided arrears, write-offs and shutoffs (see /impact).",
  },
];

const PRESETS: Record<string, { label: string; answers: Record<string, Answer>; notes: string }> = {
  nyc: {
    label: "New York City (today)",
    answers: { registry: "partial", key: "no", mandate: "yes", gateway: "partial", consent: "no", renewal: "partial", funding: "yes" },
    notes: "HEAP/TANF/Safety Net already flow to Con Edison; Medicaid, SNAP, SSI, NYCHA and VA do not. Matching is by account holder, so the Rosa case is missed.",
  },
  uk: {
    label: "Great Britain — Warm Home Discount",
    answers: { registry: "yes", key: "yes", mandate: "yes", gateway: "yes", consent: "partial", renewal: "yes", funding: "yes" },
    notes: "Government matches DWP benefit and property data to supplier accounts; ≈96% of 2025/26 recipients were paid automatically [8]. Gateways: Digital Economy Act 2017 ss.35–37 and the 2011 WHD disclosure regulations (Pensions Act 2008 s.142).",
  },
  brazil: {
    label: "Brazil — Tarifa Social",
    answers: { registry: "yes", key: "yes", mandate: "yes", gateway: "yes", consent: "partial", renewal: "yes", funding: "yes" },
    notes: "Law 14,203/2021 requires distributors to enroll CadÚnico families (≤ ½ minimum wage per person) and BPC recipients automatically; ANEEL rules (Nov 2021) make distributors cross-check customer data with the registry [9][10].",
  },
  custom: {
    label: "Your jurisdiction",
    answers: {},
    notes: "Answer each question to generate your playbook.",
  },
};

const SCORE: Record<Answer, number> = { yes: 1, partial: 0.5, no: 0 };

export function PlaybookBuilder() {
  const [preset, setPreset] = useState("nyc");
  const [answers, setAnswers] = useState<Record<string, Answer>>(PRESETS.nyc.answers);
  const answered = QUESTIONS.filter((q) => answers[q.id]);
  const score = answered.length ? Math.round((QUESTIONS.reduce((a, q) => a + (answers[q.id] ? SCORE[answers[q.id]] : 0), 0) / QUESTIONS.length) * 100) : 0;
  const gaps = QUESTIONS.filter((q) => answers[q.id] && answers[q.id] !== "yes");

  function choose(p: string) {
    setPreset(p);
    setAnswers({ ...PRESETS[p].answers });
  }

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jurisdiction">
        {Object.entries(PRESETS).map(([k, p]) => (
          <button
            key={k}
            role="radio"
            aria-checked={preset === k}
            onClick={() => choose(k)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${preset === k ? "border-teal-800 bg-teal-800 text-white" : "border-line text-teal-800 hover:bg-teal-50"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{PRESETS[preset].notes}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-line p-4">
              <p className="font-semibold">
                {i + 1}. {q.q}
              </p>
              <p className="mt-1 text-sm text-muted">{q.why}</p>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label={q.q}>
                {(["yes", "partial", "no"] as Answer[]).map((a) => (
                  <button
                    key={a}
                    role="radio"
                    aria-checked={answers[q.id] === a}
                    onClick={() => setAnswers((s) => ({ ...s, [q.id]: a }))}
                    className={`rounded-lg border px-3 py-1 text-sm font-semibold capitalize ${
                      answers[q.id] === a
                        ? a === "yes"
                          ? "border-leaf-700 bg-leaf-700 text-white"
                          : a === "partial"
                            ? "border-amber-500 bg-amber-500 text-teal-900"
                            : "border-brick-600 bg-brick-600 text-white"
                        : "border-line text-ink hover:bg-teal-50"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="h-fit rounded-2xl bg-teal-900 p-5 text-white lg:sticky lg:top-20" aria-live="polite">
          <p className="text-sm text-teal-100">Auto-enrollment readiness</p>
          <p className="font-display text-5xl font-semibold" data-testid="readiness">{score}%</p>
          <div className="mt-2 h-2 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${score}%` }} />
          </div>
          <p className="mt-2 text-sm text-teal-100">{answered.length} of {QUESTIONS.length} answered</p>
          <h3 className="mt-5 font-semibold">Your playbook</h3>
          {gaps.length === 0 ? (
            <p className="mt-1 text-sm text-teal-100">{answered.length ? "All building blocks in place — run the match and publish the ledger." : "Answer the questions to see your next steps."}</p>
          ) : (
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
              {gaps.map((g) => (
                <li key={g.id}>{g.fix}</li>
              ))}
            </ol>
          )}
          <button
            className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-2 font-semibold text-teal-900 hover:bg-amber-400"
            onClick={() => {
              const text = [`OneDoor replication playbook — ${PRESETS[preset].label}`, `Readiness: ${score}%`, "", ...QUESTIONS.map((q, i) => `${i + 1}. ${q.q} — ${answers[q.id] ?? "not answered"}${answers[q.id] && answers[q.id] !== "yes" ? `\n   Next step: ${q.fix}` : ""}`)].join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
              a.download = "onedoor-playbook.txt";
              a.click();
            }}
          >
            ⬇ Download playbook
          </button>
        </div>
      </div>
    </div>
  );
}
