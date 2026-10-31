"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { INK, SERIES } from "@/lib/charts/palette";

export function DailyBars({ data }: { data: { day: string; value: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke={INK.grid} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: INK.muted }} tickLine={false} axisLine={false} interval={3} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: INK.muted }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(11,132,165,0.08)" }} formatter={(v) => [v, "Screenings"]} />
          <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
