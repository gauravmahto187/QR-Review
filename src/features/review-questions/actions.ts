"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { optionLabelSchema, optionValueSchema, questionTextSchema } from "@/features/review-questions/schemas";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReviewActionState = { error?: string; success?: string };
const id = z.uuid();

const questionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CREATE"), businessId: id, question: questionTextSchema }),
  z.object({ action: z.literal("UPDATE"), businessId: id, questionId: id, question: questionTextSchema }),
  z.object({ action: z.literal("SET_ACTIVE"), businessId: id, questionId: id, isActive: z.enum(["true", "false"]) }),
  z.object({ action: z.literal("ARCHIVE"), businessId: id, questionId: id }),
  z.object({ action: z.literal("MOVE"), businessId: id, questionId: id, direction: z.enum(["UP", "DOWN"]) }),
  z.object({ action: z.literal("CREATE_DEFAULTS"), businessId: id }),
]);

const optionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CREATE"), businessId: id, questionId: id, label: optionLabelSchema, value: optionValueSchema, isActive: z.enum(["true", "false"]) }),
  z.object({ action: z.literal("UPDATE"), businessId: id, questionId: id, optionId: id, label: optionLabelSchema, value: optionValueSchema }),
  z.object({ action: z.literal("SET_ACTIVE"), businessId: id, questionId: id, optionId: id, isActive: z.enum(["true", "false"]) }),
  z.object({ action: z.literal("MOVE"), businessId: id, questionId: id, optionId: id, direction: z.enum(["UP", "DOWN"]) }),
]);

function friendlyError(message: string) {
  if (message.includes("at most 5")) return "A business can have at most 5 active questions.";
  if (message.includes("at most 6")) return "A question can have at most 6 options.";
  if (message.includes("at least 2")) return "An active question requires at least 2 active options.";
  if (message.includes("unique") || message.includes("duplicate key")) return "Option values must be unique within a question.";
  if (message.includes("Defaults can only")) return "The default template is available only when no questions exist.";
  return "Unable to update review questions. Refresh and try again.";
}

export async function manageQuestionAction(_state: ReviewActionState, formData: FormData): Promise<ReviewActionState> {
  await requireAdmin();
  const parsed = questionActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid question request." };
  const supabase = await createServerSupabaseClient();
  const data = parsed.data;
  const { error } = await supabase.rpc("apply_review_question_action", {
    p_action: data.action,
    p_business_id: data.businessId,
    p_direction: "direction" in data ? data.direction : null,
    p_is_active: "isActive" in data ? data.isActive === "true" : null,
    p_question: "question" in data ? data.question : null,
    p_question_id: "questionId" in data ? data.questionId : null,
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/admin/businesses/${data.businessId}`);
  revalidatePath(`/admin/businesses/${data.businessId}/questions`);
  return { success: "Questions updated." };
}

export async function manageOptionAction(_state: ReviewActionState, formData: FormData): Promise<ReviewActionState> {
  await requireAdmin();
  const parsed = optionActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid option request." };
  const supabase = await createServerSupabaseClient();
  const data = parsed.data;
  const { error } = await supabase.rpc("apply_review_option_action", {
    p_action: data.action,
    p_business_id: data.businessId,
    p_direction: "direction" in data ? data.direction : null,
    p_is_active: "isActive" in data ? data.isActive === "true" : null,
    p_label: "label" in data ? data.label : null,
    p_option_id: "optionId" in data ? data.optionId : null,
    p_question_id: data.questionId,
    p_value: "value" in data ? data.value : null,
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/admin/businesses/${data.businessId}/questions`);
  return { success: "Options updated." };
}
