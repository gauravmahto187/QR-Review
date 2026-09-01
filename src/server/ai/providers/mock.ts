import { normalizeReviewOutput } from "@/server/ai/output";
import type { GenerateReviewInput, ReviewProvider } from "@/server/ai/types";

export class MockProvider implements ReviewProvider {
  readonly model = "boostup-mock-v1";
  readonly name = "mock";

  async generate(input: GenerateReviewInput) {
    const highlights = input.answers.map((answer) => answer.optionLabel).join(", ");
    const text = input.language === "ne"
      ? `${input.businessName} सँगको मेरो अनुभव उल्लेख गर्न लायक रह्यो। विशेष गरी ${highlights} पक्षहरू मन परे। समग्र प्रक्रिया सहज र व्यवस्थित महसुस भयो। यस्तै सेवा खोजिरहनुभएका अरूलाई पनि मेरो अनुभव उपयोगी हुन सक्छ।`
      : `My experience with ${input.businessName} was worth sharing. What stood out most was ${highlights}. The overall process felt smooth and thoughtfully handled from beginning to end. I hope this helps others understand what they can expect from the business.`;
    return { model: this.model, provider: this.name, text: normalizeReviewOutput(text) };
  }
}
