import { prisma } from "@/lib/db";

export type Row = {
  createdAt: Date;
  borough: string | null;
  zip3: string | null;
  language: string;
  inputMode: string;
  householdSize: number;
  incomeBracket: string;
  benefits: string;
  pathway: string;
  householdLink: boolean;
  consentGiven: boolean;
  completionSecs: number;
  isDemoSeed: boolean;
};

const count = <T extends string>(rows: Row[], f: (r: Row) => T | T[] | null) => {
  const m = new Map<T, number>();
  for (const r of rows) {
    const v = f(r);
    for (const k of Array.isArray(v) ? v : v ? [v] : []) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
};

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export async function loadRows(includeSeed: boolean): Promise<{ rows: Row[]; realCount: number; seedCount: number; dbOk: boolean }> {
  try {
    const [rows, realCount, seedCount] = await Promise.all([
      prisma.screening.findMany({ where: includeSeed ? {} : { isDemoSeed: false }, orderBy: { createdAt: "desc" }, take: 20000 }),
      prisma.screening.count({ where: { isDemoSeed: false } }),
      prisma.screening.count({ where: { isDemoSeed: true } }),
    ]);
    return { rows, realCount, seedCount, dbOk: true };
  } catch (e) {
    console.warn("[stats] database unavailable:", (e as Error).message);
    return { rows: [], realCount: 0, seedCount: 0, dbOk: false };
  }
}

export function computeStats(rows: Row[]) {
  const eligible = rows.filter((r) => r.pathway === "EAP" || r.pathway === "EEAP");
  const timed = rows.map((r) => r.completionSecs).filter((s) => s > 0);
  const days: { day: string; value: number }[] = [];
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10);
    days.push({ day: d.slice(5), value: rows.filter((r) => r.createdAt.toISOString().slice(0, 10) === d).length });
  }
  return {
    total: rows.length,
    eligible: eligible.length,
    eligiblePct: rows.length ? eligible.length / rows.length : 0,
    linkCount: rows.filter((r) => r.householdLink).length,
    linkPctOfEligible: eligible.length ? rows.filter((r) => r.householdLink).length / eligible.length : 0,
    consentPct: eligible.length ? eligible.filter((r) => r.consentGiven).length / eligible.length : 0,
    medianSecs: median(timed),
    under5Pct: timed.length ? timed.filter((s) => s <= 300).length / timed.length : 0,
    byLanguage: count(rows, (r) => r.language),
    byPathway: count(rows, (r) => r.pathway),
    byMode: count(rows, (r) => r.inputMode),
    byBorough: count(rows, (r) => r.borough ?? "unknown"),
    eligibleByBorough: count(eligible, (r) => r.borough ?? "unknown"),
    byIncome: count(rows, (r) => r.incomeBracket),
    byBenefit: count(rows, (r) => (r.benefits ? r.benefits.split(",") : [])),
    perDay: days,
    recent: rows.slice(0, 12),
  };
}

export type Stats = ReturnType<typeof computeStats>;

const COLS: (keyof Row)[] = [
  "createdAt", "borough", "zip3", "language", "inputMode", "householdSize", "incomeBracket",
  "benefits", "pathway", "householdLink", "consentGiven", "completionSecs", "isDemoSeed",
];

export function toCsv(rows: Row[]) {
  const esc = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n");
}
