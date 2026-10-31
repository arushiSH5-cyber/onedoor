import { NextResponse } from "next/server";
import { anthropic, LLM_MODEL, llmConfigured } from "@/lib/server/llm";
import { isLang, LANG_NAMES } from "@/lib/i18n";

/** Translates page text on request. Returns 501 without an API key; the UI then keeps English. */
export async function POST(req: Request) {
  const { texts, lang } = (await req.json().catch(() => ({}))) as { texts?: string[]; lang?: string };
  if (!Array.isArray(texts) || !isLang(lang)) return NextResponse.json({ error: "texts[] and lang required" }, { status: 400 });
  if (lang === "en") return NextResponse.json({ texts });
  if (!llmConfigured()) return NextResponse.json({ error: "Translation needs ANTHROPIC_API_KEY" }, { status: 501 });
  const batch = texts.slice(0, 200).map((s) => String(s).slice(0, 1500));
  try {
    const msg = await anthropic().messages.create({
      model: LLM_MODEL,
      max_tokens: 8000,
      system: `Translate each string in the JSON array into ${LANG_NAMES[lang]} for New York City residents, in plain, friendly language. Keep numbers, dollar amounts, URLs, emails, phone numbers and program names (EAP, EEAP, HEAP, SNAP, SSI, Medicaid, Con Edison) unchanged. Reply with only a JSON array of the same length.`,
      messages: [{ role: "user", content: JSON.stringify(batch) }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const out = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    if (!Array.isArray(out) || out.length !== batch.length) throw new Error("length mismatch");
    return NextResponse.json({ texts: out });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
