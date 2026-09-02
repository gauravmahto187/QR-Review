import { serverEnv } from "@/lib/env";
import { AIProviderError } from "@/server/ai/errors";
import { normalizeReviewOutput } from "@/server/ai/output";
import { buildReviewPrompt } from "@/server/ai/prompt";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

export class GeminiProvider implements ReviewProvider {
  readonly model = serverEnv.GEMINI_MODEL;
  readonly name = "gemini";

  async generate(input: GenerateReviewInput) {
    if (!serverEnv.GEMINI_API_KEY) throw new AIProviderError("MISSING_CONFIGURATION");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildReviewPrompt(input) }] }],
          generationConfig: { maxOutputTokens: 180, responseMimeType: "text/plain", temperature: 0.7 },
        }),
        headers: { "content-type": "application/json", "x-goog-api-key": serverEnv.GEMINI_API_KEY },
        method: "POST",
        signal: AbortSignal.timeout(serverEnv.AI_TIMEOUT_MS),
      });
      if (!response.ok) throw new AIProviderError("PROVIDER_UNAVAILABLE");
      const payload = await response.json() as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      return { model: this.model, provider: this.name, text: normalizeReviewOutput(text) };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof DOMException && error.name === "TimeoutError") throw new AIProviderError("PROVIDER_TIMEOUT");
      throw new AIProviderError("PROVIDER_UNAVAILABLE");
    }
  }
}
