import { NextResponse } from "next/server";
import { anthropic, LLM_MODEL, llmConfigured } from "@/lib/server/llm";
import { parseWithRules, sanitizeParsed } from "@/lib/screener/parse";
import { BENEFITS } from "@/lib/rules/config";

const TOOL = {
  name: "record_household",
  description: "Record the household facts stated in the text. Leave out anything not stated. Do not judge eligibility.",
  input_schema: {
    type: "object" as const,
    properties: {
      borough: { type: "string", enum: ["bronx", "brooklyn", "manhattan", "queens", "staten_island"] },
      zip: { type: "string", description: "5-digit ZIP if stated" },
      bill: { type: "string", enum: ["me", "other", "landlord", "unknown"], description: "Whose name the Con Edison bill is in" },
      heatType: { type: "string", enum: ["gas_heat", "electric_heat", "electric_only", "electric_gas_cooking", "unknown"] },
      people: {
        type: "array",
        description: "Everyone in the home. The first item is the writer, with relationship 'self'.",
        items: {
          type: "object",
          properties: {
            relationship: { type: "string", enum: ["self", "spouse", "parent", "child", "grandparent", "sibling", "other_relative", "roommate"] },
            ageBand: { type: "string", enum: ["under18", "18to59", "60plus"] },
            benefits: { type: "array", items: { type: "string", enum: [...BENEFITS] } },
            isBillHolder: { type: "boolean" },
          },
          required: ["relationship", "benefits"],
        },
      },
      householdSize: { type: "integer" },
      annualIncome: { type: "number", description: "Total yearly household income in USD before taxes (convert monthly x12)" },
    },
    required: ["people"],
  },
};

export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || !text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  const input = text.slice(0, 2000);

  if (llmConfigured()) {
    try {
      const msg = await anthropic().messages.create({
        model: LLM_MODEL,
        max_tokens: 800,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        system:
          "You extract structured facts about a New York City household from a description that may be in any language. " +
          "Benefit codes: SNAP, MEDICAID, SSI, HEAP, TANF_SNA (cash assistance/Safety Net), PUBLIC_HOUSING (NYCHA/Section 8), VETERANS, LIFELINE, HRA_UTILITY_PAY. " +
          "Only record what is stated. Never decide or comment on eligibility.",
        messages: [{ role: "user", content: input }],
      });
      const block = msg.content.find((b) => b.type === "tool_use");
      if (block && block.type === "tool_use") {
        return NextResponse.json({ parsed: sanitizeParsed(block.input), source: "llm" });
      }
    } catch (e) {
      console.warn("[parse] LLM failed, using rules:", (e as Error).message);
    }
  }
  return NextResponse.json({ parsed: sanitizeParsed(parseWithRules(input)), source: "rules" });
}
