import { describe, expect, it } from "vitest";
import {
  addMonths,
  amiLimitFor,
  incomeTierFromAmount,
  monthlyDiscountFor,
  screen,
  type Member,
  type ScreenerInput,
} from "@/lib/rules/engine";
import { PERSONAS } from "@/lib/rules/personas";

const self = (over: Partial<Member> = {}): Member => ({
  id: "m1",
  relationship: "self",
  ageBand: "18to59",
  benefits: [],
  isBillHolder: true,
  ...over,
});

const base = (over: Partial<ScreenerInput> = {}): ScreenerInput => ({
  borough: "bronx",
  billSituation: "in_household",
  members: [self()],
  income: { kind: "unknown" },
  heatType: "electric_only",
  ...over,
});

describe("required cases", () => {
  it("1. Rosa: bill in her name, mother on SSI → EAP, Household Link, must apply", () => {
    const r = screen(PERSONAS.rosa.input);
    expect(r.pathway).toBe("EAP");
    expect(r.householdLink).toBe(true);
    expect(r.enrollment).toBe("MUST_APPLY");
    expect(r.bestBenefit).toBe("SSI");
    expect(r.qualifyingMembers).toEqual(["m2"]);
    expect(r.why[0].key).toBe("why.eapHouseholdLink");
    expect(r.nextSteps.map((s) => s.key)).toContain("next.householdLink");
    expect(r.documents.map((d) => d.key)).toContain("doc.sameAddress");
    // Income is below AMI, so EEAP is a backup if the link is not accepted.
    expect(r.backupPathway).toBe("EEAP");
    expect(r.monthlyDiscount).toEqual({ low: 33.47, high: 33.47 });
  });

  it("2. HEAP recipient on the bill → likely already auto-enrolled", () => {
    const r = screen(base({ members: [self({ benefits: ["HEAP"] })] }));
    expect(r.pathway).toBe("EAP");
    expect(r.enrollment).toBe("LIKELY_AUTO");
    expect(r.householdLink).toBe(false);
    expect(r.why.map((w) => w.key)).toContain("why.autoEnroll");
    expect(r.nextSteps[0].key).toBe("next.checkBill");
  });

  it("3. No benefits, income below AMI → EEAP, proof of income, 18-month renewal", () => {
    const r = screen(base({ members: [self(), self({ id: "m2", relationship: "child", isBillHolder: false })], income: { kind: "exact", amount: 60_000 } }));
    expect(r.pathway).toBe("EEAP");
    expect(r.enrollment).toBe("MUST_APPLY");
    expect(r.tier).toBe(5);
    expect(r.renewalMonths).toBe(18);
    expect(r.documents.map((d) => d.key)).toContain("doc.incomeProof");
    expect(r.amiLimit).toBe(129_600);
  });

  it("4. No benefits, income above AMI → not likely eligible, with next steps", () => {
    const r = screen(base({ income: { kind: "exact", amount: 150_000 } }));
    expect(r.pathway).toBe("NOT_ELIGIBLE");
    const steps = r.nextSteps.map((s) => s.key);
    expect(steps).toContain("next.heap");
    expect(steps).toContain("next.paymentPlan");
    expect(steps).toContain("next.recheckBenefits");
  });

  it("5. Several members with different benefits → best pathway, explained", () => {
    const r = screen(
      base({
        members: [
          self({ benefits: ["MEDICAID"] }),
          self({ id: "m2", relationship: "parent", ageBand: "60plus", benefits: ["SSI"], isBillHolder: false }),
          self({ id: "m3", relationship: "child", ageBand: "under18", benefits: ["SNAP"], isBillHolder: false }),
        ],
        income: { kind: "exact", amount: 40_000 },
      }),
    );
    expect(r.pathway).toBe("EAP");
    expect(r.householdLink).toBe(false); // the bill holder has Medicaid herself
    expect(r.qualifyingMembers).toEqual(["m1", "m2", "m3"]);
    expect(r.bestBenefit).toBe("SSI");
    const keys = r.why.map((w) => w.key);
    expect(keys).toContain("why.multipleBenefits");
    expect(keys).toContain("why.eapBetterThanEeap");
  });

  it("6. Unknown income and no benefits → asks a follow-up instead of guessing", () => {
    const r = screen(base({ householdSize: 3, members: [self()] }));
    expect(r.pathway).toBe("NEEDS_INFO");
    expect(r.followUp?.key).toBe("followUp.income");
    expect(r.followUp?.params?.limit).toBe(145_800);
    expect(r.monthlyDiscount).toBeUndefined();
  });
});

describe("edge cases", () => {
  it("unknown income does not matter when someone has a benefit", () => {
    const r = screen(base({ members: [self({ benefits: ["SNAP"] })] }));
    expect(r.pathway).toBe("EAP");
    expect(r.backupPathway).toBeUndefined();
  });

  it("HEAP recipient who is NOT the bill holder is not auto-enrolled", () => {
    const r = screen(base({ members: [self(), self({ id: "m2", relationship: "grandparent", benefits: ["HEAP"], isBillHolder: false })] }));
    expect(r.householdLink).toBe(true);
    expect(r.enrollment).toBe("MUST_APPLY");
    expect(r.why.map((w) => w.key)).toContain("why.autoFailsLink");
  });

  it("utilities included in rent → not a direct customer", () => {
    expect(screen(base({ billSituation: "landlord" })).pathway).toBe("NOT_CUSTOMER");
  });

  it("HRA direct vendor → Tier 4", () => {
    const r = screen(base({ members: [self({ benefits: ["HRA_UTILITY_PAY"] })], heatType: "gas_heat" }));
    expect(r.tier).toBe(4);
    expect(r.monthlyDiscount?.low).toBeCloseTo(71.29 + 187.65);
  });

  it("income tiers use inclusive upper bounds", () => {
    expect(incomeTierFromAmount(68_040, 1)).toBe("under60");
    expect(incomeTierFromAmount(68_041, 1)).toBe("60to80");
    expect(incomeTierFromAmount(113_400, 1)).toBe("80to100");
    expect(incomeTierFromAmount(113_401, 1)).toBe("over100");
  });

  it("EEAP tier 7 discount is $1 per service", () => {
    const r = screen(base({ income: { kind: "exact", amount: 100_000 } }));
    expect(r.tier).toBe(7);
    expect(r.monthlyDiscount).toEqual({ low: 1, high: 1 });
  });

  it("AMI limit extends past 8 people", () => {
    expect(amiLimitFor(8)).toBe(213_900);
    expect(amiLimitFor(9)).toBe(213_900 + 12_960);
  });

  it("unknown heat type gives a range", () => {
    expect(monthlyDiscountFor(1, "unknown")).toEqual({ low: 33.47, high: 168.71 });
  });

  it("addMonths handles month ends", () => {
    expect(addMonths(new Date("2026-08-31T00:00:00Z"), 18).toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("senior persona qualifies via income", () => {
    const r = screen(PERSONAS.senior.input);
    expect(r.pathway).toBe("EEAP");
    expect(r.tier).toBe(5);
  });

  it("Harlem SNAP family is EAP, no link, must apply", () => {
    const r = screen(PERSONAS.harlem.input);
    expect(r.pathway).toBe("EAP");
    expect(r.householdLink).toBe(false);
    expect(r.enrollment).toBe("MUST_APPLY");
  });
});
