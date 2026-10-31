/**
 * OneDoor rules engine. Pure, deterministic functions only — no I/O, no LLM.
 * Results are language-neutral: they return message keys + params that the UI
 * translates (see lib/i18n).
 */
import {
  AMI_EXTRA_PERSON_RATE,
  AMI_LIMITS_NYC,
  AUTO_ENROLL_BENEFITS,
  EEAP_ENROLLMENT_MONTHS,
  EEAP_TIER_CUTOFFS,
  MONTHLY_DISCOUNTS,
  QUALIFYING_BENEFITS,
  type Benefit,
  type HeatType,
  type Tier,
} from "./config";

export type Relationship =
  | "self"
  | "spouse"
  | "parent"
  | "child"
  | "grandparent"
  | "sibling"
  | "other_relative"
  | "roommate";

export type AgeBand = "under18" | "18to59" | "60plus";

export type Member = {
  id: string;
  relationship: Relationship;
  ageBand: AgeBand;
  benefits: Benefit[];
  isBillHolder: boolean;
};

export type IncomeTier = "under60" | "60to80" | "80to100" | "over100";

export type IncomeInput =
  | { kind: "exact"; amount: number }
  | { kind: "tier"; tier: IncomeTier }
  | { kind: "unknown" };

/** Who the utility account belongs to. "landlord" = utilities included in rent. */
export type BillSituation = "in_household" | "landlord" | "unknown";

export type ScreenerInput = {
  borough?: Borough;
  zip?: string;
  billSituation: BillSituation;
  members: Member[];
  /** Defaults to members.length when omitted. */
  householdSize?: number;
  income: IncomeInput;
  heatType: HeatType;
};

export type Borough = "bronx" | "brooklyn" | "manhattan" | "queens" | "staten_island";

export type Pathway = "EAP" | "EEAP" | "NOT_ELIGIBLE" | "NEEDS_INFO" | "NOT_CUSTOMER";
export type Enrollment = "LIKELY_AUTO" | "MUST_APPLY" | "NA";

export type Msg = { key: string; params?: Record<string, string | number> };

export type ScreenerResult = {
  pathway: Pathway;
  enrollment: Enrollment;
  householdLink: boolean;
  /** Members (by id) whose benefits qualify the household. */
  qualifyingMembers: string[];
  bestBenefit?: Benefit;
  tier?: Tier;
  /** Estimated monthly discount in dollars; range when heat type unknown. */
  monthlyDiscount?: { low: number; high: number };
  amiLimit: number;
  householdSize: number;
  why: Msg[];
  documents: Msg[];
  nextSteps: Msg[];
  /** EEAP only: months until re-application. */
  renewalMonths?: number;
  /** NEEDS_INFO only: the follow-up question to ask. */
  followUp?: Msg;
  /** A backup pathway if the primary one is denied (e.g. Household Link not accepted). */
  backupPathway?: Pathway;
};

// Preference order when several members receive benefits: auto-enroll benefits
// first (they may already be active), then the rest in the DPS list order.
const BENEFIT_PRIORITY: Benefit[] = [
  "HRA_UTILITY_PAY",
  "HEAP",
  "TANF_SNA",
  "SSI",
  "SNAP",
  "MEDICAID",
  "PUBLIC_HOUSING",
  "VETERANS",
  "LIFELINE",
];

export function amiLimitFor(size: number): number {
  const n = Math.max(1, Math.round(size));
  const table = AMI_LIMITS_NYC.value;
  if (table[n]) return table[n];
  const extra = Math.round(table[4] * AMI_EXTRA_PERSON_RATE.value);
  return table[8] + (n - 8) * extra;
}

/** Dollar cut-offs for the EEAP tiers for a household size (for the income question). */
export function incomeTierBounds(size: number) {
  const ami = amiLimitFor(size);
  const c = EEAP_TIER_CUTOFFS.value;
  return {
    tier5Max: Math.round(ami * c.tier5Max),
    tier6Max: Math.round(ami * c.tier6Max),
    tier7Max: Math.round(ami * c.tier7Max),
  };
}

export function incomeTierFromAmount(amount: number, size: number): IncomeTier {
  const b = incomeTierBounds(size);
  if (amount <= b.tier5Max) return "under60";
  if (amount <= b.tier6Max) return "60to80";
  if (amount <= b.tier7Max) return "80to100";
  return "over100";
}

const TIER_FOR_INCOME: Record<Exclude<IncomeTier, "over100">, Tier> = {
  under60: 5,
  "60to80": 6,
  "80to100": 7,
};

export function monthlyDiscountFor(tier: Tier, heat: HeatType): { low: number; high: number } {
  const t = MONTHLY_DISCOUNTS.value[tier];
  const options: Record<Exclude<HeatType, "unknown">, number> = {
    electric_heat: t.electricHeat,
    electric_only: t.electricNonHeat,
    electric_gas_cooking: t.electricNonHeat + t.gasNonHeat,
    gas_heat: t.electricNonHeat + t.gasHeat,
  };
  const round = (x: number) => Math.round(x * 100) / 100;
  if (heat !== "unknown") {
    const v = round(options[heat]);
    return { low: v, high: v };
  }
  const all = Object.values(options);
  return { low: round(Math.min(...all)), high: round(Math.max(...all)) };
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

function isQualifying(b: Benefit) {
  return QUALIFYING_BENEFITS.value.includes(b);
}

function isAuto(b: Benefit) {
  return AUTO_ENROLL_BENEFITS.value.includes(b);
}

function bestOf(benefits: Benefit[]): Benefit | undefined {
  return BENEFIT_PRIORITY.find((b) => benefits.includes(b));
}

/** The main entry point. */
export function screen(input: ScreenerInput): ScreenerResult {
  const members = input.members;
  const householdSize = Math.max(1, input.householdSize ?? members.length ?? 1);
  const amiLimit = amiLimitFor(householdSize);
  const billHolder = members.find((m) => m.isBillHolder);

  const base = { householdSize, amiLimit, householdLink: false, qualifyingMembers: [] as string[] };

  // Utilities included in rent: no Con Edison account in the household.
  if (input.billSituation === "landlord") {
    return {
      ...base,
      pathway: "NOT_CUSTOMER",
      enrollment: "NA",
      why: [{ key: "why.notCustomer" }],
      documents: [],
      nextSteps: [{ key: "next.heap" }, { key: "next.accessNyc" }, { key: "next.ownAccount" }],
    };
  }

  // --- Benefits pathway (EAP) -------------------------------------------
  const qualifyingMembers = members.filter((m) => m.benefits.some(isQualifying));
  if (qualifyingMembers.length > 0) {
    const holderBenefits = billHolder ? billHolder.benefits.filter(isQualifying) : [];
    const householdLink = holderBenefits.length === 0;
    const allBenefits = qualifyingMembers.flatMap((m) => m.benefits.filter(isQualifying));
    const best = bestOf(allBenefits)!;

    // Auto-enrollment only works when the matched benefit belongs to the account holder.
    const holderAuto = holderBenefits.some(isAuto);
    const enrollment: Enrollment = holderAuto ? "LIKELY_AUTO" : "MUST_APPLY";
    const tier: Tier = allBenefits.includes("HRA_UTILITY_PAY") ? 4 : 1;

    const recipient = householdLink ? qualifyingMembers[0] : billHolder!;
    const recipientBenefit = bestOf(recipient.benefits.filter(isQualifying))!;

    const why: Msg[] = [
      {
        key: householdLink ? "why.eapHouseholdLink" : "why.eapHolder",
        params: { relationship: recipient.relationship, benefit: recipientBenefit },
      },
    ];
    if (qualifyingMembers.length > 1 || allBenefits.length > 1) {
      why.push({ key: "why.multipleBenefits", params: { count: new Set(allBenefits).size, benefit: best } });
    }
    why.push({ key: "why.eapBetterThanEeap" });
    if (holderAuto) why.push({ key: "why.autoEnroll", params: { benefit: bestOf(holderBenefits.filter(isAuto))! } });
    else if (householdLink && allBenefits.some(isAuto)) why.push({ key: "why.autoFailsLink" });
    else why.push({ key: "why.mustApply", params: { benefit: recipientBenefit } });
    if (allBenefits.includes("HEAP")) why.push({ key: "why.heapTier" });

    const documents: Msg[] = [
      { key: "doc.eapApplication" },
      { key: "doc.awardLetter", params: { relationship: recipient.relationship, benefit: recipientBenefit } },
      { key: "doc.conEdAccount" },
    ];
    if (householdLink) documents.push({ key: "doc.sameAddress" });

    const nextSteps: Msg[] = holderAuto
      ? [{ key: "next.checkBill" }, { key: "next.callIfMissing" }]
      : [{ key: "next.applyEap" }];
    if (householdLink) nextSteps.push({ key: "next.householdLink" });
    nextSteps.push({ key: "next.consent" });

    // EEAP is a fallback if the household-member benefit is not accepted.
    const incomeTier = resolveIncomeTier(input.income, householdSize);
    const backupPathway: Pathway | undefined =
      householdLink && incomeTier && incomeTier !== "over100" ? "EEAP" : undefined;

    return {
      ...base,
      pathway: "EAP",
      enrollment,
      householdLink,
      qualifyingMembers: qualifyingMembers.map((m) => m.id),
      bestBenefit: best,
      tier,
      monthlyDiscount: monthlyDiscountFor(tier, input.heatType),
      why,
      documents,
      nextSteps,
      backupPathway,
    };
  }

  // --- Income pathway (EEAP) -------------------------------------------
  const incomeTier = resolveIncomeTier(input.income, householdSize);
  if (!incomeTier) {
    return {
      ...base,
      pathway: "NEEDS_INFO",
      enrollment: "NA",
      why: [{ key: "why.needIncome", params: { size: householdSize, limit: amiLimit } }],
      followUp: { key: "followUp.income", params: { size: householdSize, limit: amiLimit } },
      documents: [],
      nextSteps: [],
    };
  }

  if (incomeTier === "over100") {
    return {
      ...base,
      pathway: "NOT_ELIGIBLE",
      enrollment: "NA",
      why: [
        { key: "why.overAmi", params: { size: householdSize, limit: amiLimit } },
        { key: "why.benefitsStillCount" },
      ],
      documents: [],
      nextSteps: [
        { key: "next.recheckBenefits" },
        { key: "next.paymentPlan" },
        { key: "next.oneShot" },
        { key: "next.heap" },
        { key: "next.incomeChange" },
      ],
    };
  }

  const tier = TIER_FOR_INCOME[incomeTier];
  const bounds = incomeTierBounds(householdSize);
  return {
    ...base,
    pathway: "EEAP",
    enrollment: "MUST_APPLY",
    tier,
    monthlyDiscount: monthlyDiscountFor(tier, input.heatType),
    why: [
      { key: "why.eeapIncome", params: { size: householdSize, limit: amiLimit } },
      { key: `why.eeapTier${tier}`, params: { t5: bounds.tier5Max, t6: bounds.tier6Max } },
      { key: "why.eeapRenewal", params: { months: EEAP_ENROLLMENT_MONTHS.value } },
    ],
    documents: [
      { key: "doc.incomeProof" },
      { key: "doc.incomeAllMembers" },
      { key: "doc.noTaxForms" },
      { key: "doc.deadline14" },
      { key: "doc.conEdAccount" },
    ],
    nextSteps: [{ key: "next.applyEeap" }, { key: "next.renewal" }, { key: "next.consent" }],
    renewalMonths: EEAP_ENROLLMENT_MONTHS.value,
  };
}

function resolveIncomeTier(income: IncomeInput, size: number): IncomeTier | undefined {
  if (income.kind === "exact") {
    if (!Number.isFinite(income.amount) || income.amount < 0) return undefined;
    return incomeTierFromAmount(income.amount, size);
  }
  if (income.kind === "tier") return income.tier;
  return undefined;
}
