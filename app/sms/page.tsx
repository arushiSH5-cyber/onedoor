import type { Metadata } from "next";
import Link from "next/link";
import { PhoneSimulator } from "@/components/sms/PhoneSimulator";
import { twilioConfigured } from "@/lib/server/twilio";

export const metadata: Metadata = { title: "OneDoor by text — SMS simulator" };
export const dynamic = "force-dynamic";

export default function SmsPage() {
  const live = twilioConfigured();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="eyebrow">Works on a basic phone</p>
        <h1 className="h1">No smartphone, no app, no data plan.</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          Text <strong className="text-ink">ONEDOOR</strong> and answer with numbers. The same rules engine runs the same screener in 7 languages, and
          ends with the same result, Household Link check and consent reference code as the web version.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            ["8 short questions", "Language → borough → whose bill → household size → benefits (anyone in the home) → who receives them → income or heat → result."],
            ["Household Link by text", "“Is the person who gets that benefit the bill holder?” is one question that catches the Rosa case."],
            ["Consent by reply", "Reply YES to let the state match your service address. You get a reference code you can quote on the phone."],
            ["Private by design", "The phone number is only used as a one-way hashed session key. Screenings are stored anonymized like web ones (channel = SMS)."],
          ].map(([h, b]) => (
            <li key={h} className="card py-4">
              <p className="font-semibold text-teal-900">{h}</p>
              <p className="text-sm text-muted">{b}</p>
            </li>
          ))}
        </ul>
        <div className={`mt-6 rounded-xl p-4 text-sm ${live ? "bg-leaf-100 text-leaf-700" : "bg-teal-50 text-teal-900"}`}>
          {live ? (
            <p><strong>Live SMS is on.</strong> Twilio is configured — text ONEDOOR to this deployment&apos;s number.</p>
          ) : (
            <p>
              <strong>Simulator mode.</strong> Real SMS turns on when <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> and{" "}
              <code>TWILIO_PHONE_NUMBER</code> are set and the number&apos;s webhook points to <code>/api/sms/twilio</code>. See the README.
            </p>
          )}
        </div>
        <p className="mt-4 text-sm text-muted">
          Prefer the web? <Link href="/check" className="underline">Use the 5-minute screener</Link>.
        </p>
      </div>
      <PhoneSimulator />
    </div>
  );
}
