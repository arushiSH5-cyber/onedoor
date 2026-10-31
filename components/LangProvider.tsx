"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANG_TAGS, isLang, translate, translateMsg, type Lang, type MessageKey } from "@/lib/i18n";
import type { Msg } from "@/lib/rules/engine";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey | string, params?: Record<string, string | number>) => string;
  tm: (msg: Msg) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "onedoor-lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // ?lang= wins (shareable links, tests), then the saved choice.
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const initial = isLang(fromUrl) ? fromUrl : isLang(saved) ? saved : null;
    if (initial) setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANG_TAGS[lang];
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(lang, key, params), [lang]);
  const tm = useCallback((msg: Msg) => translateMsg(lang, msg), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t, tm }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
