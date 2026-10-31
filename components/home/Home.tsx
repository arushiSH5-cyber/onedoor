"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { Cite } from "@/components/Cite";

const STATS = [
  { value: "496,007", label: "residential customers were 60+ days behind, owing $948 million", refs: [6] },
  { value: "775", label: "of nearly 600,000 potentially eligible customers enrolled in the income pathway in its first month", refs: [4] },
  { value: "190,410+", label: "households had their service shut off in 2025", refs: [7] },
  { value: "1 in 3", label: "NYC households now qualifies for a discount — anyone below area median income since Jan 13, 2026", refs: [2, 3] },
];

const DIFFERENTIATORS = [
  {
    n: "01",
    title: "One door, two programs",
    body: "A single 5-minute screener routes each household to the benefits-based EAP or the income-based Enhanced EAP — and explains why, in plain language.",
    href: "/check",
  },
  {
    n: "02",
    title: "Household Link",
    body: "We ask about everyone in the home, not just the account holder. If Rosa's mother gets SSI, Rosa's bill qualifies — and we flag it, because today's name matching misses it.",
    href: "/check",
    accent: true,
  },
  {
    n: "03",
    title: "Consent-to-match",
    body: "One checkbox lets the state match the home's service address — not a name — against benefit records it already holds, then enroll and renew automatically.",
    href: "/policy",
  },
  {
    n: "04",
    title: "Ratepayer ledger",
    body: "Every discount dollar is shown next to what it saves in arrears, write-offs and shutoffs, with every assumption editable and sourced.",
    href: "/impact",
  },
  {
    n: "05",
    title: "Replication playbook",
    body: "The data source and legal mechanism NYC, the UK (≈96% paid automatically) and Brazil (Law 14,203/2021) use — and a checklist for any other place.",
    href: "/policy#playbook",
  },
];

export function Home() {
  const { t } = useLang();
  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-teal-900 text-white">
        <div aria-hidden="true" className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-amber-400 uppercase">Global Energy Hackathon 2026 · Brief 11</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold sm:text-5xl" data-testid="home-headline">
              {t("home.headline")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-teal-100">{t("home.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/check" className="btn-accent text-lg">
                {t("home.ctaCheck")} →
              </Link>
              <Link href="/sms" className="btn border border-white/30 text-white hover:bg-white/10">
                {t("home.ctaSms")}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/map" className="font-semibold text-teal-100 underline-offset-4 hover:underline">
                {t("home.ctaMap")} →
              </Link>
              <Link href="/impact" className="font-semibold text-teal-100 underline-offset-4 hover:underline">
                {t("home.ctaImpact")} →
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-paper p-6 text-ink shadow-2xl">
            <p className="eyebrow">Meet Rosa</p>
            <p className="mt-2">
              A home health aide in the Bronx. Her mother gets <strong>SSI</strong>, but the bill is in <strong>Rosa&apos;s</strong> name — so no agency
              ever flagged the household. She has a past-due notice on the counter.
            </p>
            <div className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-100/60 p-3">
              <p className="font-display font-semibold text-teal-900">🔗 Household Link match</p>
              <p className="text-sm">OneDoor finds her in under a minute: EAP via her mother&apos;s SSI, plus the documents she needs.</p>
            </div>
            <Link href="/check?demo=rosa" className="btn-primary mt-4 w-full">
              Try Rosa&apos;s check
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.value} className="card">
              <p className="font-display text-4xl font-semibold text-teal-900">{s.value}</p>
              <p className="mt-2 text-sm text-muted">
                {s.label} <Cite n={s.refs} />
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          New York already knows which households qualify. The systems holding that knowledge don&apos;t talk to the utility bill. <Cite n={[1, 3]} />
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="h1 max-w-2xl">Not another eligibility checker. A door that opens from both sides.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((d) => (
            <Link
              key={d.n}
              href={d.href}
              className={`card group transition-shadow hover:shadow-lg ${d.accent ? "border-2 border-amber-500 md:col-span-2 lg:col-span-1" : ""}`}
            >
              <p className="font-mono text-sm font-bold text-amber-500">{d.n}</p>
              <h3 className="mt-1 font-display text-xl font-semibold text-teal-900 group-hover:underline">{d.title}</h3>
              <p className="mt-2 text-muted">{d.body}</p>
            </Link>
          ))}
          <div className="card flex flex-col justify-between bg-teal-50">
            <div>
              <h3 className="font-display text-xl font-semibold text-teal-900">Built for the brief&apos;s constraints</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                <li>✓ Consent where required; no names stored</li>
                <li>✓ Works for renters and bills in someone else&apos;s name</li>
                <li>✓ 7 languages, web and plain SMS</li>
                <li>✓ Shows the cost to other ratepayers</li>
                <li>✓ Names the data source and legal mechanism to copy it</li>
              </ul>
            </div>
            <Link href="/methods" className="mt-4 text-sm font-semibold text-teal-800 underline">
              Data &amp; sources →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="card grid gap-6 md:grid-cols-4">
          {[
            ["1", "Screen", "5 minutes on the web, or 8 replies by text, in 7 languages."],
            ["2", "Route", "Deterministic rules pick EAP or Enhanced EAP. The AI never decides."],
            ["3", "Link", "Benefits anywhere in the home count. Mismatches get flagged."],
            ["4", "Consent & renew", "Address-level match enrolls and renews — no 18-month paperwork."],
          ].map(([n, h, b]) => (
            <div key={n}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-800 font-bold text-white">{n}</span>
              <p className="mt-3 font-semibold text-teal-900">{h}</p>
              <p className="text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
