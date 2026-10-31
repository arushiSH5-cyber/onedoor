import type { Benefit, HeatType } from "@/lib/rules/config";
import type { AgeBand, Borough, IncomeTier, Member, Relationship, ScreenerInput } from "@/lib/rules/engine";

export type BillAnswer = "me" | "other" | "landlord" | "unknown";

/** UI form state. Converted to a ScreenerInput with toScreenerInput(). */
export type FormState = {
  borough?: Borough;
  zip: string;
  bill?: BillAnswer;
  heatType?: HeatType;
  /** members[0] is always the person filling in the form. */
  members: Member[];
  /** For bill === "other": id of the member the bill belongs to. */
  billHolderId?: string;
  householdSize: number;
  incomeMode: "tier" | "exact";
  incomeTier?: IncomeTier | "unknown";
  incomeExact: string;
};

let counter = 0;
export function newMemberId() {
  counter += 1;
  return `m${Date.now().toString(36)}${counter}`;
}

export function emptyForm(): FormState {
  return {
    zip: "",
    members: [{ id: "m1", relationship: "self", ageBand: "18to59", benefits: [], isBillHolder: false }],
    householdSize: 1,
    incomeMode: "tier",
    incomeExact: "",
  };
}

export function addMember(f: FormState, relationship: Relationship = "other_relative", ageBand: AgeBand = "18to59"): FormState {
  const members = [...f.members, { id: newMemberId(), relationship, ageBand, benefits: [] as Benefit[], isBillHolder: false }];
  return { ...f, members, householdSize: Math.max(f.householdSize, members.length) };
}

export function removeMember(f: FormState, id: string): FormState {
  if (id === f.members[0].id) return f;
  const members = f.members.filter((m) => m.id !== id);
  return {
    ...f,
    members,
    billHolderId: f.billHolderId === id ? undefined : f.billHolderId,
    householdSize: Math.max(members.length, f.householdSize - 1),
  };
}

export function toScreenerInput(f: FormState): ScreenerInput {
  const holderId = f.bill === "me" ? f.members[0].id : f.bill === "other" ? f.billHolderId : undefined;
  const members = f.members.map((m) => ({ ...m, isBillHolder: m.id === holderId }));
  const income: ScreenerInput["income"] =
    f.incomeMode === "exact" && f.incomeExact.trim() !== "" && Number.isFinite(Number(f.incomeExact.replace(/[,$\s]/g, "")))
      ? { kind: "exact", amount: Number(f.incomeExact.replace(/[,$\s]/g, "")) }
      : f.incomeMode === "tier" && f.incomeTier && f.incomeTier !== "unknown"
        ? { kind: "tier", tier: f.incomeTier }
        : { kind: "unknown" };
  return {
    borough: f.borough,
    zip: f.zip || undefined,
    billSituation: f.bill === "landlord" ? "landlord" : f.bill === "unknown" || !f.bill ? "unknown" : "in_household",
    members,
    householdSize: Math.max(f.householdSize, members.length),
    income,
    heatType: f.heatType ?? "unknown",
  };
}

/** Reverse of toScreenerInput, for demo personas and parsed free text. */
export function fromScreenerInput(input: ScreenerInput): FormState {
  const members = input.members.length
    ? input.members.map((m, i) => (i === 0 ? { ...m, relationship: "self" as const } : m))
    : emptyForm().members;
  const holder = members.find((m) => m.isBillHolder);
  const bill: BillAnswer | undefined =
    input.billSituation === "landlord" ? "landlord" : holder ? (holder.id === members[0].id ? "me" : "other") : undefined;
  return {
    borough: input.borough,
    zip: input.zip ?? "",
    bill,
    heatType: input.heatType === "unknown" ? undefined : input.heatType,
    members,
    billHolderId: holder?.id,
    householdSize: Math.max(input.householdSize ?? members.length, members.length),
    incomeMode: input.income.kind === "exact" ? "exact" : "tier",
    incomeTier: input.income.kind === "tier" ? input.income.tier : undefined,
    incomeExact: input.income.kind === "exact" ? String(input.income.amount) : "",
  };
}

export function householdHasBenefit(f: FormState) {
  return f.members.some((m) => m.benefits.length > 0);
}
