/**
 * Ratepayer ledger: the cost of extra discounts to other ratepayers vs. the
 * savings from fewer arrears, write-offs, terminations and collections.
 * Pure functions; every default carries its source or is marked as an assumption.
 */

export type Assumption = {
  key: keyof ImpactInputs;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: "count" | "usd" | "pct";
  source: string;
  kind: "brief" | "derived" | "assumption";
};

export type ImpactInputs = {
  additionalHouseholds: number;
  avgMonthlyDiscount: number;
  shareInArrears: number;
  avgArrears: number;
  arrearsReduction: number;
  writeOffRate: number;
  collectionCostPerAccount: number;
  terminationRate: number;
  terminationReduction: number;
  costPerTermination: number;
  adminCostPerEnrollee: number;
  residentialRatepayers: number;
  existingParticipants: number;
  retentionAutoRenew: number;
  retentionPaper: number;
};

export const ASSUMPTIONS: Assumption[] = [
  { key: "additionalHouseholds", label: "Additional households enrolled", value: 100_000, min: 0, max: 600_000, step: 5_000, unit: "count", kind: "assumption",
    source: "≈20% of the modeled 521,653-household gap (/map). Brief: ~600,000 potentially eligible for the income pathway [4]." },
  { key: "avgMonthlyDiscount", label: "Average monthly discount", value: 42, min: 1, max: 200, step: 1, unit: "usd", kind: "derived",
    source: "Brief [1][3]: >$500M in EAP discounts over two years to ~500,000 customers → $500M ÷ 2 ÷ 500k ÷ 12 ≈ $42." },
  { key: "shareInArrears", label: "Share of new enrollees 60+ days behind", value: 0.25, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Citywide 496,007 of ~3M residential customers (≈16%) are 60+ days behind [6]; set higher for low-income households. Replace with utility data." },
  { key: "avgArrears", label: "Average arrears per household behind", value: 1_911, min: 0, max: 5_000, step: 10, unit: "usd", kind: "derived",
    source: "Brief [6]: $948M owed by 496,007 customers 60+ days behind → $1,911." },
  { key: "arrearsReduction", label: "Reduction in arrears among enrolled", value: 0.2, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Assumption. Validate with DPS monthly EAP reports (arrears for participants vs. non-participants)." },
  { key: "writeOffRate", label: "Share of arrears eventually written off", value: 0.3, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Assumption. Uncollectible expense is recovered from all ratepayers; replace with Con Edison rate-case figures." },
  { key: "collectionCostPerAccount", label: "Collection cost per account in arrears (per year)", value: 60, min: 0, max: 500, step: 5, unit: "usd", kind: "assumption",
    source: "Assumption: notices, calls, field visits. Replace with utility cost data." },
  { key: "terminationRate", label: "Annual termination rate (eligible, unenrolled)", value: 0.063, min: 0, max: 0.3, step: 0.001, unit: "pct", kind: "derived",
    source: "Brief [7]: 190,410 terminations in 2025 ÷ ~3M residential customers ≈ 6.3%. Likely higher among eligible households (conservative)." },
  { key: "terminationReduction", label: "Reduction in terminations among enrolled", value: 0.25, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Assumption. Validate with DPS termination data by EAP status." },
  { key: "costPerTermination", label: "Cost per termination + reconnection", value: 150, min: 0, max: 1_000, step: 5, unit: "usd", kind: "assumption",
    source: "Assumption: field disconnect, reconnect and processing. Replace with utility cost data." },
  { key: "adminCostPerEnrollee", label: "Outreach & admin cost per new enrollee", value: 15, min: 0, max: 200, step: 1, unit: "usd", kind: "assumption",
    source: "Assumption for OneDoor operations, SMS and trusted-messenger stipends. Address-match enrollment keeps this low." },
  { key: "residentialRatepayers", label: "Residential ratepayers", value: 3_000_000, min: 1_000_000, max: 4_000_000, step: 50_000, unit: "count", kind: "assumption",
    source: "≈3.3M NYC + 0.37M Westchester households (ACS 2024) minus master-metered homes. Confirm with Con Edison customer counts." },
  { key: "existingParticipants", label: "Households already receiving discounts", value: 500_000, min: 0, max: 1_500_000, step: 10_000, unit: "count", kind: "brief",
    source: "Brief [1][3]: half a million customers enrolled in 2025." },
  { key: "retentionAutoRenew", label: "Still enrolled after 18 months (data-driven renewal)", value: 0.9, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Assumption, informed by the UK Warm Home Discount (~96% paid automatically via data matching) [8]." },
  { key: "retentionPaper", label: "Still enrolled after 18 months (paper re-application)", value: 0.6, min: 0, max: 1, step: 0.01, unit: "pct", kind: "assumption",
    source: "Assumption: renewal paperwork is a known drop-off point [5]. Replace with EEAP renewal data when available." },
];

export const DEFAULTS: ImpactInputs = Object.fromEntries(ASSUMPTIONS.map((a) => [a.key, a.value])) as ImpactInputs;

export function computeImpact(i: ImpactInputs) {
  const H = i.additionalHouseholds;
  const discountDollars = H * i.avgMonthlyDiscount * 12;
  const adminCost = H * i.adminCostPerEnrollee;
  const householdsInArrears = H * i.shareInArrears;
  const arrearsReduced = householdsInArrears * i.avgArrears * i.arrearsReduction;
  const writeOffsAvoided = arrearsReduced * i.writeOffRate;
  const collectionsSaved = householdsInArrears * i.arrearsReduction * i.collectionCostPerAccount;
  const terminationsAvoided = H * i.terminationRate * i.terminationReduction;
  const terminationCostsSaved = terminationsAvoided * i.costPerTermination;
  const offsets = writeOffsAvoided + collectionsSaved + terminationCostsSaved;
  const grossCost = discountDollars + adminCost;
  const netCost = grossCost - offsets;
  const payers = Math.max(1, i.residentialRatepayers - i.existingParticipants - H);
  const netPerPayerMonth = netCost / payers / 12;
  const grossPerPayerMonth = grossCost / payers / 12;
  const offsetShare = grossCost > 0 ? offsets / grossCost : 0;

  // Break-even 1: the arrears reduction at which offsets cover the full cost (often > 100%: the discount is a transfer by design).
  const perPointArrears = householdsInArrears * (i.avgArrears * i.writeOffRate + i.collectionCostPerAccount);
  const breakEvenArrearsReduction = perPointArrears > 0 ? (grossCost - terminationCostsSaved) / perPointArrears : Infinity;
  // Break-even 2: the monthly discount that savings alone would fund.
  const selfFundingMonthlyDiscount = H > 0 ? Math.max(0, (offsets - adminCost) / (H * 12)) : 0;

  return {
    discountDollars,
    adminCost,
    grossCost,
    arrearsReduced,
    writeOffsAvoided,
    collectionsSaved,
    terminationsAvoided,
    terminationCostsSaved,
    offsets,
    netCost,
    payers,
    netPerPayerMonth,
    grossPerPayerMonth,
    offsetShare,
    breakEvenArrearsReduction,
    selfFundingMonthlyDiscount,
    year2Auto: H * i.retentionAutoRenew,
    year2Paper: H * i.retentionPaper,
    year2ExtraDiscount: H * (i.retentionAutoRenew - i.retentionPaper) * i.avgMonthlyDiscount * 12,
  };
}

export type ImpactResult = ReturnType<typeof computeImpact>;
