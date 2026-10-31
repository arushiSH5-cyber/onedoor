/**
 * Seeds SYNTHETIC demo screenings so the dashboard is not empty on first run.
 * Every row has isDemoSeed = true and the dashboard labels them "Demo seed".
 * Distributions are illustrative, not real data. Pathways are computed by the real rules engine.
 *
 *   npm run db:seed            (adds 400 demo rows, replacing earlier demo rows)
 */
import { PrismaClient } from "@prisma/client";
import { anonymize } from "../lib/screener/anonymize";
import type { Benefit, HeatType } from "../lib/rules/config";
import type { Borough, Member, ScreenerInput } from "../lib/rules/engine";

const prisma = new PrismaClient();

// Deterministic PRNG so reseeding gives the same demo data.
let s = 20261101;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(pairs: [T, number][]): T => {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[pairs.length - 1][0];
};

const ZIPS: Record<Borough, string[]> = {
  bronx: ["10451", "10453", "10456", "10458", "10467"],
  brooklyn: ["11206", "11212", "11220", "11226", "11233"],
  manhattan: ["10027", "10029", "10031", "10035", "10002"],
  queens: ["11354", "11368", "11372", "11432", "11691"],
  staten_island: ["10301", "10303", "10304", "10314"],
};

function makeInput(): { input: ScreenerInput; lang: string; mode: string; secs: number } {
  const borough = pick<Borough>([["bronx", 26], ["brooklyn", 30], ["manhattan", 17], ["queens", 22], ["staten_island", 5]]);
  const lang = pick([["en", 48], ["es", 26], ["zh", 8], ["ru", 5], ["bn", 5], ["ht", 4], ["ko", 4]]);
  const mode = pick([["form", 62], ["text", 18], ["sms", 20]]);
  const size = pick([[1, 28], [2, 27], [3, 18], [4, 15], [5, 7], [6, 5]]);
  const members: Member[] = [{ id: "m1", relationship: "self", ageBand: pick([["18to59", 70], ["60plus", 30]]), benefits: [], isBillHolder: false }];
  for (let i = 1; i < size; i++) {
    members.push({
      id: `m${i + 1}`,
      relationship: pick([["child", 40], ["spouse", 25], ["parent", 20], ["sibling", 8], ["roommate", 7]]),
      ageBand: pick([["under18", 35], ["18to59", 45], ["60plus", 20]]),
      benefits: [],
      isBillHolder: false,
    });
  }
  const benefitPool: [Benefit, number][] = [["SNAP", 30], ["MEDICAID", 34], ["SSI", 10], ["HEAP", 8], ["TANF_SNA", 5], ["PUBLIC_HOUSING", 9], ["VETERANS", 2], ["LIFELINE", 2]];
  members.forEach((m, i) => { if (rand() < (i === 0 ? 0.42 : 0.14)) m.benefits.push(pick(benefitPool)); });
  const holderIdx = rand() < 0.78 ? 0 : Math.floor(rand() * members.length);
  const billSituation = rand() < 0.04 ? "landlord" : "in_household";
  if (billSituation === "in_household") members[holderIdx].isBillHolder = true;
  const income: ScreenerInput["income"] =
    rand() < 0.07 ? { kind: "unknown" } : { kind: "exact", amount: Math.round(Math.exp(10.4 + rand() * 1.9) / 100) * 100 };
  const heatType = pick<HeatType>([["electric_only", 45], ["gas_heat", 25], ["electric_gas_cooking", 18], ["electric_heat", 7], ["unknown", 5]]);
  const secs = Math.round(Math.max(55, 95 + rand() * 180 + (mode === "sms" ? 40 : 0) + (rand() < 0.08 ? 160 : 0)));
  return {
    input: { borough, zip: ZIPS[borough][Math.floor(rand() * ZIPS[borough].length)], billSituation, members, householdSize: size, income, heatType },
    lang,
    mode,
    secs,
  };
}

async function main() {
  const n = Number(process.argv[2] ?? 400);
  await prisma.screening.deleteMany({ where: { isDemoSeed: true } });
  const now = Date.now();
  const rows = Array.from({ length: n }, (_, i) => {
    const { input, lang, mode, secs } = makeInput();
    const rec = anonymize(input, { language: lang, inputMode: mode, completionSecs: secs, isDemo: true });
    const eligible = rec.pathway === "EAP" || rec.pathway === "EEAP";
    return {
      ...rec,
      consentGiven: eligible && rand() < 0.71,
      createdAt: new Date(now - Math.floor(rand() * 21 * 864e5) - i * 1000),
    };
  });
  await prisma.screening.createMany({ data: rows });
  console.log(`Seeded ${rows.length} demo screenings (isDemoSeed = true).`);
}

main().finally(() => prisma.$disconnect());
