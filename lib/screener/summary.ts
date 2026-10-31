import { CONTACTS } from "@/lib/rules/config";
import { addMonths, type ScreenerResult } from "@/lib/rules/engine";
import { fmtDate, money, translate, translateMsg, type Lang } from "@/lib/i18n";

export function discountText(r: ScreenerResult, lang: Lang): string | null {
  if (!r.monthlyDiscount) return null;
  const { low, high } = r.monthlyDiscount;
  return low === high ? money(low, lang, true) : `${money(low, lang, true)}–${money(high, lang, true)}`;
}

export function applyWhere(r: ScreenerResult): string | null {
  if (r.pathway === "EAP") return `${CONTACTS.eap.email} · coned.com`;
  if (r.pathway === "EEAP") return `coned.nyeeap.com · ${CONTACTS.eeap.phone}`;
  return null;
}

/** Short text for SMS (fits in a few segments). */
export function smsSummary(r: ScreenerResult, lang: Lang, ref?: string): string {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const lines = [t("sms.result", { pathway: t(`pathwayShort.${r.pathway}`) })];
  const d = discountText(r, lang);
  if (d) lines.push(t("sms.discount", { amount: d }));
  if (r.householdLink) lines.push(t("sms.link"));
  if (r.enrollment !== "NA") lines.push(t(`enroll.${r.enrollment}`) + ".");
  const where = applyWhere(r);
  if (where && r.enrollment === "MUST_APPLY") lines.push(t("sms.apply", { where }));
  if (r.pathway === "NOT_ELIGIBLE" || r.pathway === "NOT_CUSTOMER") lines.push(translateMsg(lang, r.nextSteps[0]));
  if (ref) lines.push(t("sms.ref", { ref }));
  return lines.join("\n");
}

/** Full plain-text summary for download/print. */
export function fullSummary(r: ScreenerResult, lang: Lang, opts: { ref?: string; now?: Date } = {}): string {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const tm = (m: Parameters<typeof translateMsg>[1]) => translateMsg(lang, m);
  const out: string[] = ["OneDoor", "=".repeat(40), t(`pathway.${r.pathway}`), ""];
  if (r.householdLink) out.push(`★ ${t("link.badge")}: ${t("link.text")}`, "");
  if (r.enrollment !== "NA") out.push(t(`enroll.${r.enrollment}`), "");
  const d = discountText(r, lang);
  if (d) out.push(`${t("res.discount")}: ${d} ${t("res.perMonth")} (${t("res.discountSource", { tier: r.tier ?? "" })})`, "");
  out.push(`${t("res.why")}:`, ...r.why.map((w) => `- ${tm(w)}`), "");
  if (r.documents.length) out.push(`${t("res.docs")}:`, ...r.documents.map((w) => `[ ] ${tm(w)}`), "");
  if (r.nextSteps.length) out.push(`${t("res.next")}:`, ...r.nextSteps.map((w) => `- ${tm(w)}`), "");
  if (r.renewalMonths) {
    const date = fmtDate(addMonths(opts.now ?? new Date(), r.renewalMonths), lang);
    out.push(`${t("res.renewal")}: ${t("res.renewalText", { months: r.renewalMonths, date })}`, "");
  }
  if (opts.ref) out.push(`${t("consent.ref")}: ${opts.ref}`, "");
  out.push(t("res.help"));
  return out.join("\n");
}
