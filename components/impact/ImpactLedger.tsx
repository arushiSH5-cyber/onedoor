"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { ASSUMPTIONS, computeImpact, DEFAULTS, type Assumption, type ImpactInputs } from "@/lib/impact/model";
import { INK, SERIES } from "@/lib/charts/palette";

const usd = (n: number, digits = 0) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });
const usdShort = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : usd(n));
const fmt = (a: Assumption, v: number) => (a.unit === "usd" ? usd(v) : a.unit === "pct" ? `${(v * 100).toFixed(a.step < 0.01 ? 1 : 0)}%` : Math.round(v).toLocaleString());

const KIND: Record<Assumption["kind"], string> = { brief: "From brief", derived: "Derived from brief", assumption: "Assumption" };
const KIND_STYLE: Record<Assumption["kind"], string> = { brief: "bg-leaf-100 text-leaf-700", derived: "bg-teal-50 text-teal-800", assumption: "bg-amber-100 text-teal-900" };

const GROUPS: { title: string; keys: (keyof ImpactInputs)[] }[] = [
  { title: "Enrollment & discount", keys: ["additionalHouseholds", "avgMonthlyDiscount", "adminCostPerEnrollee"] },
  { title: "Arrears & collections", keys: ["shareInArrears", "avgArrears", "arrearsReduction", "writeOffRate", "collectionCostPerAccount"] },
  { title: "Terminations", keys: ["terminationRate", "terminationReduction", "costPerTermination"] },
  { title: "Ratepayers & persistence", keys: ["residentialRatepayers", "existingParticipants", "retentionAutoRenew", "retentionPaper"] },
];

export function ImpactLedger() {
  const [inputs, setInputs] = useState<ImpactInputs>(DEFAULTS);
  const r = useMemo(() => computeImpact(inputs), [inputs]);
  const byKey = Object.fromEntries(ASSUMPTIONS.map((a) => [a.key, a])) as Record<keyof ImpactInputs, Assumption>;

  const curve = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const H = i * 50_000;
        const x = computeImpact({ ...inputs, additionalHouseholds: H });
        return { households: H, net: Math.round(x.netPerPayerMonth * 100) / 100 };
      }),
    [inputs],
  );

  const ledger = [
    { name: "Cost", discounts: r.discountDollars, admin: r.adminCost },
    { name: "Offsets", writeOffs: r.writeOffsAvoided, terminations: r.terminationCostsSaved, collections: r.collectionsSaved },
  ];

  const tiles = [
    { label: "Discount dollars delivered / yr", value: usdShort(r.discountDollars), note: `to ${inputs.additionalHouseholds.toLocaleString()} more households` },
    { label: "Terminations avoided / yr", value: Math.round(r.terminationsAvoided).toLocaleString(), note: "fewer shutoffs" },
    { label: "Arrears reduced / yr", value: usdShort(r.arrearsReduced), note: `${usdShort(r.writeOffsAvoided)} fewer write-offs` },
    { label: "Net cost per other ratepayer", value: `${usd(r.netPerPayerMonth, 2)}/mo`, note: `before offsets: ${usd(r.grossPerPayerMonth, 2)}/mo`, accent: true },
    { label: "Cost offset by savings", value: `${Math.round(r.offsetShare * 100)}%`, note: `${usdShort(r.offsets)} of ${usdShort(r.grossCost)}` },
  ];

  const be = r.breakEvenArrearsReduction;
  const summary =
    `Enrolling ${inputs.additionalHouseholds.toLocaleString()} more households delivers ${usdShort(r.discountDollars)} a year in bill discounts, ` +
    `avoids about ${Math.round(r.terminationsAvoided).toLocaleString()} shutoffs and cuts arrears by ${usdShort(r.arrearsReduced)}. ` +
    `After savings from fewer write-offs, terminations and collections, it costs each other residential ratepayer about ${usd(r.netPerPayerMonth, 2)} a month. ` +
    (be <= 1
      ? `It fully pays for itself if arrears fall by ${Math.round(be * 100)}% among enrollees.`
      : `Savings alone would fund a ${usd(r.selfFundingMonthlyDiscount, 2)}/month discount; the rest is a deliberate transfer to households under AMI.`);

  return (
    <div className="space-y-6">
      <section className="card border-2 border-teal-700/30 bg-teal-50" aria-live="polite">
        <p className="eyebrow">In plain English</p>
        <p className="mt-2 text-lg leading-relaxed text-teal-900" data-testid="impact-summary">{summary}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className={`card ${t.accent ? "border-2 border-amber-500" : ""}`}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-teal-900 tabular-nums">{t.value}</p>
            <p className="text-xs text-muted">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold text-teal-900">The ledger: annual cost vs. offsets</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ledger} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid horizontal={false} stroke={INK.grid} />
                <XAxis type="number" tickFormatter={usdShort} tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: INK.primary }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v) => usd(Number(v))} />
                <Bar dataKey="discounts" name="Discounts" stackId="a" fill={SERIES[0]} />
                <Bar dataKey="admin" name="Outreach & admin" stackId="a" fill={SERIES[2]} />
                <Bar dataKey="writeOffs" name="Write-offs avoided" stackId="a" fill={SERIES[1]} />
                <Bar dataKey="terminations" name="Termination costs avoided" stackId="a" fill={SERIES[3]} />
                <Bar dataKey="collections" name="Collections saved" stackId="a" fill="#5a6872" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {[["Discounts", SERIES[0]], ["Outreach & admin", SERIES[2]], ["Write-offs avoided", SERIES[1]], ["Terminations avoided", SERIES[3]], ["Collections saved", "#5a6872"]].map(([l, c]) => (
              <li key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="font-semibold text-teal-900">Net cost per other ratepayer, by households enrolled</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ left: -10, right: 16, top: 8 }}>
                <CartesianGrid vertical={false} stroke={INK.grid} />
                <XAxis dataKey="households" tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${usd(Number(v), 2)} / month`, "Net cost per ratepayer"]} labelFormatter={(v) => `${Number(v).toLocaleString()} households`} />
                <ReferenceLine x={Math.round(inputs.additionalHouseholds / 50_000) * 50_000} stroke={SERIES[1]} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="net" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted">Dashed line: your current scenario.</p>
        </section>
      </div>

      <section className="card">
        <h2 className="font-semibold text-teal-900">Persistence: why renewal by data matters</h2>
        <p className="mt-1 text-sm text-muted">The income pathway ends after 18 months unless households re-apply. Matching by address keeps them enrolled.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><p className="text-sm text-muted">Still enrolled (data-driven renewal)</p><p className="font-display text-2xl font-semibold text-teal-900">{Math.round(r.year2Auto).toLocaleString()}</p></div>
          <div><p className="text-sm text-muted">Still enrolled (paper re-application)</p><p className="font-display text-2xl font-semibold text-teal-900">{Math.round(r.year2Paper).toLocaleString()}</p></div>
          <div><p className="text-sm text-muted">Extra discounts kept in year 2</p><p className="font-display text-2xl font-semibold text-teal-900">{usdShort(r.year2ExtraDiscount)}</p></div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="h2">Every assumption, editable</h2>
          <button className="btn-ghost py-2 text-sm" onClick={() => setInputs(DEFAULTS)}>Reset to defaults</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="card">
              <legend className="sr-only">{g.title}</legend>
              <h3 className="mb-4 font-semibold text-teal-900">{g.title}</h3>
              <div className="space-y-5">
                {g.keys.map((k) => {
                  const a = byKey[k];
                  return (
                    <div key={k}>
                      <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor={`in-${k}`} className="text-sm font-medium">{a.label}</label>
                        <span className="font-semibold tabular-nums">{fmt(a, inputs[k])}</span>
                      </div>
                      <input
                        id={`in-${k}`}
                        type="range"
                        min={a.min}
                        max={a.max}
                        step={a.step}
                        value={inputs[k]}
                        onChange={(e) => setInputs((s) => ({ ...s, [k]: Number(e.target.value) }))}
                        className="mt-1 w-full accent-teal-800"
                      />
                      <p className="mt-1 text-xs text-muted">
                        <span className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${KIND_STYLE[a.kind]}`}>{KIND[a.kind]}</span>
                        {a.source}
                      </p>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
    </div>
  );
}
