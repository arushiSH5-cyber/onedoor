/**
 * Suggested trusted messengers for outreach. These are SUGGESTIONS for a pilot, not partners;
 * every name must be confirmed locally before use.
 */
type B = "bronx" | "brooklyn" | "manhattan" | "queens" | "staten_island";

const BOROUGH_NAME: Record<B, string> = {
  bronx: "Bronx", brooklyn: "Brooklyn", manhattan: "Manhattan", queens: "Queens", staten_island: "Staten Island",
};

const LIBRARY: Record<B, string> = {
  bronx: "New York Public Library branches (Bronx)",
  brooklyn: "Brooklyn Public Library branches",
  manhattan: "New York Public Library branches (Manhattan)",
  queens: "Queens Public Library branches",
  staten_island: "New York Public Library branches (Staten Island)",
};

const CBO: Record<B, string[]> = {
  bronx: ["BronxWorks", "Catholic Charities Community Services"],
  brooklyn: ["CAMBA", "Catholic Charities Brooklyn & Queens"],
  manhattan: ["Northern Manhattan Improvement Corporation (NMIC)", "Hudson Guild"],
  queens: ["Catholic Charities Brooklyn & Queens", "Queens Community House"],
  staten_island: ["Project Hospitality", "Staten Island Community Partnership"],
};

const BY_LANGUAGE: Record<string, string> = {
  Spanish: "Make the Road New York (Spanish-speaking members)",
  Chinese: "Chinese-American Planning Council (CPC)",
  "Other Indo-European (incl. Bengali)": "Chhaya CDC (South Asian, incl. Bengali speakers)",
  Korean: "Korean Community Services of Metropolitan NY (KCS)",
  "Russian / Polish / Slavic": "COJECO (Russian-speaking community)",
  "French / Haitian Creole": "Haitian Women for Haitian Refugees",
  Arabic: "Arab American Association of New York",
};

export function messengersFor(name: string, borough: B, topLanguages: { label: string }[]): string[] {
  const nums = [...name.matchAll(/(\d+)/g)].map((m) => m[1]);
  const board = nums.length ? `${BOROUGH_NAME[borough]} Community Board${nums.length > 1 ? "s" : ""} ${nums.join(" & ")}` : `${BOROUGH_NAME[borough]} community boards`;
  const lang = topLanguages.map((l) => BY_LANGUAGE[l.label]).filter(Boolean);
  return [
    board,
    "Tenant associations & NYCHA resident associations; Met Council on Housing",
    LIBRARY[borough],
    ...CBO[borough],
    ...lang,
    "Benefit offices and SNAP/Medicaid enrollers (HRA, Navigators)",
  ];
}
