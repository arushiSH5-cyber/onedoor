import { NextResponse } from "next/server";
import { sendTwilioSms, toE164, twilioConfigured } from "@/lib/server/twilio";

export async function POST(req: Request) {
  const { phone, body } = (await req.json().catch(() => ({}))) as { phone?: string; body?: string };
  const to = toE164(phone ?? "");
  if (!to || !body) return NextResponse.json({ error: "A 10-digit US number is required." }, { status: 400 });
  const text = `OneDoor\n${body.slice(0, 1200)}`;
  if (!twilioConfigured()) return NextResponse.json({ status: "simulated", body: text });
  try {
    await sendTwilioSms(to, text);
    return NextResponse.json({ status: "sent", body: text });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
