import { z } from "zod";

import { AIProviderError } from "@/server/ai/errors";

const outputSchema = z.string().trim().min(20).max(800);

export function normalizeReviewOutput(value: unknown) {
  const parsed = outputSchema.safeParse(value);
  if (!parsed.success) throw new AIProviderError("INVALID_RESPONSE");
  const text = parsed.data.replace(/^(["“])|(["”])$/g, "").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).length;
  if (words < 8 || words > 100) throw new AIProviderError("INVALID_RESPONSE");
  return text;
}
