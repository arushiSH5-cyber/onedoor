/**
 * The OneDoor SMS conversation as a pure state machine. Shared by the in-app
 * simulator and the Twilio webhook. Works on any phone that can text.
 */
import type { Benefit, HeatType } from "@/lib/rules/config";
import { incomeTierBounds, screen, type Borough, type IncomeTier, type Member, type ScreenerInput, type ScreenerResult } from "@/lib/rules/engine";
import { LANGS, money, translate, type Lang } from "@/lib/i18n";
import { smsSummary } from "@/lib/screener/summary";

export type SmsStep = "lang" | "borough" | "bill" | "size" | "benefits" | "who" | "income" | "heat" | "consent" | "done";

export type SmsState = {
  step: SmsStep;
  lang: Lang;
  borough?: Borough;
  bill?: "me" | "other" | "landlord";
  size?: number;
  benefits: Benefit[];
  benefitHolderIsBillHolder?: boolean;
  income?: IncomeTier | "unknown";
  heat?: HeatType;
  startedAt: number;
  screeningId?: string;
  ref?: string;
};

export type SmsOutcome = {
  state: SmsState;
  replies: string[];
  /** Set when the screening finishes (to store it). */
  completed?: { input: ScreenerInput; result: ScreenerResult; secs: number };
  /** Set when the person answers the consent question YES. */
  consented?: boolean;
};

const BOROUGHS: Borough[] = ["bronx", "brooklyn", "manhattan", "queens", "staten_island"];
const SMS_BENEFITS: Benefit[] = ["SNAP", "MEDICAID", "SSI", "HEAP", "TANF_SNA", "PUBLIC_HOUSING", "VETERANS"];
const TIERS: (IncomeTier | "unknown")[] = ["under60", "60to80", "80to100", "over100", "unknown"];
const HEATS: HeatType[] = ["gas_heat", "electric_heat", "electric_only", "unknown"];
const YES = /^(1|y|yes|si|sí|s|oui|wi|da|да|是|是的|হ্যাঁ|ha|예|네|ne)$/i;
const NO = /^(2|n|no|non|nyet|нет|否|না|아니요|아니오)$/i;

export const START_WORDS = /^(onedoor|one door|start|hola|help|ayuda)$/i;

function num(text: string) {
  const m = text.trim().match(/^\d{1,2}$/);
  return m ? Number(m[0]) : NaN;
}

function prompt(s: SmsState): string {
  const t = (k: string, p?: Record<string, string | number>) => translate(s.lang, k, p);
  switch (s.step) {
    case "lang": return t("sms.welcome");
    case "borough": return t("sms.borough");
    case "bill": return t("sms.bill");
    case "size": return t("sms.size");
    case "benefits": return t("sms.benefits");
    case "who": return t("sms.whoBenefit");
    case "income": {
      const b = incomeTierBounds(s.size ?? 1);
      const m = (n: number) => money(n, s.lang);
      return t("sms.income", { t5: m(b.tier5Max), t5plus: m(b.tier5Max + 1), t6: m(b.tier6Max), t6plus: m(b.tier6Max + 1), t7: m(b.tier7Max) });
    }
    case "heat": return t("sms.heat");
    case "consent": return t("sms.consent");
    case "done": return t("sms.restart");
  }
}

export function toInput(s: SmsState): ScreenerInput {
  const size = Math.max(1, s.size ?? 1);
  const members: Member[] = [{ id: "m1", relationship: "self", ageBand: "18to59", benefits: [], isBillHolder: s.bill === "me" }];
  if (s.bill === "other") members.push({ id: "m2", relationship: "other_relative", ageBand: "18to59", benefits: [], isBillHolder: true });
  if (s.benefits.length) {
    const holder = members.find((m) => m.isBillHolder);
    if (s.benefitHolderIsBillHolder && holder) holder.benefits = [...s.benefits];
    else {
      // Benefit belongs to someone who is not the bill holder.
      const nonHolder = members.find((m) => !m.isBillHolder) ?? (members.push({ id: "m3", relationship: "other_relative", ageBand: "18to59", benefits: [], isBillHolder: false }), members[members.length - 1]);
      nonHolder.benefits = [...s.benefits];
    }
  }
  return {
    borough: s.borough,
    billSituation: s.bill === "landlord" ? "landlord" : "in_household",
    members,
    householdSize: Math.max(size, members.length),
    income: s.income && s.income !== "unknown" ? { kind: "tier", tier: s.income } : { kind: "unknown" },
    heatType: s.heat ?? "unknown",
  };
}

export function newSmsState(now = Date.now()): SmsState {
  return { step: "lang", lang: "en", benefits: [], startedAt: now };
}

export function handleSms(prev: SmsState | null, text: string, opts: { now?: number; makeRef: () => string }): SmsOutcome {
  const now = opts.now ?? Date.now();
  const body = text.trim();
  if (!prev || START_WORDS.test(body) || (prev.step === "done" && body !== "")) {
    const state = newSmsState(now);
    if (prev?.lang && !START_WORDS.test(body)) state.lang = prev.lang;
    return { state, replies: [prompt(state)] };
  }
  const s: SmsState = { ...prev, benefits: [...prev.benefits] };
  const invalid = (): SmsOutcome => ({ state: s, replies: [translate(s.lang, "sms.invalid"), prompt(s)] });
  const n = num(body);

  switch (s.step) {
    case "lang":
      if (!(n >= 1 && n <= LANGS.length)) return invalid();
      s.lang = LANGS[n - 1];
      s.step = "borough";
      break;
    case "borough":
      if (!(n >= 1 && n <= 5)) return invalid();
      s.borough = BOROUGHS[n - 1];
      s.step = "bill";
      break;
    case "bill":
      if (!(n >= 1 && n <= 3)) return invalid();
      s.bill = (["me", "other", "landlord"] as const)[n - 1];
      if (s.bill === "landlord") return finish(s, now);
      s.step = "size";
      break;
    case "size":
      if (!(n >= 1 && n <= 12)) return invalid();
      s.size = n;
      s.step = "benefits";
      break;
    case "benefits": {
      const picks = body.split(/[\s,]+/).filter(Boolean).map(Number);
      if (!picks.length || picks.some((p) => !Number.isInteger(p) || p < 0 || p > SMS_BENEFITS.length)) return invalid();
      s.benefits = [...new Set(picks.filter((p) => p > 0).map((p) => SMS_BENEFITS[p - 1]))];
      s.step = s.benefits.length ? "who" : "income";
      break;
    }
    case "who":
      if (n !== 1 && n !== 2) return invalid();
      s.benefitHolderIsBillHolder = n === 1;
      s.step = "heat";
      break;
    case "income":
      if (!(n >= 1 && n <= 5)) return invalid();
      s.income = TIERS[n - 1];
      s.step = "heat";
      break;
    case "heat":
      if (!(n >= 1 && n <= 4)) return invalid();
      s.heat = HEATS[n - 1];
      return finish(s, now);
    case "consent":
      if (YES.test(body)) {
        s.ref = opts.makeRef();
        s.step = "done";
        return { state: s, replies: [translate(s.lang, "sms.ref", { ref: s.ref }), translate(s.lang, "consent.saved") + ". " + translate(s.lang, "sms.restart")], consented: true };
      }
      if (NO.test(body)) {
        s.step = "done";
        return { state: s, replies: [translate(s.lang, "sms.restart")] };
      }
      return invalid();
  }
  return { state: s, replies: [prompt(s)] };
}

function finish(s: SmsState, now: number): SmsOutcome {
  const input = toInput(s);
  const result = screen(input);
  const secs = Math.max(1, Math.round((now - s.startedAt) / 1000));
  const eligible = result.pathway === "EAP" || result.pathway === "EEAP";
  s.step = eligible ? "consent" : "done";
  const replies = [smsSummary(result, s.lang)];
  replies.push(eligible ? prompt(s) : translate(s.lang, "sms.restart"));
  return { state: s, replies, completed: { input, result, secs } };
}
