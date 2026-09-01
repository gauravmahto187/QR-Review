import type { GenerateReviewInput } from "@/server/ai/types";

export const PROMPT_VERSION = "v1";

export function buildReviewPrompt(input: GenerateReviewInput) {
  const language = input.language === "ne" ? "natural Nepali (Devanagari)" : "English";
  const evidence = input.answers.map((answer, index) => `${index + 1}. ${answer.question}: ${answer.optionLabel} (${answer.optionValue})`).join("\n");

  return `Write one concise Google Review in ${language} for ${JSON.stringify(input.businessName)}.

Requirements:
- Aim for 30–50 words.
- Sound natural, specific, and balanced, not excessively promotional.
- Use only facts supported by the evidence below. Do not invent visits, purchases, staff names, locations, or other details.
- Avoid emojis, headings, quotation marks, bullet points, and repetitive wording.
- Return only the review text.

Customer-selected evidence:
${evidence}`;
}
