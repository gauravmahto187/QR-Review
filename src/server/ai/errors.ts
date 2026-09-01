export type AIErrorCode =
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
