import { describe, expect, it } from "vitest";
import { computeImpact, DEFAULTS } from "@/lib/impact/model";

describe("impact model", () => {
  const r = computeImpact(DEFAULTS);

  it("computes discount dollars", () => {
    expect(r.discountDollars).toBe(100_000 * 42 * 12);
  });

  it("computes arrears and terminations", () => {
    expect(r.arrearsReduced).toBeCloseTo(100_000 * 0.25 * 1_911 * 0.2);
    expect(r.terminationsAvoided).toBeCloseTo(100_000 * 0.063 * 0.25);
  });

  it("net cost per payer = (cost - offsets) / non-participants / 12", () => {
    const payers = 3_000_000 - 500_000 - 100_000;
    expect(r.netPerPayerMonth).toBeCloseTo((r.grossCost - r.offsets) / payers / 12);
    expect(r.netCost).toBeLessThan(r.grossCost);
  });

  it("break-even arrears reduction makes offsets equal cost", () => {
    const at = computeImpact({ ...DEFAULTS, arrearsReduction: r.breakEvenArrearsReduction });
    expect(at.offsets).toBeCloseTo(at.grossCost, 0);
  });

  it("zero households → zero cost", () => {
    const z = computeImpact({ ...DEFAULTS, additionalHouseholds: 0 });
    expect(z.grossCost).toBe(0);
    expect(z.selfFundingMonthlyDiscount).toBe(0);
  });
});
