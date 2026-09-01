import { z } from "zod";

export const questionTextSchema = z.string().trim().min(1, "Enter a question.").max(300, "Question must be 300 characters or fewer.");
export const optionLabelSchema = z.string().trim().min(1, "Enter an option label.").max(160, "Label must be 160 characters or fewer.");
export const optionValueSchema = z.string().trim().min(1, "Enter an option value.").max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens only.");

export function optionValueFromLabel(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
}
