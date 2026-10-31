/**
 * Turns a free-text household description into form fields.
 * Two implementations share one output shape:
 *  - parseWithRules(): keyword rules, always available (no API key needed)
 *  - the LLM route in app/api/parse, which returns the same ParsedHousehold
 * Either way the person confirms every field, and the rules engine — never
 * the parser — decides eligibility.
 */
import { BENEFITS, type Benefit, type HeatType } from "@/lib/rules/config";
import type { AgeBand, Borough, Relationship } from "@/lib/rules/engine";
import { emptyForm, type BillAnswer, type FormState } from "./form";

export type ParsedPerson = { relationship: Relationship; ageBand?: AgeBand; benefits: Benefit[]; isBillHolder?: boolean };

export type ParsedHousehold = {
  borough?: Borough;
  zip?: string;
  bill?: BillAnswer;
  heatType?: HeatType;
  /** people[0] is the writer ("self"). */
  people: ParsedPerson[];
  householdSize?: number;
  annualIncome?: number;
};

const BOROUGH_WORDS: [RegExp, Borough][] = [
  [/\bbronx\b/i, "bronx"],
  [/\bbrooklyn\b/i, "brooklyn"],
  [/\b(manhattan|harlem|washington heights|inwood|lower east side|chinatown)\b/i, "manhattan"],
  [/\b(queens|flushing|jackson heights|jamaica|astoria|corona|elmhurst)\b/i, "queens"],
  [/\bstaten island\b/i, "staten_island"],
];

const REL_WORDS: [RegExp, Relationship, AgeBand?][] = [
  [/\b(mom|mother|mum|mama|dad|father|papa|parents?|madre|padre|mamá|mami)\b/i, "parent"],
  [/\b(grand(ma|mother|pa|father|parent)s?|abuel[ao]s?)\b/i, "grandparent", "60plus"],
  [/\b(husband|wife|spouse|partner|esposo|esposa)\b/i, "spouse"],
  [/\b(son|daughter|kids?|children|child|baby|hij[oa]s?)\b/i, "child", "under18"],
  [/\b(brother|sister|sibling|herman[oa])\b/i, "sibling"],
  [/\b(aunt|uncle|cousin|niece|nephew|tí[oa])\b/i, "other_relative"],
  [/\b(roommate|room-mate|housemate)\b/i, "roommate"],
];

const BENEFIT_WORDS: [RegExp, Benefit][] = [
  [/\b(snap|food stamps?|ebt|cupones)\b/i, "SNAP"],
  [/\b(medicaid|medicaid card)\b/i, "MEDICAID"],
  [/\b(ssi|supplemental security)\b/i, "SSI"],
  [/\bheap\b/i, "HEAP"],
  [/\b(tanf|cash assistance|safety net|welfare|public assistance)\b/i, "TANF_SNA"],
  [/\b(nycha|public housing|section 8|section eight|vivienda pública)\b/i, "PUBLIC_HOUSING"],
  [/\b(veterans?|va pension|va disability)\b/i, "VETERANS"],
  [/\blifeline\b/i, "LIFELINE"],
  [/\b(direct vendor|utility guarantee)\b/i, "HRA_UTILITY_PAY"],
];

const SELF_WORDS = /\b(i|i'm|im|me|my(self)?|yo|recibo)\b/i;

function findRel(s: string): { rel: Relationship; age?: AgeBand; index: number } | null {
  let best: { rel: Relationship; age?: AgeBand; index: number } | null = null;
  for (const [re, rel, age] of REL_WORDS) {
    const m = re.exec(s);
    if (m && (best === null || m.index < best.index)) best = { rel, age, index: m.index };
  }
  return best;
}

export function parseWithRules(text: string): ParsedHousehold {
  const out: ParsedHousehold = { people: [{ relationship: "self", benefits: [] }] };
  const lower = text.toLowerCase();

  for (const [re, b] of BOROUGH_WORDS) if (re.test(text)) { out.borough = b; break; }
  const zip = text.match(/\b(1[01]\d{3})\b/);
  if (zip) out.zip = zip[1];

  const ensure = (rel: Relationship, age?: AgeBand): ParsedPerson => {
    if (rel === "self") return out.people[0];
    let p = out.people.find((x) => x.relationship === rel);
    if (!p) {
      p = { relationship: rel, ageBand: age, benefits: [] };
      out.people.push(p);
    }
    return p;
  };

  // Mentions of people anywhere add them to the household.
  for (const [re, rel, age] of REL_WORDS) if (re.test(text)) ensure(rel, age);
  if (/\b(senior|elderly|retired|65|70|80)\b/i.test(text) && out.people.length === 1) out.people[0].ageBand = "60plus";

  // Benefits: attach to the person mentioned in the same clause, else to the writer.
  const clauses = text.split(/[.;!?\n]|,\s*(?:and|but)\s+|\band\b(?=\s+(?:my|i)\b)/i);
  for (const clause of clauses) {
    const benefits = BENEFIT_WORDS.filter(([re]) => re.test(clause)).map(([, b]) => b);
    if (!benefits.length) continue;
    const rel = findRel(clause);
    const selfIdx = clause.search(SELF_WORDS);
    // "my mom gets SSI" → mom; "I get SNAP" → me.
    const person = rel && (selfIdx === -1 || /\bmy\b/i.test(clause.slice(Math.max(0, rel.index - 4), rel.index + 1)) || rel.index < selfIdx)
      ? ensure(rel.rel, rel.age)
      : out.people[0];
    for (const b of benefits) if (!person.benefits.includes(b)) person.benefits.push(b);
  }

  // Bill holder.
  if (/(included in (my )?rent|landlord pays|landlord's name|incluid[ao] en (la )?renta)/i.test(text)) out.bill = "landlord";
  else {
    const named = text.match(/(?:bill|account|cuenta|factura)[^.]*?\b(?:in|under)\s+(?:my\s+)?(\w+)(?:'s)?\s+name/i) ??
      text.match(/\b(?:in|under)\s+my\s+(\w+)'s\s+name/i);
    if (/\b(in|under) my name\b|a mi nombre|bill is mine|my name is on the bill/i.test(text)) {
      out.bill = "me";
      out.people[0].isBillHolder = true;
    } else if (named) {
      const rel = findRel(named[1]);
      if (rel) {
        out.bill = "other";
        ensure(rel.rel, rel.age).isBillHolder = true;
      }
    }
  }

  // Heat.
  if (/gas heat|heat(ed)? (with|by) gas|calefacción a gas/.test(lower)) out.heatType = "gas_heat";
  else if (/electric heat|heat(ed)? (with|by) electric/.test(lower)) out.heatType = "electric_heat";
  else if (/heat (is )?included|landlord (provides|pays for) heat/.test(lower)) out.heatType = /gas (stove|for cooking)|cook with gas/.test(lower) ? "electric_gas_cooking" : "electric_only";

  // Household size.
  const size = lower.match(/\b(?:family|household) of (\d{1,2})\b|\b(\d{1,2}) (?:of us|people|persons)\b/);
  if (size) out.householdSize = Number(size[1] ?? size[2]);
  const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const sizeWord = lower.match(/\b(?:family|household) of (two|three|four|five|six|seven|eight)\b|\b(two|three|four|five|six|seven|eight) of us\b/);
  if (!out.householdSize && sizeWord) out.householdSize = words[sizeWord[1] ?? sizeWord[2]];

  // Income: "$52,000", "52k", "about 4,000 a month".
  const inc = text.match(/\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand|mil)?\s*(?:dollars)?\s*(a|per|\/|al)?\s*(year|yr|month|mo|año|mes)?/gi);
  if (inc) {
    for (const raw of inc) {
      const m = raw.match(/\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand|mil)?[^a-z]*(?:a|per|\/|al)?\s*(year|yr|month|mo|año|mes)?/i);
      if (!m) continue;
      let n = Number(m[1].replace(/,/g, ""));
      if (m[2]) n *= 1000;
      if (/^(month|mo|mes)$/i.test(m[3] ?? "")) n *= 12;
      // Ignore ZIPs and small numbers like household counts.
      if (n >= 3000 && !(zip && m[1] === zip[1])) {
        out.annualIncome = Math.round(n);
        break;
      }
    }
  }
  return out;
}

export function sanitizeParsed(p: unknown): ParsedHousehold {
  const obj = (p ?? {}) as Record<string, unknown>;
  const boroughs: Borough[] = ["bronx", "brooklyn", "manhattan", "queens", "staten_island"];
  const rels: Relationship[] = ["self", "spouse", "parent", "child", "grandparent", "sibling", "other_relative", "roommate"];
  const ages: AgeBand[] = ["under18", "18to59", "60plus"];
  const heats: HeatType[] = ["electric_heat", "gas_heat", "electric_only", "electric_gas_cooking", "unknown"];
  const bills: BillAnswer[] = ["me", "other", "landlord", "unknown"];
  const people = Array.isArray(obj.people) ? obj.people : [];
  const clean: ParsedPerson[] = people.slice(0, 12).map((x) => {
    const r = (x ?? {}) as Record<string, unknown>;
    return {
      relationship: rels.includes(r.relationship as Relationship) ? (r.relationship as Relationship) : "other_relative",
      ageBand: ages.includes(r.ageBand as AgeBand) ? (r.ageBand as AgeBand) : undefined,
      benefits: Array.isArray(r.benefits) ? (r.benefits.filter((b) => (BENEFITS as readonly string[]).includes(b as string)) as Benefit[]) : [],
      isBillHolder: r.isBillHolder === true,
    };
  });
  if (!clean.length || clean[0].relationship !== "self") clean.unshift({ relationship: "self", benefits: [] });
  return {
    borough: boroughs.includes(obj.borough as Borough) ? (obj.borough as Borough) : undefined,
    zip: typeof obj.zip === "string" && /^\d{5}$/.test(obj.zip) ? obj.zip : undefined,
    bill: bills.includes(obj.bill as BillAnswer) ? (obj.bill as BillAnswer) : undefined,
    heatType: heats.includes(obj.heatType as HeatType) ? (obj.heatType as HeatType) : undefined,
    people: clean,
    householdSize: typeof obj.householdSize === "number" && obj.householdSize > 0 && obj.householdSize < 21 ? Math.round(obj.householdSize) : undefined,
    annualIncome: typeof obj.annualIncome === "number" && obj.annualIncome >= 0 ? Math.round(obj.annualIncome) : undefined,
  };
}

export function parsedToForm(p: ParsedHousehold): FormState {
  const f = emptyForm();
  const members = p.people.map((person, i) => ({
    id: i === 0 ? "m1" : `p${i + 1}`,
    relationship: i === 0 ? ("self" as const) : person.relationship,
    ageBand: person.ageBand ?? "18to59",
    benefits: person.benefits,
    isBillHolder: !!person.isBillHolder,
  }));
  const holder = members.find((m) => m.isBillHolder);
  return {
    ...f,
    borough: p.borough,
    zip: p.zip ?? "",
    bill: p.bill ?? (holder ? (holder.id === "m1" ? "me" : "other") : undefined),
    billHolderId: holder?.id,
    heatType: p.heatType,
    members,
    householdSize: Math.max(p.householdSize ?? members.length, members.length),
    incomeMode: p.annualIncome !== undefined ? "exact" : "tier",
    incomeExact: p.annualIncome !== undefined ? String(p.annualIncome) : "",
  };
}
