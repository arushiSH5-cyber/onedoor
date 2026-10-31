import { processSms, sessionKey } from "@/lib/server/sms-session";
import { twiml } from "@/lib/server/twilio";

/**
 * Twilio inbound-SMS webhook. Point your Twilio number's "A message comes in" URL to
 *   https://<your-app>/api/sms/twilio   (HTTP POST)
 * The phone number is only used as a hashed session key; it is never stored in plain text.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "");
  if (!from) return new Response("Bad request", { status: 400 });
  const out = await processSms(sessionKey(`tw:${from}`), body.slice(0, 300));
  return new Response(twiml(out.replies.join("\n\n")), { headers: { "content-type": "text/xml" } });
}
