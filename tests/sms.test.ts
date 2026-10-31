import { describe, expect, it } from "vitest";
import { handleSms, type SmsState } from "@/lib/sms/flow";

function run(messages: string[]) {
  let state: SmsState | null = null;
  const outs = [];
  let t = 0;
  for (const m of messages) {
    const o = handleSms(state, m, { now: (t += 10_000), makeRef: () => "OD-TEST-0001" });
    state = o.state;
    outs.push(o);
  }
  return { state: state!, outs };
}

describe("SMS flow", () => {
  it("Rosa by text: Household Link + consent", () => {
    // ONEDOOR, English, Bronx, bill mine, 2 people, SSI, benefit holder is NOT bill holder, heat in rent, YES
    const { state, outs } = run(["ONEDOOR", "1", "1", "1", "2", "3", "2", "3", "YES"]);
    const done = outs.find((o) => o.completed)!;
    expect(done.completed!.result.pathway).toBe("EAP");
    expect(done.completed!.result.householdLink).toBe(true);
    expect(done.replies[0]).toContain("HOUSEHOLD LINK");
    expect(outs.at(-1)!.consented).toBe(true);
    expect(state.ref).toBe("OD-TEST-0001");
  });

  it("works in Spanish and rejects bad input", () => {
    const { outs } = run(["onedoor", "2", "9"]);
    expect(outs[1].replies[0]).toContain("condado");
    expect(outs[2].replies[0]).toContain("Perdón");
  });

  it("income path when no benefits", () => {
    const { outs } = run(["ONEDOOR", "1", "4", "1", "1", "0", "1", "3"]);
    const done = outs.find((o) => o.completed)!;
    expect(done.completed!.result.pathway).toBe("EEAP");
  });

  it("landlord ends early", () => {
    const { outs } = run(["ONEDOOR", "1", "2", "3"]);
    expect(outs.at(-1)!.completed!.result.pathway).toBe("NOT_CUSTOMER");
  });
});
