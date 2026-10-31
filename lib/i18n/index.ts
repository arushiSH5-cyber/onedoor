import { en, type MessageKey, type Messages } from "./en";
import es from "./locales/es.json";
import zh from "./locales/zh.json";
import bn from "./locales/bn.json";
import ru from "./locales/ru.json";
import ht from "./locales/ht.json";
import ko from "./locales/ko.json";
import type { Msg } from "@/lib/rules/engine";

export const LANGS = ["en", "es", "zh", "bn", "ru", "ht", "ko"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
  bn: "বাংলা",
  ru: "Русский",
  ht: "Kreyòl Ayisyen",
  ko: "한국어",
};

/** BCP-47 tags for number/date formatting and the <html lang> attribute. */
export const LANG_TAGS: Record<Lang, string> = {
  en: "en-US",
  es: "es-US",
  zh: "zh-Hans",
  bn: "bn",
  ru: "ru",
  ht: "ht",
  ko: "ko",
};

export const DICTS: Record<Lang, Partial<Messages>> = { en, es, zh, bn, ru, ht, ko };

export function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (LANGS as readonly string[]).includes(x);
}

export function money(n: number, lang: Lang = "en", cents = false): string {
  return new Intl.NumberFormat(LANG_TAGS[lang], {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

export function fmtDate(d: Date, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(LANG_TAGS[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d);
}

function interpolate(s: string, params?: Record<string, string | number>) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

/** Translate a key with optional params, falling back to English. */
export function translate(lang: Lang, key: MessageKey | string, params?: Record<string, string | number>): string {
  const dict = DICTS[lang] as Record<string, string>;
  const s = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  return interpolate(s, params);
}

const MONEY_PARAMS = new Set(["limit", "t5", "t6", "t7", "t5plus", "t6plus", "amount"]);

/** Translate an engine message: localizes relationship/benefit codes and formats money. */
export function translateMsg(lang: Lang, msg: Msg): string {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(msg.params ?? {})) {
    if (k === "relationship") params[k] = translate(lang, `rel.${v}`).toLocaleLowerCase(LANG_TAGS[lang]);
    else if (k === "benefit") params[k] = translate(lang, `benefitShort.${v}`);
    else if (MONEY_PARAMS.has(k) && typeof v === "number") params[k] = money(v, lang);
    else params[k] = v;
  }
  return translate(lang, msg.key, params);
}

export type { MessageKey };
