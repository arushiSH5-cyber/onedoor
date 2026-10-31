import { describe, expect, it } from "vitest";
import { parseWithRules, parsedToForm, sanitizeParsed } from "@/lib/screener/parse";
import { toScreenerInput } from "@/lib/screener/form";
import { screen } from "@/lib/rules/engine";

describe("rule-based parser", () => {
  it("reads Rosa's story", () => {
    const p = parseWithRules("I live in the Bronx with my mom. The Con Ed bill is in my name. My mom gets SSI. I make about $52,000 a year.");
    expect(p.borough).toBe("bronx");
    expect(p.bill).toBe("me");
    expect(p.people[0].benefits).toEqual([]);
    expect(p.people[1]).toMatchObject({ relationship: "parent", benefits: ["SSI"] });
    expect(p.annualIncome).toBe(52_000);
    // End to end: the rules engine flags the Household Link.
    const r = screen({ ...toScreenerInput(parsedToForm(p)), heatType: "electric_only" });
    expect(r.householdLink).toBe(true);
  });

  it("reads a self benefit, family size and monthly income", () => {
    const p = parseWithRules("Family of 4 in Harlem 10027. I get SNAP and Medicaid. We make 3,000 a month. Gas heat.");
    expect(p.borough).toBe("manhattan");
    expect(p.zip).toBe("10027");
    expect(p.people[0].benefits).toEqual(["SNAP", "MEDICAID"]);
    expect(p.householdSize).toBe(4);
    expect(p.annualIncome).toBe(36_000);
    expect(p.heatType).toBe("gas_heat");
  });

  it("detects utilities included in rent", () => {
    expect(parseWithRules("Electric is included in rent, I live in Queens").bill).toBe("landlord");
  });

  it("sanitizes untrusted LLM output", () => {
    const p = sanitizeParsed({ borough: "mars", people: [{ relationship: "self", benefits: ["SSI", "BITCOIN"] }], householdSize: 99 });
    expect(p.borough).toBeUndefined();
    expect(p.people[0].benefits).toEqual(["SSI"]);
    expect(p.householdSize).toBeUndefined();
  });
});
