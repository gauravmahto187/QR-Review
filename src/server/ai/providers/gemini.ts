import { serverEnv } from "@/lib/env";
import { AIProviderError, type AIErrorCode } from "@/server/ai/errors";
import { normalizeReviewOutput } from "@/server/ai/output";
import { buildReviewPrompt } from "@/server/ai/prompt";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
};

type GeminiErrorResponse = {
  error?: {
    code?: number;
    details?: Array<{ reason?: string }>;
    message?: string;
    status?: string;
  };
};

function classifyGeminiError(status: number, payload: GeminiErrorResponse): AIErrorCode {
  const providerStatus = payload.error?.status?.toUpperCase() ?? "";
  const reasons = payload.error?.details?.map((detail) => detail.reason?.toUpperCase() ?? "") ?? [];
  const message = payload.error?.message?.toLowerCase() ?? "";

  if (status === 401 || status === 403 || providerStatus.includes("PERMISSION_DENIED")) return "GEMINI_AUTH_ERROR";
  if (status === 404 || providerStatus.includes("NOT_FOUND")) return "GEMINI_MODEL_UNAVAILABLE";
  if (status === 429) {
    const quota = reasons.some((reason) => reason.includes("QUOTA")) || /daily|quota|billing|spend/.test(message);
    return quota ? "GEMINI_QUOTA_ERROR" : "GEMINI_RATE_LIMIT";
  }
  return "GEMINI_UNAVAILABLE";
}

export class GeminiProvider implements ReviewProvider {
  readonly model = serverEnv.GEMINI_MODEL === "gemini-2.5-flash-lite" ? "gemini-3.5-flash-lite" : serverEnv.GEMINI_MODEL;
  readonly name = "gemini";

  async generate(input: GenerateReviewInput) {
    if (!serverEnv.GEMINI_API_KEY) throw new AIProviderError("MISSING_CONFIGURATION");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildReviewPrompt(input) }] }],
          generationConfig: { maxOutputTokens: 180, responseMimeType: "text/plain" },
        }),
        headers: { "content-type": "application/json", "x-goog-api-key": serverEnv.GEMINI_API_KEY },
        method: "POST",
        signal: AbortSignal.timeout(serverEnv.AI_TIMEOUT_MS),
      });

      if (!response.ok) {
        let payload: GeminiErrorResponse = {};
        try { payload = await response.json() as GeminiErrorResponse; } catch { /* Status remains sufficient for a safe code. */ }
        throw new AIProviderError(classifyGeminiError(response.status, payload));
      }

      let payload: GeminiResponse;
      try { payload = await response.json() as GeminiResponse; }
      catch { throw new AIProviderError("GEMINI_INVALID_RESPONSE"); }
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      try {
        return { model: this.model, provider: this.name, text: normalizeReviewOutput(text) };
      } catch (error) {
        if (error instanceof AIProviderError && error.code === "INVALID_RESPONSE") throw new AIProviderError("GEMINI_INVALID_RESPONSE");
        throw error;
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name)) throw new AIProviderError("GEMINI_TIMEOUT");
      throw new AIProviderError("GEMINI_UNAVAILABLE");
    }
  }
}
