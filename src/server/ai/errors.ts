export type AIErrorCode =
  | "GEMINI_AUTH_ERROR"
  | "GEMINI_INVALID_RESPONSE"
  | "GEMINI_MODEL_UNAVAILABLE"
  | "GEMINI_QUOTA_ERROR"
  | "GEMINI_RATE_LIMIT"
  | "GEMINI_TIMEOUT"
  | "GEMINI_UNAVAILABLE"
  | "MISSING_CONFIGURATION"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "UNSUPPORTED_PROVIDER";

export class AIProviderError extends Error {
  constructor(public readonly code: AIErrorCode) {
    super(code);
    this.name = "AIProviderError";
  }
}
