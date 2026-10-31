/**
 * OneDoor program rules — the ONLY place eligibility rules live.
 *
 * Every value carries its source URL and the date we last checked it.
 * `verified: false` means we could not confirm the value on an official page;
 * the UI shows those values as "estimate".
 *
 * The LLM never reads or changes these rules. Eligibility is decided only by
 * the pure functions in ./engine.ts.
 */

export const LAST_VERIFIED = "2026-10-31";

export type Sourced<T> = {
  value: T;
  source: string;
  sourceLabel: string;
  verified: boolean;
  lastVerified: string;
  note?: string;
};

const CONED_EAP_URL =
  "https://www.coned.com/en/accounts-billing/payment-plans-assistance/energy-affordability-program";
const DPS_EAP_URL = "https://dps.ny.gov/energy-affordability-program";
const EEAP_FAQ_URL = "https://coned.nyeeap.com/faq";

function src<T>(
  value: T,
  source: string,
  sourceLabel: string,
  verified = true,
  note?: string,
): Sourced<T> {
  return { value, source, sourceLabel, verified, lastVerified: LAST_VERIFIED, note };
}

/** Benefits a household member can receive. */
export const BENEFITS = [
  "SNAP",
  "MEDICAID",
  "SSI",
  "HEAP",
  "TANF_SNA",
  "PUBLIC_HOUSING",
  "VETERANS",
  "LIFELINE",
  "HRA_UTILITY_PAY",
] as const;
export type Benefit = (typeof BENEFITS)[number];

/** Benefits that qualify a household for the benefits-based EAP pathway. */
export const QUALIFYING_BENEFITS = src<readonly Benefit[]>(
  BENEFITS,
  DPS_EAP_URL,
  "NY DPS — Energy Affordability Program",
  true,
  "HEAP, Lifeline, SNAP, Medicaid, Veterans Disability/Survivors Pension, SSI, Federal Public Housing, Utility Guarantee/Direct Vendor, TANF, Safety Net Assistance.",
);

/**
 * Benefits for which an agency notifies Con Edison and the customer is
 * enrolled automatically — but ONLY when the benefit is matched to the
 * account holder.
 */
export const AUTO_ENROLL_BENEFITS = src<readonly Benefit[]>(
  ["HEAP", "TANF_SNA", "HRA_UTILITY_PAY"],
  CONED_EAP_URL,
  "Con Edison — Energy Affordability Program",
  true,
  "Automatic if an agency notifies Con Edison of HEAP, Direct Vendor/Utility Guarantee, NYC TANF or NYC Safety Net Assistance. Medicaid, Public Housing, Veterans pension, Lifeline, SNAP and SSI must enroll directly.",
);

/**
 * Whether a benefit received by ANY household member (not only the bill
 * holder) qualifies the household. The brief's Rosa case rests on this. The DPS
 * page describes eligibility at the household level, but we could not find an
 * explicit statement on Con Edison's page, so it is flagged unverified.
 */
export const HOUSEHOLD_MEMBER_BENEFIT_QUALIFIES = src(
  true,
  DPS_EAP_URL,
  "NY DPS — EAP (household-level eligibility)",
  false,
  "Confirm with Con Edison EAP (EAP@conEd.com) that a household member's award letter is accepted when the account is in another member's name.",
);

/** Annual income limits (100% of area median income) by household size, NYC. */
export const AMI_LIMITS_NYC = src<Record<number, number>>(
  {
    1: 113_400,
    2: 129_600,
    3: 145_800,
    4: 162_000,
    5: 175_000,
    6: 188_000,
    7: 200_900,
    8: 213_900,
  },
  DPS_EAP_URL,
  "NY DPS — EAP income table (Con Edison & National Grid NYC, as of 10/15/26)",
);

/** Household sizes above 8: add 8% of the 4-person limit per extra person (HUD convention). */
export const AMI_EXTRA_PERSON_RATE = src(
  0.08,
  "https://www.huduser.gov/portal/datasets/il.html",
  "HUD income-limit methodology (extra-person adjustment)",
  false,
  "The official table stops at 8 people. Confirm limits for 9+ person households with the EEAP administrator.",
);

/** EEAP income tiers as a share of AMI. Tier 5 <60%, Tier 6 60–80%, Tier 7 80–100%. */
export const EEAP_TIER_CUTOFFS = src(
  { tier5Max: 0.6, tier6Max: 0.8, tier7Max: 1.0 },
  CONED_EAP_URL,
  "Con Edison — Enhanced EAP income tiers (effective Feb 1, 2026)",
);

export type HeatType =
  | "electric_heat"
  | "gas_heat"
  | "electric_only"
  | "electric_gas_cooking"
  | "unknown";

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type TierAmounts = { electricHeat: number; electricNonHeat: number; gasHeat: number; gasNonHeat: number };

/** Monthly discounts by tier, effective Feb 1, 2026. */
export const MONTHLY_DISCOUNTS = src<Record<Tier, TierAmounts>>(
  {
    1: { electricHeat: 33.47, electricNonHeat: 33.47, gasHeat: 135.24, gasNonHeat: 3 },
    2: { electricHeat: 80.58, electricNonHeat: 50.66, gasHeat: 167.01, gasNonHeat: 3 },
    3: { electricHeat: 126.21, electricNonHeat: 73.47, gasHeat: 189.83, gasNonHeat: 3 },
    4: { electricHeat: 121.84, electricNonHeat: 71.29, gasHeat: 187.65, gasNonHeat: 3 },
    5: { electricHeat: 33.47, electricNonHeat: 33.47, gasHeat: 135.24, gasNonHeat: 3 },
    6: { electricHeat: 3, electricNonHeat: 3, gasHeat: 44.5, gasNonHeat: 3 },
    7: { electricHeat: 1, electricNonHeat: 1, gasHeat: 1, gasNonHeat: 1 },
  },
  CONED_EAP_URL,
  "Con Edison — EAP & Enhanced EAP monthly discounts (effective Feb 1, 2026)",
  true,
  "Tier 1: HEAP grant <$435 or another qualifying benefit. Tiers 2–3 depend on HEAP grant size. Tier 4: energy bills paid by public assistance.",
);

/** Adding the electric and gas discounts for combined customers is our assumption. */
export const COMBINED_SERVICE_ADDS = src(
  true,
  CONED_EAP_URL,
  "Con Edison discount table (separate electric and gas columns)",
  false,
  "We add the electric and gas discounts for customers who have both services. Confirm with Con Edison.",
);

/** Enrollment length for the income-based pathway. */
export const EEAP_ENROLLMENT_MONTHS = src(
  18,
  EEAP_FAQ_URL,
  "NY EEAP FAQ — enrollment lasts 18 months",
);

export const EEAP_DOC_DEADLINE_DAYS = src(14, EEAP_FAQ_URL, "NY EEAP FAQ — 14 days to submit documents");

export const CONTACTS = {
  eap: {
    web: "https://www.coned.com/en/accounts-billing/payment-plans-assistance/energy-affordability-program",
    email: "EAP@conEd.com",
    fax: "1-212-844-0110",
    mail: "Con Edison EAP, P.O. Box 138, Cooper Station, New York, NY 10276-0138",
  },
  eeap: {
    web: "https://coned.nyeeap.com/program",
    phone: "1-877-400-2501",
    hours: "Mon–Fri, 8am–5pm ET",
    fax: "1-517-580-5123",
    mail: "CLEAResult – NY EEAP, 16350 Felton Rd., Lansing, MI 48906",
  },
  heap: { web: "https://otda.ny.gov/programs/heap/", phone: "311" },
  oneShot: { web: "https://www.nyc.gov/site/hra/help/one-shot-deals.page", phone: "311" },
  accessNyc: { web: "https://access.nyc.gov/" },
} as const;

/** Every rule, for the /methods page. */
export const ALL_RULES = {
  QUALIFYING_BENEFITS,
  AUTO_ENROLL_BENEFITS,
  HOUSEHOLD_MEMBER_BENEFIT_QUALIFIES,
  AMI_LIMITS_NYC,
  AMI_EXTRA_PERSON_RATE,
  EEAP_TIER_CUTOFFS,
  MONTHLY_DISCOUNTS,
  COMBINED_SERVICE_ADDS,
  EEAP_ENROLLMENT_MONTHS,
  EEAP_DOC_DEADLINE_DAYS,
};
