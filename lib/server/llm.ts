import Anthropic from "@anthropic-ai/sdk";

/** The LLM is used ONLY to parse free text into form fields and to translate text. It never decides eligibility. */
export const LLM_MODEL = "claude-sonnet-5-5";

export const llmConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
export function anthropic() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
