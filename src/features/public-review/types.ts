export type PublicOption = { id: string; label: string };
export type PublicQuestion = { id: string; question: string; options: PublicOption[] };
export type PublicSession = {
  answers: Record<string, string>;
  completed: boolean;
  id: string;
  language: "en" | "ne";
};

export type PublicGeneration = {
  canRegenerate: boolean;
  generationNumber: 1 | 2;
  language: "en" | "ne";
  text: string;
};

export type PublicReviewActionState = {
  error?: string;
  generation?: PublicGeneration;
  session?: PublicSession;
};
