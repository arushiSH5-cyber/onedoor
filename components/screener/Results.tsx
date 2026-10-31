"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { COMBINED_SERVICE_ADDS, CONTACTS, HOUSEHOLD_MEMBER_BENEFIT_QUALIFIES, MONTHLY_DISCOUNTS } from "@/lib/rules/config";
import { addMonths, incomeTierBounds, type IncomeTier, type Member, type ScreenerInput, type ScreenerResult } from "@/lib/rules/engine";
import { fmtDate, money, type Lang } from "@/lib/i18n";
import { discountText, fullSummary, smsSummary } from "@/lib/screener/summary";

type Props = {
  input: ScreenerInput;
  result: ScreenerResult;
  members: Member[];
  lang: Lang;
  inputMode: "form" | "text";
  completionSecs: number | null;
  isDemo: boolean;
  onBack: () => void;
  onRestart: () => void;
  onIncomeAnswer: (tier: IncomeTier) => void;
};

const TONE: Record<ScreenerResult["pathway"], string> = {
  EAP: "border-leaf-700/30 bg-leaf-100",
  EEAP: "border-leaf-700/30 bg-leaf-100",
  NEEDS_INFO: "border-amber-500/40 bg-amber-100",
  NOT_ELIGIBLE: "border-line bg-teal-50",
  NOT_CUSTOMER: "border-line bg-teal-50",
};

function fmtSecs(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function icsFor(date: Date, title: string, body: string) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OneDoor//EN",
    "BEGIN:VEVENT",
    `UID:${d}-onedoor@onedoor.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${body.replace(/\n/g, "\\n")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P30D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function Results({ input, result: r, members, lang, inputMode, completionSecs, isDemo, onBack, onRestart, onIncomeAnswer }: Props) {
  const { t, tm } = useLang();
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentRef, setConsentRef] = useState<string | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "simulated" | "error">("idle");
  const [simulatedText, setSimulatedText] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [r.pathway]);

  // Save the anonymized screening (the server re-runs the rules and stores only coarse fields).
  const saveKey = JSON.stringify([r.pathway, r.tier, r.householdLink, lang]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/screenings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: idRef.current, input, language: lang, inputMode, completionSecs: completionSecs ?? 0, isDemo }),
      signal: ctrl.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          idRef.current = data.id;
          setScreeningId(data.id);
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveKey]);

  async function giveConsent(checked: boolean) {
    setConsent(checked);
    if (!checked || consentRef) return;
    setConsentBusy(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screeningId, language: lang }),
      });
      const data = await res.json();
      setConsentRef(data.ref);
    } catch {
      // Offline fallback: still give the person a code they can quote.
      setConsentRef(`OD-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`);
    } finally {
      setConsentBusy(false);
    }
  }

  async function sendSms() {
    setSendState("sending");
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, body: smsSummary(r, lang, consentRef ?? undefined) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSimulatedText(data.body);
      setSendState(data.status === "sent" ? "sent" : "simulated");
    } catch {
      setSendState("error");
    }
  }

  function download() {
    const text = fullSummary(r, lang, { ref: consentRef ?? undefined });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = "onedoor-summary.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const discount = discountText(r, lang);
  const isRange = r.monthlyDiscount && r.monthlyDiscount.low !== r.monthlyDiscount.high;
  const discountIsEstimate =
    isRange || ((input.heatType === "gas_heat" || input.heatType === "electric_gas_cooking") && !COMBINED_SERVICE_ADDS.verified);
  const renewalDate = r.renewalMonths ? addMonths(new Date(), r.renewalMonths) : null;
  const qualifying = members.filter((m) => r.qualifyingMembers.includes(m.id));
  const bounds = incomeTierBounds(r.householdSize);

  return (
    <div className="space-y-5" data-testid="results">
      <section className={`rounded-2xl border-2 p-5 sm:p-6 ${TONE[r.pathway]}`}>
        <p className="eyebrow">{t("res.title")}</p>
        <h2 ref={headingRef} tabIndex={-1} className="h2 mt-1 outline-none" data-testid="pathway-title">
          {t(`pathway.${r.pathway}`)}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge bg-paper text-teal-900" data-testid="pathway-badge">
            {t(`pathwayShort.${r.pathway}`)}
          </span>
          {r.enrollment !== "NA" && (
            <span className={`badge ${r.enrollment === "LIKELY_AUTO" ? "bg-leaf-700 text-white" : "bg-teal-800 text-white"}`} data-testid="enrollment-badge">
              {t(`enroll.${r.enrollment}`)}
            </span>
          )}
          {isDemo && <span className="badge bg-paper text-muted">Demo</span>}
          {completionSecs !== null && <span className="badge bg-paper text-muted">⏱ {t("res.time", { time: fmtSecs(completionSecs) })}</span>}
        </div>

        {r.householdLink && (
          <div className="mt-4 rounded-xl border-2 border-amber-500 bg-paper p-4" data-testid="household-link">
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-teal-900">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
              </svg>
              {t("link.badge")}
            </p>
            <p className="mt-1 text-ink">{t("link.text")}</p>
            {!HOUSEHOLD_MEMBER_BENEFIT_QUALIFIES.verified && (
              <p className="mt-2 text-xs text-muted">
                {t("res.estimate")}: {HOUSEHOLD_MEMBER_BENEFIT_QUALIFIES.note}
              </p>
            )}
          </div>
        )}
      </section>

      {r.pathway === "NEEDS_INFO" && r.followUp && (
        <section className="card" data-testid="follow-up">
          <p className="text-lg font-semibold">{tm(r.followUp)}</p>
          <div className="mt-4 grid gap-2">
            {(["under60", "60to80", "80to100", "over100"] as IncomeTier[]).map((tier) => (
              <button key={tier} className="choice" onClick={() => onIncomeAnswer(tier)}>
                {t(`income.${tier}`, {
                  t5: money(bounds.tier5Max, lang),
                  t5plus: money(bounds.tier5Max + 1, lang),
                  t6: money(bounds.tier6Max, lang),
                  t6plus: money(bounds.tier6Max + 1, lang),
                  t7: money(bounds.tier7Max, lang),
                })}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">{t("followUp.unsure")}</p>
        </section>
      )}

      {discount && (
        <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">{t("res.discount")}</p>
            <p className="font-display text-4xl font-semibold text-teal-900" data-testid="discount">
              {discount} <span className="font-sans text-lg font-medium text-muted">{t("res.perMonth")}</span>
            </p>
            {r.monthlyDiscount && (
              <p className="text-muted">{t("res.perYear", { amount: money(r.monthlyDiscount.high * 12, lang) })}</p>
            )}
            {isRange && <p className="mt-1 text-sm text-muted">{t("res.estimateRange")}</p>}
          </div>
          <div className="text-sm text-muted sm:max-w-64 sm:text-right">
            {discountIsEstimate && <span className="badge mb-1 bg-amber-100 text-teal-900">{t("res.estimate")}</span>}
            <p>
              <a href={MONTHLY_DISCOUNTS.source} target="_blank" rel="noreferrer" className="underline">
                {t("res.discountSource", { tier: r.tier ?? "" })}
              </a>
            </p>
          </div>
        </section>
      )}

      {r.why.length > 0 && (
        <section className="card">
          <h3 className="mb-3 text-lg font-semibold text-teal-900">{t("res.why")}</h3>
          {qualifying.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {qualifying.map((m) => (
                <span key={m.id} className="badge bg-teal-50 text-teal-900">
                  {m.relationship === "self" ? t("member.you") : t(`rel.${m.relationship}`)}: {m.benefits.map((b) => t(`benefitShort.${b}`)).join(", ")}
                </span>
              ))}
            </div>
          )}
          <ul className="space-y-2">
            {r.why.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 text-teal-700" aria-hidden="true">●</span>
                <span>{tm(w)}</span>
              </li>
            ))}
          </ul>
          {r.backupPathway && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm">{t("res.backup")}</p>}
        </section>
      )}

      {r.documents.length > 0 && (
        <section className="card">
          <h3 className="mb-3 text-lg font-semibold text-teal-900">{t("res.docs")}</h3>
          <ul className="space-y-2">
            {r.documents.map((d, i) => (
              <li key={i}>
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-teal-800" />
                  <span>{tm(d)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.nextSteps.length > 0 && (
        <section className="card">
          <h3 className="mb-3 text-lg font-semibold text-teal-900">{t("res.next")}</h3>
          <ol className="space-y-2">
            {r.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">{i + 1}</span>
                <span>{tm(s)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {r.pathway === "EAP" && (
              <a className="btn-accent py-2 text-sm" href={CONTACTS.eap.web} target="_blank" rel="noreferrer">
                coned.com — EAP ↗
              </a>
            )}
            {(r.pathway === "EEAP" || r.backupPathway === "EEAP") && (
              <a className={`${r.pathway === "EEAP" ? "btn-accent" : "btn-ghost"} py-2 text-sm`} href={CONTACTS.eeap.web} target="_blank" rel="noreferrer">
                coned.nyeeap.com ↗
              </a>
            )}
            {(r.pathway === "NOT_ELIGIBLE" || r.pathway === "NOT_CUSTOMER") && (
              <>
                <a className="btn-ghost py-2 text-sm" href={CONTACTS.heap.web} target="_blank" rel="noreferrer">
                  HEAP ↗
                </a>
                <a className="btn-ghost py-2 text-sm" href={CONTACTS.accessNyc.web} target="_blank" rel="noreferrer">
                  ACCESS NYC ↗
                </a>
              </>
            )}
          </div>
        </section>
      )}

      {renewalDate && (
        <section className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-teal-900">{t("res.renewal")}</h3>
            <p>{t("res.renewalText", { months: r.renewalMonths!, date: fmtDate(renewalDate, lang) })}</p>
          </div>
          <a
            className="btn-ghost shrink-0 text-sm"
            download="onedoor-renewal.ics"
            href={icsFor(renewalDate, "OneDoor: re-apply for Enhanced EAP", `${t("next.applyEeap")}`)}
          >
            📅 {t("res.addCalendar")}
          </a>
        </section>
      )}

      {(r.pathway === "EAP" || r.pathway === "EEAP") && (
        <section className="card border-2 border-teal-700/30" data-testid="consent">
          <p className="eyebrow">Consent-to-match</p>
          <h3 className="mt-1 text-lg font-semibold text-teal-900">{t("consent.title")}</h3>
          <p className="mt-2">{t("consent.text")}</p>
          <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-xl border-2 border-line px-4 py-3 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-800"
              checked={consent}
              disabled={consentBusy}
              onChange={(e) => giveConsent(e.target.checked)}
              data-testid="consent-checkbox"
            />
            <span className="font-semibold">{t("consent.checkbox")}</span>
          </label>
          {consent && consentRef && (
            <div className="mt-4 rounded-xl bg-teal-900 p-4 text-white" data-testid="consent-ref">
              <p className="text-sm text-teal-100">
                {t("consent.saved")} · {t("consent.ref")}
              </p>
              <p className="font-mono text-2xl font-bold tracking-wider">{consentRef}</p>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{t("consent.note")}</p>
        </section>
      )}

      <section className="card no-print">
        <h3 className="mb-3 text-lg font-semibold text-teal-900">{t("send.title")}</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">{t("send.phone")}</span>
            <input
              className="field"
              type="tel"
              inputMode="tel"
              placeholder={`${t("send.phone")} — (718) 555-0142`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button className="btn-primary" onClick={sendSms} disabled={phone.replace(/\D/g, "").length < 10 || sendState === "sending"}>
            {sendState === "sending" ? t("send.sending") : t("send.button")}
          </button>
        </div>
        {sendState === "sent" && <p className="mt-2 font-semibold text-leaf-700">{t("send.sent")}</p>}
        {sendState === "error" && <p className="mt-2 text-brick-600">{t("send.error")}</p>}
        {sendState === "simulated" && (
          <div className="mt-3">
            <p className="text-sm text-muted">{t("send.simulated")}</p>
            <pre className="mt-2 max-w-sm rounded-2xl rounded-bl-sm bg-teal-50 p-3 font-sans text-sm whitespace-pre-wrap">{simulatedText}</pre>
          </div>
        )}
      </section>

      <p className="text-center text-sm text-muted">{t("res.help")}</p>

      <div className="no-print flex flex-wrap justify-between gap-2">
        <button className="btn-ghost" onClick={onBack}>
          ← {t("check.back")}
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>
            🖨 {t("res.print")}
          </button>
          <button className="btn-ghost" onClick={download} aria-label="Download summary">
            ⬇ .txt
          </button>
          <button className="btn-primary" onClick={onRestart}>
            {t("check.startOver")}
          </button>
        </div>
      </div>
    </div>
  );
}
