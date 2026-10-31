"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { BENEFITS, type Benefit, type HeatType } from "@/lib/rules/config";
import { incomeTierBounds, screen, type Borough, type IncomeTier, type Relationship, type AgeBand } from "@/lib/rules/engine";
import { PERSONAS } from "@/lib/rules/personas";
import { money } from "@/lib/i18n";
import {
  addMember,
  emptyForm,
  fromScreenerInput,
  householdHasBenefit,
  removeMember,
  toScreenerInput,
  type BillAnswer,
  type FormState,
} from "@/lib/screener/form";
import { Results } from "./Results";
import { TextMode } from "./TextMode";

const BOROUGHS: Borough[] = ["bronx", "brooklyn", "manhattan", "queens", "staten_island"];
const BILLS: BillAnswer[] = ["me", "other", "landlord", "unknown"];
const HEATS: HeatType[] = ["gas_heat", "electric_heat", "electric_only", "electric_gas_cooking", "unknown"];
const RELS: Relationship[] = ["spouse", "parent", "child", "grandparent", "sibling", "other_relative", "roommate"];
const AGES: AgeBand[] = ["under18", "18to59", "60plus"];
const SHOWN_BENEFITS: readonly Benefit[] = BENEFITS;

const TOTAL_STEPS = 5;
// Rough minutes each remaining step takes, for the "~N min left" hint.
const STEP_MINUTES = [0.4, 0.6, 1.0, 1.2, 0.8];

export type Mode = "form" | "text";

export function Screener() {
  const { t, lang } = useLang();
  const [mode, setMode] = useState<Mode>("form");
  const [inputMode, setInputMode] = useState<"form" | "text">("form");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedSecs, setFinishedSecs] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [parsedBanner, setParsedBanner] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const showResults = step >= TOTAL_STEPS;
  const input = useMemo(() => toScreenerInput(form), [form]);
  const result = useMemo(() => (showResults ? screen(input) : null), [showResults, input]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // /check?demo=rosa|harlem|senior opens a demo persona directly (used by the landing page and demo video).
  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo && demo in PERSONAS) loadPersona(demo as keyof typeof PERSONAS);
  }, []);

  const touch = () => setStartedAt((s) => s ?? Date.now());
  const update = (patch: Partial<FormState>) => {
    touch();
    setError(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  const minutesLeft = Math.max(1, Math.ceil(STEP_MINUTES.slice(step).reduce((a, b) => a + b, 0)));

  function validate(): string | null {
    if (step === 0 && !form.borough) return t("check.required");
    if (step === 1 && (!form.bill || (form.bill !== "landlord" && !form.heatType))) return t("check.required");
    if (step === 2 && form.bill === "other" && !form.billHolderId) return t("member.pickHolder");
    return null;
  }

  function next() {
    const err = validate();
    if (err) return setError(err);
    // Utilities included in rent: no account to discount, go straight to the result.
    const target = step === 1 && form.bill === "landlord" ? TOTAL_STEPS : step + 1;
    if (target >= TOTAL_STEPS && finishedSecs === null) {
      setFinishedSecs(Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000)));
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => (s === TOTAL_STEPS && form.bill === "landlord" ? 1 : Math.max(0, s - 1)));
  }

  function restart() {
    setForm(emptyForm());
    setStep(0);
    setStartedAt(null);
    setFinishedSecs(null);
    setIsDemo(false);
    setParsedBanner(null);
    setInputMode("form");
    setMode("form");
  }

  function loadPersona(key: keyof typeof PERSONAS) {
    setForm(fromScreenerInput(PERSONAS[key].input));
    setIsDemo(true);
    setInputMode("form");
    setMode("form");
    setFinishedSecs(null);
    setStartedAt(null);
    setStep(TOTAL_STEPS);
  }

  function onParsed(parsed: FormState, banner: string) {
    touch();
    setForm(parsed);
    setInputMode("text");
    setParsedBanner(banner);
    setMode("form");
    setStep(0);
  }

  const bounds = incomeTierBounds(Math.max(form.householdSize, form.members.length));
  const holderIsSelf = form.bill === "me";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{t("check.title")}</h1>
          <p className="mt-1 text-muted">{t("check.subtitle")}</p>
        </div>
      </div>

      <div className="no-print mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-muted">{t("check.demo")}</span>
        <button className="badge bg-amber-100 text-teal-900 hover:bg-amber-400/40" onClick={() => loadPersona("rosa")} data-testid="demo-rosa">
          Demo: Rosa
        </button>
        <button className="badge bg-teal-50 text-teal-900 hover:bg-teal-100" onClick={() => loadPersona("harlem")} data-testid="demo-harlem">
          {PERSONAS.harlem.label}
        </button>
        <button className="badge bg-teal-50 text-teal-900 hover:bg-teal-100" onClick={() => loadPersona("senior")} data-testid="demo-senior">
          {PERSONAS.senior.label}
        </button>
      </div>

      {!showResults && (
        <div className="no-print mb-5 inline-flex rounded-xl border border-line bg-paper p-1" role="tablist">
          {(["form", "text"] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === m ? "bg-teal-800 text-white" : "text-teal-800"}`}
            >
              {m === "form" ? t("check.modeForm") : t("check.modeText")}
            </button>
          ))}
        </div>
      )}

      {mode === "text" && !showResults ? (
        <TextMode onParsed={onParsed} />
      ) : showResults && result ? (
        <Results
          input={input}
          result={result}
          members={form.members}
          lang={lang}
          inputMode={inputMode}
          completionSecs={finishedSecs}
          isDemo={isDemo}
          onBack={back}
          onRestart={restart}
          onIncomeAnswer={(tier) => update({ incomeMode: "tier", incomeTier: tier })}
        />
      ) : (
        <div className="card">
          {/* Progress */}
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-sm font-medium text-muted">
              <span>{t("check.step", { n: step + 1, total: TOTAL_STEPS })}</span>
              <span aria-live="polite">{step === TOTAL_STEPS - 1 ? t("check.almostDone") : t("check.timeLeft", { min: minutesLeft })}</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-teal-50"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step}
            >
              <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${((step + 0.5) / TOTAL_STEPS) * 100}%` }} />
            </div>
          </div>

          {parsedBanner && (
            <div className="mb-5 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900" role="status">
              <p className="font-semibold">{t("text.confirm")}</p>
              <p className="mt-1 text-muted">{parsedBanner}</p>
            </div>
          )}

          {step === 0 && (
            <fieldset>
              <legend>
                <h2 ref={headingRef} tabIndex={-1} className="h2 mb-4 outline-none">
                  {t("step.where.title")}
                </h2>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {BOROUGHS.map((b) => (
                  <label key={b} className="choice">
                    <input type="radio" name="borough" className="h-5 w-5 accent-teal-800" checked={form.borough === b} onChange={() => update({ borough: b })} />
                    {t(`borough.${b}`)}
                  </label>
                ))}
              </div>
              <label className="mt-5 block">
                <span className="mb-1 block font-medium">{t("step.where.zip")}</span>
                <input
                  className="field max-w-48"
                  inputMode="numeric"
                  maxLength={5}
                  value={form.zip}
                  onChange={(e) => update({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                />
                <span className="mt-1 block text-sm text-muted">{t("step.where.zipHelp")}</span>
              </label>
            </fieldset>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <fieldset>
                <legend>
                  <h2 ref={headingRef} tabIndex={-1} className="h2 outline-none">
                    {t("step.bill.title")}
                  </h2>
                </legend>
                <p className="mt-1 mb-4 text-muted">{t("step.bill.help")}</p>
                <div className="grid gap-2">
                  {BILLS.map((b) => (
                    <label key={b} className="choice">
                      <input type="radio" name="bill" className="h-5 w-5 accent-teal-800" checked={form.bill === b} onChange={() => update({ bill: b })} />
                      {t(`bill.${b}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.bill !== "landlord" && (
                <fieldset>
                  <legend className="mb-3 text-lg font-semibold text-teal-900">{t("step.heat.title")}</legend>
                  <div className="grid gap-2">
                    {HEATS.map((h) => (
                      <label key={h} className="choice">
                        <input type="radio" name="heat" className="h-5 w-5 accent-teal-800" checked={form.heatType === h} onChange={() => update({ heatType: h })} />
                        {t(`heat.${h}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="h2 outline-none">
                {t("step.members.title")}
              </h2>
              <p className="mt-1 mb-4 text-muted">{t("step.members.help")}</p>
              <ul className="space-y-3">
                {form.members.map((m, i) => (
                  <li key={m.id} className="rounded-xl border border-line p-4" data-testid={`member-${i}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-semibold">{i === 0 ? t("member.you") : t("member.person", { n: i + 1 })}</span>
                      {i > 0 && (
                        <button className="text-sm font-semibold text-brick-600 hover:underline" onClick={() => setForm((f) => removeMember(f, m.id))}>
                          {t("member.remove")}
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {i > 0 && (
                        <label>
                          <span className="mb-1 block text-sm font-medium">{t("member.relationship")}</span>
                          <select
                            className="field"
                            value={m.relationship}
                            onChange={(e) =>
                              update({ members: form.members.map((x) => (x.id === m.id ? { ...x, relationship: e.target.value as Relationship } : x)) })
                            }
                          >
                            {RELS.map((r) => (
                              <option key={r} value={r}>
                                {t(`rel.${r}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label>
                        <span className="mb-1 block text-sm font-medium">{t("member.age")}</span>
                        <select
                          className="field"
                          value={m.ageBand}
                          onChange={(e) => update({ members: form.members.map((x) => (x.id === m.id ? { ...x, ageBand: e.target.value as AgeBand } : x)) })}
                        >
                          {AGES.map((a) => (
                            <option key={a} value={a}>
                              {t(`age.${a}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {form.bill === "other" && i > 0 && (
                      <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="billholder"
                          className="h-5 w-5 accent-teal-800"
                          checked={form.billHolderId === m.id}
                          onChange={() => update({ billHolderId: m.id })}
                        />
                        {t("member.billHolder")}
                      </label>
                    )}
                    {holderIsSelf && i === 0 && <p className="mt-3 text-sm text-muted">✓ {t("member.billHolder")}</p>}
                  </li>
                ))}
              </ul>
              <button className="btn-ghost mt-3" onClick={() => setForm((f) => addMember(f))} data-testid="add-member">
                + {t("member.add")}
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="h2 outline-none">
                {t("step.benefits.title")}
              </h2>
              <p className="mt-1 mb-4 text-muted">{t("step.benefits.help")}</p>
              <div className="space-y-4">
                {form.members.map((m, i) => {
                  const toggle = (b: Benefit) =>
                    update({
                      members: form.members.map((x) =>
                        x.id === m.id ? { ...x, benefits: x.benefits.includes(b) ? x.benefits.filter((y) => y !== b) : [...x.benefits, b] } : x,
                      ),
                    });
                  return (
                    <fieldset key={m.id} className="rounded-xl border border-line p-4" data-testid={`benefits-${i}`}>
                      <legend className="px-1 font-semibold">
                        {i === 0 ? t("member.you") : `${t(`rel.${m.relationship}`)} · ${t(`age.${m.ageBand}`)}`}
                        {(m.id === form.billHolderId || (holderIsSelf && i === 0)) && (
                          <span className="ml-2 badge bg-teal-50 text-xs text-teal-800">{t("member.billHolder")}</span>
                        )}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SHOWN_BENEFITS.map((b) => (
                          <label key={b} className="choice py-2.5 text-sm">
                            <input type="checkbox" className="h-5 w-5 accent-teal-800" checked={m.benefits.includes(b)} onChange={() => toggle(b)} />
                            {t(`benefit.${b}`)}
                          </label>
                        ))}
                        <label className="choice py-2.5 text-sm">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-teal-800"
                            checked={m.benefits.length === 0}
                            onChange={() => update({ members: form.members.map((x) => (x.id === m.id ? { ...x, benefits: [] } : x)) })}
                          />
                          {t("benefit.none")}
                        </label>
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="h2 outline-none">
                {t("step.income.title")}
              </h2>
              {householdHasBenefit(form) && <p className="mt-2 rounded-lg bg-leaf-100 px-3 py-2 text-sm text-leaf-700">{t("step.income.optional")}</p>}
              <label className="mt-4 block">
                <span className="mb-1 block font-medium">{t("step.income.size")}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost h-12 w-12 p-0 text-xl"
                    aria-label="−"
                    onClick={() => update({ householdSize: Math.max(form.members.length, form.householdSize - 1) })}
                  >
                    −
                  </button>
                  <input
                    className="field w-20 text-center text-lg font-semibold"
                    inputMode="numeric"
                    aria-label={t("step.income.size")}
                    value={form.householdSize}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (Number.isFinite(n)) update({ householdSize: Math.min(20, Math.max(form.members.length, n)) });
                    }}
                  />
                  <button className="btn-ghost h-12 w-12 p-0 text-xl" aria-label="+" onClick={() => update({ householdSize: Math.min(20, form.householdSize + 1) })}>
                    +
                  </button>
                </div>
              </label>
              <p className="mt-5 mb-3 text-muted">{t("step.income.help")}</p>
              <div className="mb-3 inline-flex rounded-xl border border-line bg-paper p-1">
                {(["tier", "exact"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => update({ incomeMode: m })}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${form.incomeMode === m ? "bg-teal-800 text-white" : "text-teal-800"}`}
                  >
                    {m === "tier" ? t("income.modeTier") : t("income.modeExact")}
                  </button>
                ))}
              </div>
              {form.incomeMode === "tier" ? (
                <div className="grid gap-2">
                  {(["under60", "60to80", "80to100", "over100", "unknown"] as const).map((tier) => (
                    <label key={tier} className="choice">
                      <input
                        type="radio"
                        name="income"
                        className="h-5 w-5 accent-teal-800"
                        checked={form.incomeTier === tier}
                        onChange={() => update({ incomeTier: tier as IncomeTier | "unknown" })}
                      />
                      {t(`income.${tier}`, {
                        t5: money(bounds.tier5Max, lang),
                        t5plus: money(bounds.tier5Max + 1, lang),
                        t6: money(bounds.tier6Max, lang),
                        t6plus: money(bounds.tier6Max + 1, lang),
                        t7: money(bounds.tier7Max, lang),
                      })}
                    </label>
                  ))}
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1 block font-medium">{t("income.exactLabel")}</span>
                  <input
                    className="field max-w-64"
                    inputMode="numeric"
                    value={form.incomeExact}
                    placeholder="45,000"
                    onChange={(e) => update({ incomeExact: e.target.value.replace(/[^\d,]/g, "") })}
                  />
                </label>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-brick-100 px-3 py-2 text-sm font-medium text-brick-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button className="btn-ghost" onClick={back} disabled={step === 0}>
              ← {t("check.back")}
            </button>
            <button className="btn-primary" onClick={next} data-testid="next">
              {step === TOTAL_STEPS - 1 ? t("check.seeResults") : t("check.next")} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
