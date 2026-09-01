export type ReviewLanguage = "en" | "ne";

export type ReviewAnswer = {
  optionLabel: string;
  optionValue: string;
  question: string;
};

export type GenerateReviewInput = {
  answers: ReviewAnswer[];
  businessName: string;
  language: ReviewLanguage;
  promptVersion: string;
};

export type GeneratedReview = {
  model: string;
  provider: string;
  text: string;
};

export interface ReviewProvider {
  readonly model: string;
  readonly name: string;
  generate(input: GenerateReviewInput): Promise<GeneratedReview>;
}
