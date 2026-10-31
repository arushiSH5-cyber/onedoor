import type { Metadata } from "next";
import Link from "next/link";
import { GapMapExplorer } from "@/components/map/GapMapExplorer";
import { gapModel } from "@/lib/map/data";

export const metadata: Metadata = { title: "Neighborhood gap map — OneDoor" };

export default function MapPage() {
  const t = gapModel.totals;
  const a = gapModel.assumptions;
  const cards = [
    { label: "NYC households (ACS)", value: t.households.toLocaleString() },
    { label: "Eligible for a Con Ed discount (est.)", value: t.eligible.toLocaleString() },
    { label: "Already enrolled (allocated)", value: t.enrolledEstimate.toLocaleString() },
    { label: "Eligible but unenrolled", value: t.gap.toLocaleString(), accent: true },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <p className="eyebrow">Deliverable: map &amp; estimate of eligible-but-unenrolled households</p>
      <h1 className="h1">Neighborhood gap map</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Where are the households who qualify but aren&apos;t enrolled — and who do they trust? Built from real Census data, the AMI limits in the
        rules engine, and the utility&apos;s own enrollment totals.
      </p>
      {gapModel.isSample && (
        <p className="mt-4 rounded-xl bg-brick-100 p-3 font-semibold text-brick-600" role="alert">
          SAMPLE DATA — the live data fetch failed. Run <code>node scripts/fetch-data.mjs</code>.
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`card ${c.accent ? "border-2 border-amber-500" : ""}`}>
            <p className="text-sm text-muted">{c.label}</p>
            <p className="font-display text-3xl font-semibold text-teal-900 tabular-nums">{c.value}</p>
            <p className="text-xs text-muted">MODEL ESTIMATE</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <GapMapExplorer />
      </div>
      <section className="card mt-6 text-sm">
        <h2 className="font-semibold text-teal-900">How this estimate is built</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>{a.note}</li>
          <li>{a.priority}</li>
          <li>
            Raw ACS comparison: {a.rawEligibleAcs.toLocaleString()} households under AMI. Utility-based eligible count used:{" "}
            {a.officialEligibleNyc.toLocaleString()} (calibration factor {a.calibration}). NYC share of Con Edison households: {a.nycShareOfConEd}.
          </li>
          <li>
            Sources: {gapModel.sources.acs}; {gapModel.sources.geometry}; {gapModel.sources.ami}; {gapModel.sources.enrollment}. Generated{" "}
            {gapModel.generatedAt.slice(0, 10)}.
          </li>
        </ul>
        <Link href="/methods#gap-model" className="mt-3 inline-block font-semibold text-teal-800 underline">
          Read the full method →
        </Link>
      </section>
    </div>
  );
}
