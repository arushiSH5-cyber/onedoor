"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { gapModel, pumaGeometry, type Area } from "@/lib/map/data";
import { messengersFor } from "@/lib/map/messengers";
import { SEQ } from "@/lib/charts/palette";

const Choropleth = dynamic(() => import("./GapMap"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-2xl border border-line bg-paper text-muted">Loading map…</div>,
});

type LayerKey = "eligible" | "gap" | "energyBurden" | "priority";

const LAYERS: { key: LayerKey; label: string; help: string; fmt: (v: number) => string }[] = [
  { key: "gap", label: "Eligible but unenrolled (gap)", help: "Model estimate of eligible households not yet enrolled", fmt: (v) => Math.round(v).toLocaleString() },
  { key: "eligible", label: "Eligible households", help: "Households below AMI, calibrated to the utility's eligible count", fmt: (v) => Math.round(v).toLocaleString() },
  { key: "energyBurden", label: "Energy burden", help: "ACS energy cost ÷ median income (proxy for DOE LEAD)", fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: "priority", label: "Outreach priority score", help: "0–100: gap 40%, burden 30%, non-English 15%, renters 15%", fmt: (v) => `${Math.round(v)}` },
];

const BOROUGH: Record<string, string> = { bronx: "Bronx", brooklyn: "Brooklyn", manhattan: "Manhattan", queens: "Queens", staten_island: "Staten Island" };

function quantileBreaks(values: number[], n = SEQ.length - 1) {
  const s = [...values].sort((a, b) => a - b);
  return Array.from({ length: n - 1 }, (_, i) => s[Math.floor(((i + 1) / n) * s.length)]);
}

export function GapMapExplorer() {
  const [layer, setLayer] = useState<LayerKey>("gap");
  const [selected, setSelected] = useState<string | null>(null);
  const areas = gapModel.areas as Area[];
  const byId = useMemo(() => Object.fromEntries(areas.map((a) => [a.puma, a])), [areas]);
  const L = LAYERS.find((l) => l.key === layer)!;
  const values = useMemo(() => Object.fromEntries(areas.map((a) => [a.puma, a[layer] as number])), [areas, layer]);
  const breaks = useMemo(() => quantileBreaks(Object.values(values)), [values]);
  const sel = selected ? byId[selected] : null;
  const ranked = useMemo(() => [...areas].sort((a, b) => b.priority - a.priority), [areas]);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Map layer">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={layer === l.key}
              onClick={() => setLayer(l.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${layer === l.key ? "border-teal-800 bg-teal-800 text-white" : "border-line bg-paper text-teal-800 hover:bg-teal-50"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Choropleth
            geometry={pumaGeometry}
            values={values}
            breaks={breaks}
            selected={selected}
            onSelect={setSelected}
            tooltip={(id) => `<strong>${byId[id]?.name ?? id}</strong><br/>${L.label}: ${L.fmt(values[id] ?? 0)}`}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl bg-paper/95 p-3 text-xs shadow">
            <p className="mb-1 font-semibold">{L.label}</p>
            <div className="flex">
              {SEQ.slice(1).map((c) => (
                <span key={c} className="h-3 w-7" style={{ background: c }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-muted">
              <span>low</span>
              <span>high</span>
            </div>
            <p className="mt-1 max-w-52 text-muted">{L.help}. Quantile classes.</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Click any area for details. 55 NYC Public Use Microdata Areas (≈ community districts).</p>
      </div>

      <aside className="card h-fit lg:sticky lg:top-20" aria-live="polite">
        {sel ? (
          <div>
            <p className="eyebrow">{BOROUGH[sel.borough]}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-teal-900">{sel.name.replace(/^[A-Za-z ]+Community Districts? /, "CD ")}</h2>
            <span className="badge mt-2 bg-amber-100 text-xs text-teal-900">MODEL ESTIMATE</span>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Households", sel.households.toLocaleString()],
                ["Eligible (est.)", sel.eligible.toLocaleString()],
                ["Enrolled (allocated)", sel.enrolledEstimate.toLocaleString()],
                ["Gap (est.)", sel.gap.toLocaleString()],
                ["Energy burden", `${(sel.energyBurden * 100).toFixed(1)}%`],
                ["Priority score", `${sel.priority} / 100`],
                ["Renters", pct(sel.renterShare)],
                ["Speak a language other than English", pct(sel.nonEnglishShare)],
                ["SNAP households", sel.snapHouseholds.toLocaleString()],
                ["Median income", `$${sel.medianIncome.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 text-sm font-semibold text-teal-900">Top languages at home</h3>
            <ul className="mt-1 text-sm">
              {sel.topLanguages.map((l) => (
                <li key={l.label}>
                  {l.label} — {pct(l.share)}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold text-teal-900">Suggested trusted messengers</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {messengersFor(sel.name, sel.borough as never, sel.topLanguages).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Suggestions for a pilot, not partners. Confirm locally.</p>
            <p className="mt-4 text-xs text-muted">
              Method: ACS 2024 5-yr income brackets vs. AMI limit for this area&apos;s average household size ({sel.avgHouseholdSize}, limit $
              {sel.amiLimitUsed.toLocaleString()}), calibrated to the utility&apos;s count; enrollment allocated by SNAP share.{" "}
              <Link href="/methods#gap-model" className="underline">Full method</Link>
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-semibold text-teal-900">Where to knock first</h2>
            <p className="mt-1 text-sm text-muted">Top 8 areas by outreach priority score. Click one, or click the map.</p>
            <ol className="mt-3 space-y-2">
              {ranked.slice(0, 8).map((a, i) => (
                <li key={a.puma}>
                  <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-teal-50" onClick={() => setSelected(a.puma)}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white">{i + 1}</span>
                    <span className="flex-1 text-sm">
                      <span className="font-semibold">{a.name.split("--")[1] ?? a.name}</span>
                      <span className="block text-xs text-muted">
                        {BOROUGH[a.borough]} · gap ≈ {a.gap.toLocaleString()} · {a.topLanguages[0]?.label}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{a.priority}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        {sel && (
          <button className="btn-ghost mt-4 w-full py-2 text-sm" onClick={() => setSelected(null)}>
            ← Back to top areas
          </button>
        )}
      </aside>
    </div>
  );
}
