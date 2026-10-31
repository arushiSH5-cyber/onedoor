# OneDoor — One-page impact estimate

**Global Energy Hackathon 2026 · Brief 11: Unclaimed energy assistance in NYC · Arushi Nirmal (solo) · Policy, Systems & Community-Based Solutions**

**The gap.** Our model of NYC's 55 neighborhoods (ACS 2024 5-year data, calibrated to the utility's own counts) estimates **≈989,000 eligible households, ≈468,000 enrolled, and ≈521,700 eligible but unenrolled**. That matches the brief's "half a million". The highest-priority areas are Flushing, Fordham, Soundview, Mott Haven and Jamaica (`/map`).

**The intervention.** A 5-minute screener (web + plain SMS, 7 languages) that (1) routes each household to EAP or the Enhanced EAP, (2) counts benefits held by *anyone* in the home (**Household Link**), and (3) records **consent for the state to match the service address** against benefit records, so enrollment and renewal run on data.

## Scenario: +100,000 households enrolled in year 1 (≈20% of the gap)

| Brief success metric | Estimate | Basis |
|---|---|---|
| **Additional households enrolled** | **100,000** | Assumption: 20% of the modeled 521,653 gap |
| **Discount dollars delivered** | **$50.4M / year** | 100,000 × $42/mo × 12. $42 = brief's >$500M over 2 years ÷ ~500k customers [1][3] |
| **Terminations avoided** | **≈1,575 / year** | 6.3% termination rate (190,410 in 2025 ÷ ~3M customers [7]) × 25% reduction *(assumption)* |
| Arrears reduced | $9.6M / year | 25% in arrears *(assumption)* × $1,911 avg (=$948M ÷ 496,007 [6]) × 20% reduction *(assumption)* |
| **Enrollment persistence** | **90,000 vs. 60,000** still enrolled after 18 months | Data-driven renewal (90%, *assumption* informed by UK ≈96% automatic [8]) vs. paper re-application (60%, *assumption*) → **+$15.1M kept in year 2** |
| **Ratepayer cost offset** | **$3.4M (7%)** of $51.9M gross cost | Avoided write-offs ($2.87M, 30% write-off *assumption*), collections ($0.30M), shutoff costs ($0.24M) |
| **Net cost to other ratepayers** | **≈$1.68 / month** each (gross $1.80) | $48.5M ÷ 2.4M non-participating residential ratepayers ÷ 12 |

**Honest read on sustainability.** Savings from fewer arrears and shutoffs offset ≈7% of the cost under these assumptions — on their own they would fund a $1.59/month discount. Arrears would need to fall 326% for full break-even, so the discount is, by design, a transfer to households below AMI. OneDoor's job is to make that transfer reach the people it was approved for at the lowest admin cost ($15/enrollee assumed), and to show regulators the full ledger. Closing the *entire* gap would deliver ≈$263M/year and avoid ≈8,200 shutoffs at ≈$10.66/month per other ratepayer.

## Legal pathway (feasibility)

- **Authority exists:** NY PSC runs EAP under **Case 14-M-0565**; its July 17, 2025 order expanded the policy (target ≤6% of income on energy), and the PSC already requires utilities to identify and enroll eligible households [12].
- **Data already flows** for HEAP, TANF and Safety Net [1]. OneDoor changes the match key from account-holder **name** to **service address**.
- **Medicaid, SNAP, SSI, VA** need a data-sharing agreement or consent → OneDoor's consent-to-match collects it; add the same opt-in to benefit applications.
- *Not legal advice — to be validated by agency counsel.*

## Replication (scalability)

| | Data source | Match key | Legal mechanism |
|---|---|---|---|
| Great Britain | DWP benefit records | claimant ↔ supplier account / property | WHD Regulations 2022; Digital Economy Act 2017 ss.35–37 (≈96% paid automatically [8]) |
| Brazil | CadÚnico + BPC | family CPF/NIS ↔ distributor account | Law 14,203/2021 + ANEEL rules (80% rise in beneficiaries [9][10]) |
| **Any jurisdiction** | a benefits registry | a shared key (address works) | regulator order + data-sharing gateway + consent → `/policy#playbook` |

*All figures come from the `/impact` model defaults; every assumption is labeled and editable in the app. Assumptions should be replaced with DPS monthly EAP reports and utility cost data in a pilot.*
