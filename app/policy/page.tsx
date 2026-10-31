import type { Metadata } from "next";
import Link from "next/link";
import { PlaybookBuilder } from "@/components/policy/PlaybookBuilder";

export const metadata: Metadata = { title: "Enrollment design & legal pathway — OneDoor" };

const FLOW = [
  {
    title: "Agencies that already know",
    items: ["OTDA / HRA — SNAP, TANF, Safety Net, HEAP, state SSI supplement", "DOH — Medicaid", "NYCHA / HUD — public housing", "VA, SSA — via consent"],
  },
  {
    title: "Neutral matching hub",
    items: ["Designated by DPS", "Key = normalized, hashed service address (+ unit)", "Household composition, not account-holder name", "OneDoor consent records unlock programs that need consent"],
    accent: true,
  },
  {
    title: "Utility service accounts",
    items: ["Con Edison / National Grid residential accounts at that address", "Account holder may be anyone in the home"],
  },
  {
    title: "Auto-enroll & renew",
    items: ["EAP tier applied to the bill", "Household notified by text in its language", "Re-matched on a schedule — no 18-month paperwork", "Opt-out any time with the reference code"],
  },
];

const LEGAL = [
  {
    h: "Regulator authority (exists today)",
    b: "The NY Public Service Commission runs the Energy Affordability Program under Case 14-M-0565. Its July 17, 2025 order expanded the policy (target: energy bills ≤ 6% of income), and eligibility now reaches households below median income (Jan 13, 2026). The PSC already requires utilities to identify and enroll income-eligible households and to auto-enroll participants in budget billing [12]. A follow-on order can direct utilities to accept address-level matches from a DPS-designated hub.",
  },
  {
    h: "Data that already flows",
    b: "HEAP, TANF and Safety Net recipients are auto-enrolled when the agency notifies the utility [1]. That proves a lawful channel exists for OTDA/HRA programs; OneDoor changes the match key from the account holder's name to the service address.",
  },
  {
    h: "Programs that need consent or an agreement",
    b: "Medicaid (federal rules limit disclosure to purposes directly connected with plan administration), SNAP (federal rules restrict disclosure of applicant information), SSI and VA benefits (federal records) need either a data-sharing agreement that fits those rules or the household's written consent. OneDoor's consent-to-match collects that consent at the moment of help, by web or text, and can be added as an opt-in on ACCESS HRA and NY State of Health applications.",
  },
  {
    h: "Privacy safeguards",
    b: "Minimum data (address, program flag, date) · hashed match keys · purpose limitation (energy discounts only) · consent withdrawal by code or 311 · retention limits · no names in analytics · annual published match-rate audit. Align with the NY SHIELD Act's security requirements and each program's confidentiality rules.",
  },
  {
    h: "Long-term: put it in statute",
    b: "Brazil's Law 14,203/2021 and Great Britain's Warm Home Discount regulations both write automatic data matching into law. A New York statute (or PSC rule) could do the same: 'utilities shall enroll every service address matched to a qualifying benefit record'.",
  },
];

const OUTREACH = [
  ["Who", "Community boards, tenant & NYCHA resident associations, libraries, CBOs with language capacity, SNAP/Medicaid enrollers. The gap map ranks areas and suggests messengers for each."],
  ["What they carry", "A 1-page flyer and a QR code in 7 languages: “Text ONEDOOR to [number]”. Messengers can run the 5-minute check with people on the spot."],
  ["Where", "Start with the top-priority areas on the map (e.g. Flushing, Fordham, Soundview, Mott Haven, Jamaica) and the places people already go: benefits offices, pharmacies, laundromats, houses of worship."],
  ["When", "Before winter heating season and summer heat waves, and at every benefit recertification."],
  ["How it sticks", "Consent-to-match means enrollment stays high after outreach ends: renewal runs on data, not on a second campaign."],
  ["Measure", "The live dashboard tracks screenings by language, channel and borough, Household Link matches and consent rate."],
];

const COMPARE = [
  ["Data source", "Agency notifications (HEAP, TANF, Safety Net) + self-application", "DWP benefit records + property data (Valuation Office)", "CadÚnico social registry + BPC records", "Any benefit record at the address, plus consent records"],
  ["Match key", "Account-holder identity", "Benefit claimant ↔ supplier account / property", "Family members' CPF/NIS ↔ distributor accounts", "Normalized service address (household)"],
  ["Legal mechanism", "PSC orders, Case 14-M-0565", "WHD (England & Wales) Regulations 2022; Digital Economy Act 2017 ss.35–37; 2011 WHD disclosure regs", "Law 14,203/2021 + ANEEL rules (Nov 2021)", "PSC order + data-sharing agreements + consent-to-match; statute later"],
  ["Automatic?", "Partly — only 3 programs", "≈96% paid automatically [8]", "Yes; credited with an 80% rise in beneficiaries [9][10]", "Near-automatic after one consent"],
  ["Bill holder ≠ recipient", "Missed", "Partly addressed via property data", "Missed when account is in another name [10]", "Household Link: caught"],
];

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <p className="eyebrow">Deliverables: enrollment design · legal pathway · outreach plan · replication playbook</p>
      <h1 className="h1">From “please apply” to “you&apos;re already in”</h1>
      <p className="mt-2 max-w-3xl text-muted">
        New York already holds the records that prove most households qualify. OneDoor connects them to the bill by matching homes, not names —
        with consent where the law requires it.
      </p>
      <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-100 p-3 text-sm text-teal-900">
        <strong>Not legal advice.</strong> This is a prototype analysis to be validated by counsel for DPS, OTDA/HRA, DOH and the utility.
      </p>

      <section className="mt-10">
        <h2 className="h2">The OneDoor auto-enrollment design</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-4" role="list" aria-label="Enrollment flow">
          {FLOW.map((f, i) => (
            <div key={f.title} className="relative" role="listitem">
              <div className={`card h-full ${f.accent ? "border-2 border-amber-500 bg-amber-100/40" : ""}`}>
                <p className="font-mono text-xs font-bold text-amber-500">STEP {i + 1}</p>
                <p className="font-display text-lg font-semibold text-teal-900">{f.title}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {f.items.map((it) => (
                    <li key={it}>• {it}</li>
                  ))}
                </ul>
              </div>
              {i < FLOW.length - 1 && (
                <span aria-hidden="true" className="absolute top-1/2 -right-3 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-teal-800 text-sm text-white lg:flex">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="card text-sm"><p className="font-semibold text-teal-900">Why address, not name</p><p className="text-muted">Rosa&apos;s mother&apos;s SSI record and Rosa&apos;s Con Ed account share one thing: the apartment. Matching the home fixes root cause #5.</p></div>
          <div className="card text-sm"><p className="font-semibold text-teal-900">What the consent covers</p><p className="text-muted">Service address match · listed benefit programs · purpose limited to energy discounts · withdraw anytime. <Link href="/check?demo=rosa" className="underline">See it in the screener</Link>.</p></div>
          <div className="card text-sm"><p className="font-semibold text-teal-900">Fallback for everyone else</p><p className="text-muted">Households not found in any record use the 5-minute screener or SMS to route to the Enhanced EAP with a document checklist.</p></div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="h2">Legal pathway</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LEGAL.map((l) => (
            <div key={l.h} className="card">
              <h3 className="font-semibold text-teal-900">{l.h}</h3>
              <p className="mt-1 text-sm text-muted">{l.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="h2">Multilingual outreach plan, built on trusted messengers</h2>
        <div className="card mt-4">
          <dl className="grid gap-4 md:grid-cols-2">
            {OUTREACH.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold text-teal-900">{k}</dt>
                <dd className="text-sm text-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm">
            Languages: English, Español, 中文, বাংলা, Русский, Kreyòl Ayisyen, 한국어 — covering NYC&apos;s largest language groups.{" "}
            <Link href="/map" className="font-semibold text-teal-800 underline">Open the gap map →</Link>
          </p>
        </div>
      </section>

      <section className="mt-12" id="playbook">
        <h2 className="h2">Replication playbook</h2>
        <p className="mt-1 text-muted">What another utility, state or country needs: a registry, a shared key, a legal mandate and a data-sharing gateway.</p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-line">
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3">NYC today</th>
                <th className="py-2 pr-3">Great Britain</th>
                <th className="py-2 pr-3">Brazil</th>
                <th className="bg-amber-100/60 px-2 py-2">NYC with OneDoor</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row[0]} className="border-b border-line align-top">
                  <th className="py-2 pr-3 font-semibold text-teal-900">{row[0]}</th>
                  {row.slice(1).map((c, i) => (
                    <td key={i} className={`py-2 pr-3 text-muted ${i === 3 ? "bg-amber-100/60 px-2 text-ink" : ""}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-8 mb-3 text-lg font-semibold text-teal-900">Build a playbook for your jurisdiction</h3>
        <PlaybookBuilder />
      </section>
    </div>
  );
}
