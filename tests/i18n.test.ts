import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { DICTS, LANGS, translateMsg } from "@/lib/i18n";
import { screen } from "@/lib/rules/engine";
import { PERSONAS } from "@/lib/rules/personas";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  for (const lang of LANGS) {
    it(`${lang} has every key with matching placeholders`, () => {
      const dict = DICTS[lang] as Record<string, string>;
      for (const [key, value] of Object.entries(en)) {
        expect(dict[key], `${lang}:${key}`).toBeTypeOf("string");
        expect(placeholders(dict[key]), `${lang}:${key}`).toEqual(placeholders(value));
      }
      expect(Object.keys(dict).filter((k) => !(k in en))).toEqual([]);
    });
  }

  it("every engine message key exists and fully interpolates", () => {
    for (const p of Object.values(PERSONAS)) {
      const r = screen(p.input);
      for (const m of [...r.why, ...r.documents, ...r.nextSteps]) {
        expect(m.key in en, m.key).toBe(true);
        for (const lang of LANGS) expect(translateMsg(lang, m)).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
