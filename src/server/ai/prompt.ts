import type { GenerateReviewInput } from "@/server/ai/types";

export const PROMPT_VERSION = "v2";

const STYLE_GUIDANCE: Record<NonNullable<GenerateReviewInput["style"]>, string> = {
  concise: "Use a direct, compact opening and one or two clear sentences.",
  conversational: "Use a relaxed, natural opening that sounds like a person sharing a quick thought.",
  warm: "Use a warm but restrained opening and put the most positive selected point first.",
  neutral: "Use a balanced, matter-of-fact opening and avoid promotional language.",
  "experience-led": "Open with the experience, then mention selected details in a natural order.",
  "recommendation-led": "End with a measured suggestion for others only if the selected evidence supports it.",
};

export function buildReviewPrompt(input: GenerateReviewInput) {
  const language = input.language === "ne" ? "natural Nepali (Devanagari)" : "English";
  const evidence = input.answers.map((answer, index) => `${index + 1}. ${answer.question}: ${answer.optionLabel} (${answer.optionValue})`).join("\n");

  const style = input.style ?? "conversational";
  const previous = input.previousReview ? `\nPrevious version (use only to avoid repeating its wording; do not copy it):\n${input.previousReview}\n` : "";
  return `Write one concise Google Review in ${language} for ${JSON.stringify(input.businessName)}.

Requirements:
- Aim for 30–50 words.
- Sound natural, specific, and balanced, not excessively promotional.
- Use only facts supported by the evidence below. Do not invent visits, purchases, staff names, locations, or other details.
- Avoid emojis, headings, quotation marks, bullet points, and repetitive wording.
- Generation style: ${style}. ${STYLE_GUIDANCE[style]}
- Vary the opening, sentence structure, ordering, and length naturally. Aim for roughly 30–50 words without forcing an exact count.
- Avoid relying on overused phrases such as “Great experience”, “Highly recommended”, “Amazing service”, “Would definitely recommend”, and “Very satisfied”.
- Never add facts beyond the evidence. For Nepali, write simple conversational Nepali rather than literal translated English.
- Return only the review text.

Customer-selected evidence:
${evidence}${previous}`;
}
