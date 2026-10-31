# OneDoor — demo video script (≈4 minutes)

**Setup before recording**
- Run `npm run dev` (or open the deployed URL). Browser at 1280×800, zoom 100%, no other tabs or bookmarks visible.
- Dashboard: run `npm run db:seed` so charts aren't empty.
- Have a phone-sized window ready (Chrome DevTools device toolbar, iPhone 14) for scene 3.
- Language picker set to English.

---

### Scene 1 — The problem (0:00–0:25) · `/`
**Click:** nothing; slowly scroll from the headline to the 4 stat cards. Hover the `[4]` citation on “775”.
**Say:** “Since January, every New York City household below area median income qualifies for a Con Edison discount. In the first month, 775 people enrolled in the new income pathway, out of nearly 600,000. Half a million households qualify and never get it. OneDoor finds them.”

### Scene 2 — Rosa, step by step (0:25–1:30) · `/check`
**Click:** *Check my household (5 min)*. Point at the progress bar and “~4 min left”.
1. Choose **Bronx**, ZIP `10453` → **Next**.
2. Bill: **Mine**. Heat: **Heat is included in rent** → **Next**.
3. **Add a person** → Relationship **Parent**, Age **60 or older** → **Next**.
4. Under *Parent*, tick **SSI** → **Next**.
5. **Type an amount** → `52000` → **See my result**.
**Say:** “Rosa's bill is in her name, but her mother gets SSI. Most tools only ask about the account holder. OneDoor asks about everyone in the home.”
**On the result, point at:** the pathway title, “You need to apply”, the amber **Household Link match** box, **$33.47 per month** with its source, the *Why* list, the backup plan, the documents checklist.
**Say:** “EAP through her mother's SSI. Today's data matching misses households like this — so we flag it, tell her exactly which letter to send, and keep the income pathway as a backup.”

### Scene 3 — Consent-to-match + phone (1:30–2:00)
**Click:** tick **I agree** in *Let the state find you automatically* → the reference code appears. Type `718 555 0142` in *Send this to my phone* → **Send text** (shows the simulated SMS).
**Say:** “One checkbox lets the state match this home's service address — not Rosa's name — against benefit records it already has. That's near-automatic enrollment and renewal, with consent, using data New York already holds.”

### Scene 4 — Another language, another door (2:00–2:30)
**Click:** language picker → **Español**. Show the result translated. Then **Empezar de nuevo** → switch the picker back to English → open **By text** (`/sms`), tap **Text “ONEDOOR”**, then keys `2` (Español) `1` `1` `2` `3` `2` `3` → show the result and the consent question; tap **YES**.
**Say:** “Seven languages, and it works on any phone by plain text. Same rules engine, same Household Link check, same reference code.”

### Scene 5 — Where to knock first (2:30–3:00) · `/map`
**Click:** *Eligible but unenrolled* layer → click **Flushing** in the top list → scroll the panel (top languages, trusted messengers). Switch to **Outreach priority score**.
**Say:** “Using Census data and the utility's own totals, we estimate about 521,000 eligible households aren't enrolled. For each neighborhood we show the gap, energy burden, top languages, and who people trust — community boards, tenant associations, libraries.”

### Scene 6 — The ratepayer math (3:00–3:30) · `/impact`
**Click:** read the plain-English summary; drag **Additional households enrolled** from 100,000 to 250,000 and back.
**Say:** “Discounts are paid by other ratepayers, so every assumption is here, sourced and editable. At 100,000 new enrollees: $50 million a year delivered, about 1,600 shutoffs avoided, roughly $1.68 a month per other ratepayer — and renewal by data keeps 90% enrolled instead of 60%.”

### Scene 7 — Proof, policy, replication (3:30–4:00)
**Click:** `/dashboard` → point at *Household Link matches* and *Median time to finish* (note the *Demo seed* toggle) → `/policy` → scroll to the flow diagram → *Replication playbook* → click **Brazil**, then **Your jurisdiction** and answer two questions.
**Say:** “Every screening is stored anonymized, so we can prove it takes under five minutes and count how many households today's system would miss. The legal pathway builds on the PSC's existing affordability case, and the playbook shows what the UK, Brazil — or any city — needs to copy it. OneDoor: one door to the help people already qualify for.”
