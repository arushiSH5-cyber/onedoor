import { NextResponse } from "next/server";
import { processSms, sessionKey } from "@/lib/server/sms-session";

export async function POST(req: Request) {
  const { sessionId, text } = (await req.json().catch(() => ({}))) as { sessionId?: string; text?: string };
  if (!sessionId || typeof text !== "string") return NextResponse.json({ error: "sessionId and text required" }, { status: 400 });
  const out = await processSms(sessionKey(`sim:${sessionId}`), text.slice(0, 300));
  return NextResponse.json({ replies: out.replies, step: out.state.step, lang: out.state.lang, ref: out.state.ref ?? null });
}
