import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getQuestionManagementData(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: business, error: businessError }, { data: questions, error: questionError }] = await Promise.all([
    supabase.from("businesses").select("id, name").eq("id", businessId).maybeSingle(),
    supabase.from("review_questions").select("*").eq("business_id", businessId).is("archived_at", null).order("sort_order"),
  ]);
  if (businessError || questionError) throw new Error("Unable to load review questions.");
  if (!business) return null;

  const questionIds = (questions ?? []).map((question) => question.id);
  const { data: options, error: optionError } = questionIds.length
    ? await supabase.from("review_question_options").select("*").in("question_id", questionIds).order("sort_order")
    : { data: [], error: null };
  if (optionError) throw new Error("Unable to load review options.");

  return {
    business,
    questions: (questions ?? []).map((question) => ({
      ...question,
      options: (options ?? []).filter((option) => option.question_id === question.id),
    })),
  };
}

export async function getQuestionSummary(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("review_questions").select("is_active").eq("business_id", businessId).is("archived_at", null);
  if (error) throw new Error("Unable to load the question summary.");
  return { active: data.filter((item) => item.is_active).length, total: data.length };
}
