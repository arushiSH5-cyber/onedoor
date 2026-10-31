import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consentRef } from "@/lib/server/ref";

/**
 * Records consent-to-match and returns a reference code plus the record the
 * state would receive. Prototype: nothing is sent to any agency.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { screeningId?: string; language?: string };
  const ref = consentRef();
  const now = new Date();
  const record = {
    ref,
    givenAt: now.toISOString(),
    matchKey: "service address (normalized, hashed) — not account-holder name",
    sources: ["SNAP", "Medicaid", "SSI", "HEAP", "TANF / Safety Net", "NYCHA / Federal Public Housing", "VA pension"],
    purpose: "Enroll this service address in the Energy Affordability Program and renew it automatically",
    retention: "Until withdrawn, or 36 months without a successful match",
    withdraw: "Text STOP with this code, or call 311",
    language: body.language ?? "en",
  };
  let stored = false;
  if (body.screeningId) {
    try {
      await prisma.screening.update({ where: { id: body.screeningId }, data: { consentGiven: true, consentRef: ref } });
      stored = true;
    } catch (e) {
      console.warn("[consent] not stored:", (e as Error).message);
    }
  }
  return NextResponse.json({ ref, stored, record });
}
