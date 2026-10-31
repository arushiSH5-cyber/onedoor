import type { Metadata } from "next";
import { TranslatePage } from "@/components/TranslatePage";
import { ALL_RULES, LAST_VERIFIED } from "@/lib/rules/config";
import { ASSUMPTIONS } from "@/lib/impact/model";
import { REFS } from "@/lib/content/references";
import { gapModel } from "@/lib/map/data";
import { LLM_MODEL } from "@/lib/server/llm";

export const metadata: Metadata = { title: "Data & sources — OneDoor" };

const DATASETS = [
  ["Program rules & discounts", "NY DPS EAP page; Con Edison EAP/Enhanced EAP page; NY EEAP FAQ", "Rules engine (lib/rules/config.ts)", "Real, verified " + LAST_VERIFIED],
  ["Income & household size by area", gapModel.sources.acs, "Gap map", "Real"],
  ["Language spoken at home", gapModel.sources.acs + " — table C16001", "Gap map: top languages", "Real"],
  ["Renter share", gapModel.sources.acs + " — table B25003", "Gap map, priority score", "Real"],
  ["SNAP households", gapModel.sources.acs + " — table B22003", "Allocating enrollment to areas", "Real"],
  ["Energy cost burden", gapModel.sources.acs + " — B25132/B25133 ÷ B19013", "Gap map (proxy for DOE LEAD Tool)", "Real inputs, derived proxy"],
  ["Area boundaries", gapModel.sources.geometry, "Gap map", "Real"],
  ["Enrollment, arrears, terminations", "Brief 11 references [1][3][4][6][7]", "Gap model, impact defaults, landing stats", "Real (cited)"],
  ["Eligible-but-unenrolled by area", "OneDoor model (below)", "Gap map", "MODEL ESTIMATE"],
  ["Impact assumptions", "See table below", "Ratepayer ledger", "Mix: brief, derived, assumption"],
  ["Dashboard demo seed", "scripts/seed.ts (synthetic)", "Dashboard when 'Demo seed: on'", "SYNTHETIC — labeled"],
  ["Live screenings", "This app's anonymized database", "Dashboard", "Real usage"],
];

function fmtRule(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object" && v !== null) {
    return Object.entries(v)
      .map(([k, x]) => `${k}: ${typeof x === "object" ? Object.entries(x as object).map(([a, b]) => `${a} ${b}`).join(" / ") : x}`)
      .join(" · ");
  }
  return String(v);
}

export default function MethodsPage() {
  const a = gapModel.assumptions;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <TranslatePage />
      <p className="eyebrow">Every dataset, formula and assumption</p>
      <h1 className="h1">Data &amp; sources</h1>

      <nav className="card mt-6 text-sm" aria-label="On this page">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 font-semibold text-teal-800">
          {[["#datasets", "Datasets"], ["#rules", "Eligibility rules"], ["#gap-model", "Gap estimate"], ["#impact-model", "Impact model"], ["#ai", "How AI is used"], ["#privacy", "Privacy"], ["#limits", "Limitations"], ["#refs", "References"]].map(([h, l]) => (
            <li key={h}><a href={h} className="hover:underline">{l}</a></li>
          ))}
        </ul>
      </nav>

      <section id="datasets" className="mt-10 scroll-mt-20">
        <h2 className="h2">Datasets — real vs. estimated</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="border-b-2 border-line"><th className="py-2 pr-3">Data</th><th className="pr-3">Source</th><th className="pr-3">Used for</th><th>Status</th></tr></thead>
            <tbody>
              {DATASETS.map((d) => (
                <tr key={d[0]} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{d[0]}</td>
                  <td className="py-2 pr-3 text-muted">{d[1]}</td>
                  <td className="py-2 pr-3 text-muted">{d[2]}</td>
                  <td className="py-2"><span className={`badge text-xs ${/MODEL|SYNTH|assumption/.test(d[3]) ? "bg-amber-100 text-teal-900" : "bg-leaf-100 text-leaf-700"}`}>{d[3]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="rules" className="mt-10 scroll-mt-20">
        <h2 className="h2">Eligibility rules (deterministic)</h2>
        <p className="mt-2 text-muted">
          All rules live in one file, <code>lib/rules/config.ts</code>, and are applied by pure, unit-tested functions in <code>lib/rules/engine.ts</code>.
          Order of decisions: (1) electricity included in rent → not a direct customer; (2) anyone in the home receives a qualifying benefit → EAP
          (benefits pathway; Household Link if that person is not the bill holder); auto-enrollment is “likely” only when an auto-shared benefit
          (HEAP, TANF/Safety Net, HRA direct payment) belongs to the bill holder; (3) otherwise income vs. AMI for household size → Enhanced EAP Tier
          5/6/7 or not eligible; (4) unknown income → ask a follow-up instead of guessing.
        </p>
        <div className="mt-4 space-y-3">
          {Object.entries(ALL_RULES).map(([k, r]) => (
            <div key={k} className="card text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="font-semibold text-teal-900">{k}</code>
                <span className={`badge text-xs ${r.verified ? "bg-leaf-100 text-leaf-700" : "bg-amber-100 text-teal-900"}`}>
                  {r.verified ? `verified ${r.lastVerified}` : "estimate — unverified"}
                </span>
              </div>
              <p className="mt-2 break-words">{fmtRule(r.value)}</p>
              {r.note && <p className="mt-1 text-muted">{r.note}</p>}
              <a href={r.source} target="_blank" rel="noreferrer" className="mt-1 inline-block text-teal-800 underline">{r.sourceLabel}</a>
            </div>
          ))}
        </div>
      </section>

      <section id="gap-model" className="mt-10 scroll-mt-20">
        <h2 className="h2">How we estimate eligible-but-unenrolled households</h2>
        <ol className="card mt-4 list-decimal space-y-2 pl-8 text-sm">
          <li>For each of NYC&apos;s 55 PUMAs (≈ community districts), take the ACS household income distribution (B19001, 16 brackets).</li>
          <li>Look up the AMI income limit for the area&apos;s average household size (B25010), interpolating between the official 1–8 person limits.</li>
          <li>Count households below that limit, assuming incomes are spread evenly inside the bracket that contains the limit. This gives the raw count ({a.rawEligibleAcs.toLocaleString()} citywide).</li>
          <li>Calibrate: not every household is a direct Con Edison customer (e.g. electricity included in rent, master-metered buildings). We scale every area by {a.calibration} so the city total equals the utility&apos;s own count — ≈500,000 enrolled + ≈600,000 potentially eligible, × NYC&apos;s {Math.round(a.nycShareOfConEd * 100)}% share of Con Edison households = {a.officialEligibleNyc.toLocaleString()}.</li>
          <li>Allocate known enrollment: {a.enrolledEapNyc.toLocaleString()} EAP households in proportion to each area&apos;s SNAP households (B22003), and {a.enrolledEeapNyc.toLocaleString()} Enhanced EAP applicants in proportion to eligible non-SNAP households.</li>
          <li>Gap = eligible − allocated enrolled (never below 0). Citywide gap: <strong>{gapModel.totals.gap.toLocaleString()}</strong>.</li>
          <li>{a.priority}</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          Re-run with <code>node scripts/fetch-data.mjs</code>. A partner dataset of anonymized account-level enrollment by ZIP from the utility would
          replace steps 4–5 with observed numbers.
        </p>
      </section>

      <section id="impact-model" className="mt-10 scroll-mt-20">
        <h2 className="h2">Impact model (ratepayer ledger)</h2>
        <div className="card mt-4 space-y-1 font-mono text-xs sm:text-sm">
          <p>discount $ = H × monthly discount × 12</p>
          <p>arrears reduced = H × share in arrears × avg arrears × arrears reduction</p>
          <p>offsets = arrears reduced × write-off rate + H × share in arrears × arrears reduction × collection cost + terminations avoided × cost per termination</p>
          <p>terminations avoided = H × termination rate × termination reduction</p>
          <p>net cost per other ratepayer / month = (discount $ + admin − offsets) ÷ (ratepayers − existing participants − H) ÷ 12</p>
          <p>break-even arrears reduction = (discount $ + admin − termination savings) ÷ (H × share in arrears × (avg arrears × write-off rate + collection cost))</p>
        </div>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b-2 border-line"><th className="py-2 pr-3">Input</th><th className="pr-3">Default</th><th className="pr-3">Type</th><th>Source</th></tr></thead>
            <tbody>
              {ASSUMPTIONS.map((x) => (
                <tr key={x.key} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{x.label}</td>
                  <td className="py-2 pr-3 tabular-nums">{x.unit === "pct" ? `${+(x.value * 100).toFixed(1)}%` : x.unit === "usd" ? `$${x.value.toLocaleString()}` : x.value.toLocaleString()}</td>
                  <td className="py-2 pr-3">{x.kind}</td>
                  <td className="py-2 text-muted">{x.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="ai" className="mt-10 scroll-mt-20">
        <h2 className="h2">How AI is used — and not used</h2>
        <ul className="card mt-4 list-disc space-y-1 pl-8 text-sm">
          <li>Model: <code>{LLM_MODEL}</code> (Anthropic), only when <code>ANTHROPIC_API_KEY</code> is set.</li>
          <li>Used for: turning a free-text description into form fields (which the person then confirms), and translating long pages on request.</li>
          <li><strong>Never</strong> used to decide eligibility. LLM output is validated against a fixed schema; unknown values are dropped.</li>
          <li>Without a key, a built-in keyword parser and pre-translated strings (7 languages) keep the app fully working.</li>
          <li>Pre-translated strings were machine-assisted and should be reviewed by native speakers before launch.</li>
        </ul>
      </section>

      <section id="privacy" className="mt-10 scroll-mt-20">
        <h2 className="h2">Privacy</h2>
        <ul className="card mt-4 list-disc space-y-1 pl-8 text-sm">
          <li>Stored per screening: time, borough, first 3 ZIP digits, language, channel, household size, income band, benefits present, result, Household Link flag, consent flag, completion time.</li>
          <li>Never stored: names, street addresses, phone numbers (SMS sessions use a one-way hash), SSNs, exact income, account numbers.</li>
          <li>The server re-runs the rules on submitted answers and discards the raw answers after computing these fields.</li>
          <li>Consent reference codes are random and contain no personal data.</li>
        </ul>
      </section>

      <section id="limits" className="mt-10 scroll-mt-20">
        <h2 className="h2">Limitations</h2>
        <ul className="card mt-4 list-disc space-y-1 pl-8 text-sm">
          <li>Results are screening estimates; the utility and program administrator make final decisions.</li>
          <li>Whether a household member&apos;s benefit letter is accepted when the bill is in another member&apos;s name is not confirmed on Con Edison&apos;s site (flagged in-app).</li>
          <li>Adding electric and gas discounts for dual-service customers is our reading of the discount table (flagged as estimate).</li>
          <li>The gap model uses area averages (household size) and a uniform-within-bracket assumption; ACS 5-year data lags by ~2 years.</li>
          <li>Rules are modeled for Con Edison territory. Parts of NYC are served by National Grid (gas) or PSEG Long Island (Rockaways electric) with different amounts.</li>
          <li>Impact defaults marked “assumption” should be replaced with DPS/utility data.</li>
        </ul>
      </section>

      <section id="refs" className="mt-10 scroll-mt-20">
        <h2 className="h2">Brief 11 references</h2>
        <ol className="card mt-4 space-y-1 text-sm">
          {Object.entries(REFS).map(([n, r]) => (
            <li key={n}>[{n}] <a href={r.url} target="_blank" rel="noreferrer" className="underline">{r.title}</a></li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">Sources accessed October 2026.</p>
      </section>
    </div>
  );
}
