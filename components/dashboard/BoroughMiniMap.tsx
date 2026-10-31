"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { gapModel, pumaGeometry } from "@/lib/map/data";

const Choropleth = dynamic(() => import("@/components/map/GapMap"), {
  ssr: false,
  loading: () => <div className="flex h-[320px] items-center justify-center text-muted">Loading map…</div>,
});

const NAME: Record<string, string> = { bronx: "Bronx", brooklyn: "Brooklyn", manhattan: "Manhattan", queens: "Queens", staten_island: "Staten Island" };

/** Screenings per borough, drawn on the PUMA geometry (each area takes its borough's count). */
export function BoroughMiniMap({ counts }: { counts: Record<string, number> }) {
  const boroughOf = useMemo(() => Object.fromEntries(gapModel.areas.map((a) => [a.puma, a.borough])), []);
  const values = useMemo(() => Object.fromEntries(Object.entries(boroughOf).map(([p, b]) => [p, counts[b] ?? 0])), [boroughOf, counts]);
  const sorted = [...new Set(Object.values(values))].sort((a, b) => a - b);
  const breaks = sorted.length > 1 ? sorted.slice(0, -1) : [0];
  return (
    <Choropleth
      geometry={pumaGeometry}
      values={values}
      breaks={breaks}
      height={320}
      tooltip={(id) => `<strong>${NAME[boroughOf[id]]}</strong><br/>${counts[boroughOf[id]] ?? 0} screenings`}
    />
  );
}
