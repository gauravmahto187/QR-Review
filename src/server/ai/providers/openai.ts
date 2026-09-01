import { AIProviderError } from "@/server/ai/errors";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

export class OpenAIProvider implements ReviewProvider {
  readonly model = "not-configured";
  readonly name = "openai";

  async generate(_input: GenerateReviewInput): Promise<never> {
    void _input;
    throw new AIProviderError("UNSUPPORTED_PROVIDER");
  }
}
