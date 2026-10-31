import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { handleSms, type SmsState } from "@/lib/sms/flow";
import { anonymize } from "@/lib/screener/anonymize";
import { consentRef } from "./ref";

// Used when the database is unavailable (e.g. preview deploys without DATABASE_URL).
const memory = new Map<string, SmsState>();

export const sessionKey = (raw: string) => createHash("sha256").update(`onedoor:${raw}`).digest("hex").slice(0, 32);

async function load(id: string): Promise<SmsState | null> {
  try {
    const row = await prisma.smsSession.findUnique({ where: { id } });
    return row ? (JSON.parse(row.state) as SmsState) : null;
  } catch {
    return memory.get(id) ?? null;
  }
}

async function save(id: string, state: SmsState) {
  memory.set(id, state);
  try {
    await prisma.smsSession.upsert({ where: { id }, create: { id, state: JSON.stringify(state) }, update: { state: JSON.stringify(state) } });
  } catch {}
}

/** Run one inbound message through the flow, persist session + anonymized screening. */
export async function processSms(id: string, text: string, isDemo = false) {
  const prev = await load(id);
  const out = handleSms(prev, text, { makeRef: consentRef });
  if (out.completed) {
    try {
      const rec = anonymize(out.completed.input, { language: out.state.lang, inputMode: "sms", completionSecs: out.completed.secs, isDemo });
      const row = await prisma.screening.create({ data: rec });
      out.state.screeningId = row.id;
    } catch (e) {
      console.warn("[sms] screening not stored:", (e as Error).message);
    }
  }
  if (out.consented && out.state.screeningId && out.state.ref) {
    try {
      await prisma.screening.update({ where: { id: out.state.screeningId }, data: { consentGiven: true, consentRef: out.state.ref } });
    } catch {}
  }
  await save(id, out.state);
  return out;
}
