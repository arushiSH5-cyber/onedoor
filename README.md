# OneDoor

**Half a million NYC households qualify for energy bill help and never get it. OneDoor finds them.**

OneDoor is a working prototype for the Global Energy Hackathon 2026 — *Policy, Systems & Community-Based Solutions* track, **Problem Brief 11: Unclaimed energy assistance in NYC**. Team: Arushi Nirmal (solo).

It is one 5-minute screener — on the web or by plain SMS, in 7 languages — that routes every household to the right Con Edison discount (benefits-based **EAP** or income-based **Enhanced EAP**), catches households where **the bill holder is not the benefit recipient** (“Household Link”), and collects **consent for the state to match the home's service address** against benefit records it already holds, so enrollment and renewal become near-automatic.

## What makes it different

| # | Feature | Where | Root cause it fixes |
|---|---|---|---|
| 1 | **One door, two programs** — deterministic routing to EAP vs. Enhanced EAP with a plain-language “why” | `/check` | #1 two programs, two doors |
| 2 | **Household Link** — asks about everyone in the home; flags when the benefit recipient ≠ bill holder | `/check`, `/sms`, dashboard | #5 bill holder ≠ recipient |
| 3 | **Consent-to-match** — address-level consent record + reference code | results page, SMS | #2 partial auto-enrollment, #3 renewal paperwork |
| 4 | **Ratepayer ledger** — discount cost vs. avoided arrears, write-offs, shutoffs, collections | `/impact` | #6 cost to other ratepayers |
| 5 | **Replication playbook** — NYC vs. UK vs. Brazil + interactive checklist for any jurisdiction | `/policy#playbook` | scalability |

## Brief alignment

| Brief deliverable | OneDoor |
|---|---|
| Map and estimate of eligible-but-unenrolled households by neighborhood | `/map` — 55 PUMAs, real ACS 2024 5-yr data, gap / eligible / energy burden / priority layers, trusted messengers + top languages per area |
| Enrollment design with its legal pathway | `/policy` — address-level matching hub, consent where required, PSC Case 14-M-0565, privacy safeguards |
| Multilingual outreach plan built on trusted messengers | `/policy` outreach plan + per-area messengers on `/map`; screener and SMS in 7 languages |
| Cost-benefit model | `/impact` — every assumption editable and sourced |
| Replication playbook | `/policy#playbook` — comparison table + downloadable checklist |

| Scoring metric | Evidence |
|---|---|
| **Impact 25%** | `/impact`: households enrolled, discount dollars delivered, terminations avoided; `/map` gap ≈ 521,653 households |
| **Innovation 25%** | Household Link + consent-to-match by service address = near-automatic enrollment from data the state already holds |
| **Sustainability 25%** | Ratepayer ledger (net cost per other ratepayer), data-driven renewal vs. 18-month paperwork (persistence) |
| **Feasibility 15%** | Working app, verified program rules, legal pathway that uses existing PSC authority and existing data flows |
| **Scalability 10%** | Playbook tested against Great Britain and Brazil; SMS works on any phone |

## Run locally

Requires Node 20+.

```bash
npm install
npm run db:push      # creates prisma/dev.db (SQLite)
npm run db:seed      # optional: 400 SYNTHETIC demo rows for the dashboard (labeled "demo seed")
npm run dev          # http://localhost:3000
```

Tests:

```bash
npm run test                 # Vitest: rules engine, translations, parser, SMS flow, impact model
npx playwright install chromium
npm run e2e                  # Playwright: Rosa flow in English + Spanish, desktop + mobile, all pages error-free
npm run build                # production build
```

Refresh the map data (real public data):

```bash
node scripts/fetch-data.mjs
```

## Deploy to Vercel + Neon (free tiers)

1. Create a Postgres database at [neon.tech](https://neon.tech) and copy its connection string (`postgresql://…?sslmode=require`).
2. Push this repo to GitHub, then **Import** it at [vercel.com/new](https://vercel.com/new).
3. In Vercel → *Settings → Environment Variables*, add `DATABASE_URL` = the Neon string. Optional: `ANTHROPIC_API_KEY`, `TWILIO_*`, `DASHBOARD_TOKEN`.
4. Deploy. The build script detects the Postgres URL, switches Prisma to `postgresql`, creates the tables (`prisma db push`) and builds.
5. Optional demo data: locally run `DATABASE_URL="<neon url>" npm run db:seed`.

Without `DATABASE_URL` the app still works end to end (screener, SMS simulator, map, impact); only the dashboard has nothing to show.

### Real SMS (optional)

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, then in the Twilio console set the number's *A message comes in* webhook to `https://<your-app>/api/sms/twilio` (HTTP POST). “Send this to my phone” on the results page also uses Twilio when configured; otherwise it shows the simulated text.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes for storage | `file:./dev.db` locally; a Postgres URL in production |
| `ANTHROPIC_API_KEY` | no | Free-text parsing and on-demand page translation (`claude-sonnet-5-5`). Without it: built-in keyword parser + pre-translated strings |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | no | Real SMS |
| `DASHBOARD_TOKEN` | no | If set, `/api/export` requires `?token=` |

## Architecture

- **Next.js 15 (App Router) + TypeScript + Tailwind v4**, Prisma (SQLite/Postgres), react-leaflet, Recharts.
- `lib/rules/config.ts` — every program rule with source URL, `verified` flag and last-verified date. **The only place rules live.**
- `lib/rules/engine.ts` — pure functions; `screen(input)` returns a language-neutral result (message keys).
- `lib/i18n` — English source + 6 pre-translated locales (es, zh, bn, ru, ht, ko); a test enforces identical keys/placeholders.
- `lib/screener/parse.ts` — free-text → form fields (keyword rules; the LLM route returns the same schema and is sanitized). **The LLM never decides eligibility.**
- `lib/sms/flow.ts` — the SMS conversation as a pure state machine shared by the simulator and the Twilio webhook.
- `lib/impact/model.ts` — ratepayer ledger.
- `scripts/fetch-data.mjs` — downloads geometry + ACS tables and builds `data/gap-model.json`.

## Data: real vs. estimated

| Data | Status |
|---|---|
| Program rules, income limits, discount tiers, auto-enroll list, 18-month renewal, document rules | **Real**, verified 2026-10-31 from NY DPS, Con Edison and NY EEAP pages |
| Census income, household size, language, tenure, SNAP, energy cost (ACS 2024 5-year), PUMA boundaries (NYC DCP) | **Real** |
| Landing-page stats, enrollment/arrears/termination totals | **Real**, cited from Brief 11 references |
| Eligible / enrolled / gap by area; priority score; energy-burden proxy | **Model estimate** (method on `/methods#gap-model`) |
| Impact defaults | Mix of brief figures, derived figures and **labeled assumptions** |
| Dashboard “demo seed” rows | **Synthetic**, labeled, toggle off with “Real only” |
| Trusted messengers | **Suggestions**, not partners |

## Limitations & TODO

- Confirm with Con Edison that a household member's award letter is accepted when the account is in another member's name (flagged “estimate” in-app).
- Confirm that electric and gas discounts add for dual-service customers (flagged “estimate”).
- The DOE LEAD Tool has no simple API; energy burden uses an ACS-derived proxy. TODO: swap in LEAD tract data.
- Pre-translated strings were machine-assisted; TODO: native-speaker review.
- Impact assumptions marked “assumption” should be replaced with DPS monthly EAP reports and utility cost data.
- Twilio webhook does not yet validate `X-Twilio-Signature`. TODO before a public number goes live.
- Rules model Con Edison territory; National Grid / PSEG LI areas differ.

## Not affiliated

OneDoor is a hackathon prototype. It is not affiliated with Con Edison, NY DPS or any agency. Not legal advice.
