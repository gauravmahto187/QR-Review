import "server-only";

import { serverEnv } from "@/lib/env";
import { GeminiProvider } from "@/server/ai/providers/gemini";
import { MockProvider } from "@/server/ai/providers/mock";
import { OpenAIProvider } from "@/server/ai/providers/openai";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

export function getReviewProvider(): ReviewProvider {
  if (serverEnv.AI_PROVIDER === "gemini") return new GeminiProvider();
  if (serverEnv.AI_PROVIDER === "openai") return new OpenAIProvider();
  return new MockProvider();
}

export async function generateReview(input: GenerateReviewInput) {
  return getReviewProvider().generate(input);
}
