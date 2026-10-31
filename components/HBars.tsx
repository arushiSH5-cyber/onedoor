import { SERIES } from "@/lib/charts/palette";

/** Horizontal bars in plain HTML: label, bar, value. Direct-labeled, so no legend needed. */
export function HBars({
  data,
  label = (k) => k,
  color = () => SERIES[0],
  total,
  format = (v) => v.toLocaleString(),
}: {
  data: { key: string; value: number }[];
  label?: (k: string) => string;
  color?: (k: string) => string;
  total?: number;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  if (!data.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.key} className="group" title={`${label(d.key)}: ${format(d.value)} (${sum ? Math.round((d.value / sum) * 100) : 0}%)`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="text-ink">{label(d.key)}</span>
            <span className="font-semibold text-ink tabular-nums">
              {format(d.value)} <span className="font-normal text-muted">· {sum ? Math.round((d.value / sum) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-teal-50">
            <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${(d.value / max) * 100}%`, background: color(d.key) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
