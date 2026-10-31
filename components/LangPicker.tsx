"use client";

import { LANGS, LANG_NAMES, type Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export function LangPicker({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-teal-700" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>
      <span className="sr-only">{t("nav.language")}</span>
      <select
        aria-label={t("nav.language")}
        data-testid="lang-picker"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm font-medium text-ink"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
