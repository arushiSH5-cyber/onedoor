#!/usr/bin/env node
/**
 * Fetches REAL public data for the gap map and caches it in /data.
 *
 *   node scripts/fetch-data.mjs
 *
 * Sources
 *  - Geometry: NYC Dept. of City Planning, 2020 Public Use Microdata Areas (55 PUMAs ≈ community districts)
 *  - Tables:   U.S. Census Bureau ACS 2024 5-year estimates, served by the Census Reporter API
 *              (api.census.gov now requires a key; Census Reporter mirrors the same ACS tables keyless).
 *              B19001 income distribution · B19013 median income · B25010 avg household size · B25003 tenure
 *              C16001 language spoken at home · B22003 SNAP receipt · B25132/B25133 monthly electricity/gas cost
 *  - Eligibility limits: lib/rules/config.ts (NY DPS AMI table for Con Edison)
 *  - City enrollment totals: Brief 11 references [1][3] (Con Edison press releases)
 *
 * Everything derived here is a MODEL ESTIMATE; the method is written into data/gap-model.json and /methods.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const TMP = join(ROOT, "data", ".tmp");
mkdirSync(TMP, { recursive: true });

const PUMA_URL =
  "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Public_Use_Microdata_Areas_PUMAs_2020/FeatureServer/0/query?where=1%3D1&outFields=PUMA&outSR=4326&f=geojson&geometryPrecision=5";
const RELEASE = "acs2024_5yr";
const TABLES = ["B19001", "B19013", "B25010", "B25003", "C16001", "B22003", "B25132", "B25133"];
const WESTCHESTER = "05000US36119";

// AMI limits from lib/rules/config.ts (kept in sync by tests/data.test.ts).
const AMI = { 1: 113400, 2: 129600, 3: 145800, 4: 162000, 5: 175000, 6: 188000, 7: 200900, 8: 213900 };

// City-level enrollment facts from Brief 11.
const ENROLLED_EAP_CONED = 500_000; // "half a million customers were enrolled and received discounts" in 2025 [1][3]
const APPLIED_EEAP_CONED = 20_000; // "20,000+ had applied by July 2026" [3][4] — applied, used as an upper bound for enrolled
const POTENTIAL_EEAP_CONED = 600_000; // "nearly 600,000 potentially eligible customers" for the income pathway [4]

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": "OneDoor hackathon prototype" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function acs(geoIds) {
  const out = {};
  for (let i = 0; i < geoIds.length; i += 20) {
    const ids = geoIds.slice(i, i + 20).join(",");
    const json = await getJson(`https://api.censusreporter.org/1.0/data/show/${RELEASE}?table_ids=${TABLES.join(",")}&geo_ids=${ids}`);
    if (json.error) throw new Error(json.error);
    for (const [geo, tables] of Object.entries(json.data)) {
      out[geo] = { name: json.geography[geo].name, ...Object.fromEntries(Object.entries(tables).map(([t, v]) => [t, v.estimate])) };
    }
    out._release = json.release;
  }
  return out;
}

/** Interpolated AMI limit for a fractional household size. */
function amiForSize(size) {
  const lo = Math.max(1, Math.min(8, Math.floor(size)));
  const hi = Math.min(8, lo + 1);
  const f = Math.min(1, Math.max(0, size - lo));
  return AMI[lo] + (AMI[hi] - AMI[lo]) * f;
}

// B19001 bracket bounds (002..017).
const BRACKETS = [
  [0, 10000], [10000, 15000], [15000, 20000], [20000, 25000], [25000, 30000], [30000, 35000], [35000, 40000], [40000, 45000],
  [45000, 50000], [50000, 60000], [60000, 75000], [75000, 100000], [100000, 125000], [125000, 150000], [150000, 200000], [200000, Infinity],
];

/** Households below `limit`, assuming a uniform spread within the bracket that contains it. */
function householdsBelow(b19001, limit) {
  let total = 0;
  BRACKETS.forEach(([lo, hi], i) => {
    const n = b19001[`B19001${String(i + 2).padStart(3, "0")}`] ?? 0;
    if (limit >= hi) total += n;
    else if (limit > lo) total += (n * (limit - lo)) / (hi - lo);
  });
  return total;
}

const LANG_GROUPS = {
  C16001003: "Spanish",
  C16001006: "French / Haitian Creole",
  C16001012: "Russian / Polish / Slavic",
  C16001015: "Other Indo-European (incl. Bengali)",
  C16001018: "Korean",
  C16001021: "Chinese",
  C16001024: "Vietnamese",
  C16001027: "Tagalog",
  C16001030: "Other Asian & Pacific",
  C16001033: "Arabic",
  C16001036: "Other",
  C16001009: "German / West Germanic (incl. Yiddish)",
};

function meanCost(t, prefix, mids) {
  const charged = t[`${prefix}003`] ?? 0;
  if (!charged) return { mean: 0, chargedShare: 0 };
  let sum = 0;
  mids.forEach((m, i) => (sum += (t[`${prefix}${String(i + 4).padStart(3, "0")}`] ?? 0) * m));
  return { mean: sum / charged, chargedShare: charged / (t[`${prefix}001`] || 1) };
}

const BOROUGH_OF = (name) =>
  /Bronx/.test(name) ? "bronx" : /Brooklyn/.test(name) ? "brooklyn" : /Manhattan/.test(name) ? "manhattan" : /Queens/.test(name) ? "queens" : "staten_island";

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v) => (max === min ? 0 : (v - min) / (max - min)));
}

async function main() {
  console.log("1/4 PUMA geometry (NYC DCP)…");
  const geo = await getJson(PUMA_URL);
  const raw = join(TMP, "puma-raw.geojson");
  writeFileSync(raw, JSON.stringify(geo));

  console.log("2/4 ACS tables via Census Reporter…");
  const pumas = geo.features.map((f) => String(f.properties.PUMA).padStart(5, "0"));
  const geoIds = pumas.map((p) => `79500US36${p}`);
  const acsData = await acs([...geoIds, WESTCHESTER]);

  console.log("3/4 Model…");
  const nycHouseholds = geoIds.reduce((a, g) => a + acsData[g].B25003.B25003001, 0);
  const westchesterHouseholds = acsData[WESTCHESTER].B25003.B25003001;
  const nycShare = nycHouseholds / (nycHouseholds + westchesterHouseholds);
  const enrolledEapNyc = ENROLLED_EAP_CONED * nycShare;
  const enrolledEeapNyc = APPLIED_EEAP_CONED * nycShare;

  const rows = pumas.map((p, i) => {
    const a = acsData[geoIds[i]];
    const households = a.B25003.B25003001;
    const avgSize = a.B25010.B25010001;
    const limit = amiForSize(avgSize);
    const eligible = householdsBelow(a.B19001, limit);
    const snapHh = a.B22003.B22003002;
    const renterShare = a.B25003.B25003003 / households;
    const pop5 = a.C16001.C16001001;
    const languages = Object.entries(LANG_GROUPS)
      .map(([k, label]) => ({ label, people: a.C16001[k] ?? 0, share: (a.C16001[k] ?? 0) / pop5 }))
      .sort((x, y) => y.people - x.people)
      .slice(0, 3);
    const elec = meanCost(a.B25132, "B25132", [25, 75, 125, 175, 225, 300]);
    const gas = meanCost(a.B25133, "B25133", [12.5, 37.5, 62.5, 87.5, 125, 175]);
    const annualEnergy = 12 * (elec.mean + gas.mean * (gas.chargedShare / Math.max(elec.chargedShare, 0.01)));
    const medianIncome = a.B19013.B19013001;
    return {
      puma: p,
      name: a.name.replace(/^NYC-/, "").replace(/ PUMA, NY$/, ""),
      borough: BOROUGH_OF(a.name),
      households,
      avgHouseholdSize: avgSize,
      amiLimitUsed: Math.round(limit),
      eligible,
      snapHouseholds: snapHh,
      renterShare,
      nonEnglishShare: 1 - a.C16001.C16001002 / pop5,
      topLanguages: languages.map((l) => ({ label: l.label, share: Math.round(l.share * 1000) / 1000 })),
      medianIncome,
      annualEnergyCost: Math.round(annualEnergy),
      energyBurden: medianIncome ? annualEnergy / medianIncome : 0,
    };
  });

  // Calibrate: the raw ACS-vs-AMI comparison counts every household, including renters whose electricity is
  // included in rent (e.g. master-metered NYCHA buildings) who are not Con Edison customers. Scale each area so the
  // city total matches the utility's own count of eligible customers (EAP enrolled + EEAP potentially eligible).
  const rawEligibleTotal = rows.reduce((a, r) => a + r.eligible, 0);
  const officialEligibleNyc = (ENROLLED_EAP_CONED + POTENTIAL_EEAP_CONED) * nycShare;
  const calibration = officialEligibleNyc / rawEligibleTotal;
  for (const r of rows) {
    r.eligibleRawAcs = Math.round(r.eligible);
    r.eligible = r.eligible * calibration;
  }

  const totalSnap = rows.reduce((a, r) => a + r.snapHouseholds, 0);
  const totalNonSnapEligible = rows.reduce((a, r) => a + Math.max(0, r.eligible - r.snapHouseholds), 0);
  for (const r of rows) {
    r.enrolledEstimate = enrolledEapNyc * (r.snapHouseholds / totalSnap) + enrolledEeapNyc * (Math.max(0, r.eligible - r.snapHouseholds) / totalNonSnapEligible);
    r.gap = Math.max(0, r.eligible - r.enrolledEstimate);
  }
  const nGap = normalize(rows.map((r) => r.gap));
  const nBurden = normalize(rows.map((r) => r.energyBurden));
  const nLang = normalize(rows.map((r) => r.nonEnglishShare));
  const nRent = normalize(rows.map((r) => r.renterShare));
  rows.forEach((r, i) => {
    r.priority = Math.round(100 * (0.4 * nGap[i] + 0.3 * nBurden[i] + 0.15 * nLang[i] + 0.15 * nRent[i]));
    for (const k of ["eligible", "enrolledEstimate", "gap"]) r[k] = Math.round(r[k]);
    for (const k of ["renterShare", "nonEnglishShare", "energyBurden"]) r[k] = Math.round(r[k] * 10000) / 10000;
  });

  const totals = {
    households: nycHouseholds,
    eligible: rows.reduce((a, r) => a + r.eligible, 0),
    enrolledEstimate: rows.reduce((a, r) => a + r.enrolledEstimate, 0),
    gap: rows.reduce((a, r) => a + r.gap, 0),
  };

  console.log("4/4 Simplify geometry…");
  const simplified = join(TMP, "puma-simplified.geojson");
  execFileSync(join(ROOT, "node_modules", ".bin", "mapshaper"), [raw, "-simplify", "6%", "keep-shapes", "-o", "precision=0.0001", simplified], { stdio: "inherit" });
  const simple = JSON.parse(readFileSync(simplified, "utf8"));
  for (const f of simple.features) f.properties = { puma: String(f.properties.PUMA).padStart(5, "0") };

  writeFileSync(join(DATA, "nyc-pumas.json"), JSON.stringify(simple));
  writeFileSync(
    join(DATA, "gap-model.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        isSample: false,
        label: "MODEL ESTIMATE",
        sources: {
          geometry: "NYC Dept. of City Planning — 2020 Public Use Microdata Areas (PUMAs)",
          acs: `U.S. Census Bureau, ${acsData._release.name} (via Census Reporter API)`,
          ami: "NY DPS Energy Affordability Program income table (Con Edison), as of 10/15/26",
          enrollment: "Con Edison: ~500,000 EAP customers enrolled in 2025 [Brief ref 1, 3]; 20,000+ EEAP applications by July 2026 [ref 3, 4]",
        },
        assumptions: {
          nycShareOfConEd: Math.round(nycShare * 1000) / 1000,
          enrolledEapNyc: Math.round(enrolledEapNyc),
          enrolledEeapNyc: Math.round(enrolledEeapNyc),
          rawEligibleAcs: Math.round(rawEligibleTotal),
          officialEligibleNyc: Math.round(officialEligibleNyc),
          calibration: Math.round(calibration * 1000) / 1000,
          note:
            "Raw eligible = households with income below the AMI limit for the PUMA's average household size (linear interpolation inside ACS B19001 brackets). " +
            "Because many renters (e.g. master-metered buildings) are not direct Con Edison customers, raw counts are scaled so the NYC total equals the utility's figure (≈500k EAP enrolled + ≈600k EEAP potentially eligible, × NYC share). " +
            "EAP enrollment is allocated to PUMAs in proportion to SNAP households (B22003); EEAP in proportion to eligible non-SNAP households. " +
            "Con Edison totals are scaled to NYC by household share vs. Westchester. Gap = eligible − allocated enrolled. Energy burden is an ACS-derived proxy (B25132/B25133 cost midpoints ÷ median income), not the DOE LEAD Tool.",
          priority: "Priority = 100 × (0.40·gap + 0.30·energy burden + 0.15·non-English share + 0.15·renter share), each min–max normalized across the 55 PUMAs.",
        },
        totals,
        areas: rows,
      },
      null,
      1,
    ),
  );
  console.log(`Done. ${rows.length} areas · eligible ≈ ${totals.eligible.toLocaleString()} · gap ≈ ${totals.gap.toLocaleString()}`);
}

main().catch((e) => {
  console.error("Data fetch failed:", e.message);
  console.error("The app keeps working with the last cached /data files (or the labeled sample in data/sample-gap-model.json).");
  process.exit(1);
});
