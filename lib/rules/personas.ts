import type { ScreenerInput } from "./engine";

/** Demo households. Rosa comes straight from Brief 11's mini case study; the others are illustrative. */
export const PERSONAS: Record<"rosa" | "harlem" | "senior", { label: string; input: ScreenerInput }> = {
  rosa: {
    label: "Rosa (Bronx)",
    input: {
      borough: "bronx",
      zip: "10453",
      billSituation: "in_household",
      members: [
        { id: "m1", relationship: "self", ageBand: "18to59", benefits: [], isBillHolder: true },
        { id: "m2", relationship: "parent", ageBand: "60plus", benefits: ["SSI"], isBillHolder: false },
      ],
      householdSize: 2,
      income: { kind: "exact", amount: 52_000 },
      heatType: "electric_only",
    },
  },
  harlem: {
    label: "SNAP family (Harlem)",
    input: {
      borough: "manhattan",
      zip: "10027",
      billSituation: "in_household",
      members: [
        { id: "m1", relationship: "self", ageBand: "18to59", benefits: ["SNAP", "MEDICAID"], isBillHolder: true },
        { id: "m2", relationship: "spouse", ageBand: "18to59", benefits: [], isBillHolder: false },
        { id: "m3", relationship: "child", ageBand: "under18", benefits: ["MEDICAID"], isBillHolder: false },
        { id: "m4", relationship: "child", ageBand: "under18", benefits: ["MEDICAID"], isBillHolder: false },
      ],
      householdSize: 4,
      income: { kind: "tier", tier: "under60" },
      heatType: "gas_heat",
    },
  },
  senior: {
    label: "Senior on a pension (Queens)",
    input: {
      borough: "queens",
      zip: "11372",
      billSituation: "in_household",
      members: [{ id: "m1", relationship: "self", ageBand: "60plus", benefits: [], isBillHolder: true }],
      householdSize: 1,
      // Too much for SSI/SNAP, but well under 60% of AMI for one person ($68,040).
      income: { kind: "exact", amount: 31_000 },
      heatType: "electric_only",
    },
  },
};
