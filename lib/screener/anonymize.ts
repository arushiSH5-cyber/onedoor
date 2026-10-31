import { BENEFITS, type Benefit, type HeatType } from "@/lib/rules/config";
import { incomeTierFromAmount, screen, type Borough, type IncomeTier, type Member, type ScreenerInput } from "@/lib/rules/engine";
import { isLang } from "@/lib/i18n";

const BOROUGHS: Borough[] = ["bronx", "brooklyn", "manhattan", "queens", "staten_island"];
const HEATS: HeatType[] = ["electric_heat", "gas_heat", "electric_only", "electric_gas_cooking", "unknown"];
const RELS = ["self", "spouse", "parent", "child", "grandparent", "sibling", "other_relative", "roommate"];
const AGES = ["under18", "18to59", "60plus"];
const TIERS: IncomeTier[] = ["under60", "60to80", "80to100", "over100"];

/** Validate an untrusted ScreenerInput from the client. Throws on bad shape. */
export function sanitizeInput(raw: unknown): ScreenerInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const members = Array.isArray(o.members) ? o.members.slice(0, 20) : [];
  if (!members.length) throw new Error("members required");
  const cleanMembers: Member[] = members.map((m, i) => {
    const r = (m ?? {}) as Record<string, unknown>;
    return {
      id: typeof r.id === "string" ? r.id.slice(0, 40) : `m${i}`,
      relationship: (RELS.includes(r.relationship as string) ? r.relationship : "other_relative") as Member["relationship"],
      ageBand: (AGES.includes(r.ageBand as string) ? r.ageBand : "18to59") as Member["ageBand"],
      benefits: Array.isArray(r.benefits) ? (r.benefits.filter((b) => (BENEFITS as readonly string[]).includes(b as string)) as Benefit[]) : [],
      isBillHolder: r.isBillHolder === true,
    };
  });
  const inc = (o.income ?? {}) as Record<string, unknown>;
  const income: ScreenerInput["income"] =
    inc.kind === "exact" && typeof inc.amount === "number" && inc.amount >= 0
      ? { kind: "exact", amount: inc.amount }
      : inc.kind === "tier" && TIERS.includes(inc.tier as IncomeTier)
        ? { kind: "tier", tier: inc.tier as IncomeTier }
        : { kind: "unknown" };
  const size = typeof o.householdSize === "number" ? Math.min(20, Math.max(1, Math.round(o.householdSize))) : cleanMembers.length;
  return {
    borough: BOROUGHS.includes(o.borough as Borough) ? (o.borough as Borough) : undefined,
    zip: typeof o.zip === "string" && /^\d{3,5}$/.test(o.zip) ? o.zip : undefined,
    billSituation: o.billSituation === "landlord" ? "landlord" : o.billSituation === "in_household" ? "in_household" : "unknown",
    members: cleanMembers,
    householdSize: Math.max(size, cleanMembers.length),
    income,
    heatType: HEATS.includes(o.heatType as HeatType) ? (o.heatType as HeatType) : "unknown",
  };
}

export type AnonRecord = {
  borough: string | null;
  zip3: string | null;
  language: string;
  inputMode: string;
  householdSize: number;
  incomeBracket: string;
  benefits: string;
  pathway: string;
  householdLink: boolean;
  completionSecs: number;
  isDemoSeed: boolean;
};

/** Re-run the rules server-side and keep only coarse, non-identifying fields. */
export function anonymize(input: ScreenerInput, meta: Record<string, unknown>): AnonRecord {
  const r = screen(input);
  const incomeBracket =
    input.income.kind === "exact"
      ? incomeTierFromAmount(input.income.amount, r.householdSize)
      : input.income.kind === "tier"
        ? input.income.tier
        : "unknown";
  const benefits = [...new Set(input.members.flatMap((m) => m.benefits))].sort().join(",");
  const secs = typeof meta.completionSecs === "number" ? Math.min(3600, Math.max(0, Math.round(meta.completionSecs))) : 0;
  return {
    borough: input.borough ?? null,
    zip3: input.zip ? input.zip.slice(0, 3) : null,
    language: isLang(meta.language) ? meta.language : "en",
    inputMode: meta.inputMode === "text" || meta.inputMode === "sms" ? meta.inputMode : "form",
    householdSize: r.householdSize,
    incomeBracket,
    benefits,
    pathway: r.pathway,
    householdLink: r.householdLink,
    completionSecs: secs,
    isDemoSeed: meta.isDemo === true,
  };
}
