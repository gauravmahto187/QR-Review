import { normalizeReviewOutput } from "@/server/ai/output";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

export class MockProvider implements ReviewProvider {
  readonly model = "boostup-mock-v1";
  readonly name = "mock";

  async generate(input: GenerateReviewInput) {
    const highlights = input.answers.map((answer) => answer.optionLabel).join(", ");
    const style = input.style ?? "conversational";
    const text = input.language === "ne"
      ? style === "recommendation-led"
        ? `${highlights} पक्षहरूका कारण ${input.businessName} को अनुभव राम्रो लाग्यो। यस्तै कुरा खोज्नेहरूका लागि यो ठाउँ विचार गर्न सकिन्छ।`
        : `${input.businessName} मा ${highlights} कुरा मन परे। समग्र अनुभव सहज र स्वाभाविक लाग्यो, त्यसैले यो अनुभव साझा गर्न मन लाग्यो।`
      : style === "concise"
        ? `${input.businessName} मा ${highlights} कुरा विशेष लाग्यो। समग्र अनुभव सहज रह्यो।`
        : style === "recommendation-led"
          ? `${input.businessName} मा ${highlights} कुरा मन परे। यस्तै अनुभव चाहनेहरूका लागि यो ठाउँ विचार गर्न सकिन्छ।`
          : `What stood out at ${input.businessName} was ${highlights}. The experience felt smooth and natural, so I wanted to share it.`;
    return { model: this.model, provider: this.name, text: normalizeReviewOutput(text) };
  }
}
