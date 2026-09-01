"use server";

import { z } from "zod";

import type { PublicReviewActionState } from "@/features/public-review/types";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { createPublicSession, loadExistingPublicSession, publicSessionFromRow, resolvePublicReview } from "@/server/services/public-review";
import { generatePublicReview } from "@/server/services/review-generation";

const slugSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idSchema = z.uuid();

async function recordReviewStarted(businessId: string, sessionId: string) {
  const supabase = createPrivilegedSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({ business_id: businessId, event_type: "REVIEW_STARTED", metadata: {}, session_id: sessionId });
  if (error?.code !== "23505") return;
}

export async function startPublicReviewAction(slug: string, _state: PublicReviewActionState): Promise<PublicReviewActionState> {
  void _state;
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return { error: "This review page is unavailable." };
  try {
    const resolved = await resolvePublicReview(parsedSlug.data);
    if (resolved.kind !== "READY") return { error: "This review form is not available right now." };
    const session = (await loadExistingPublicSession(resolved.business.id)) ?? (await createPublicSession(resolved.business.id));
    await recordReviewStarted(resolved.business.id, session.id);
    return { session: publicSessionFromRow(session) };
  } catch {
    return { error: "We couldn’t start your review. Please try again." };
  }
}

export async function savePublicAnswerAction(slug: string, questionId: string, optionId: string): Promise<PublicReviewActionState> {
  if (!slugSchema.safeParse(slug).success || !idSchema.safeParse(questionId).success || !idSchema.safeParse(optionId).success) return { error: "That answer could not be saved." };
  try {
    const resolved = await resolvePublicReview(slug);
    if (resolved.kind !== "READY") return { error: "This review form is no longer available." };
    const session = await loadExistingPublicSession(resolved.business.id);
    if (!session) return { error: "Your review session expired. Please refresh to start again." };
    const question = resolved.questions.find((item) => item.id === questionId);
    if (!question?.options.some((option) => option.id === optionId)) return { error: "That answer is no longer available." };
    const currentAnswers = session.answers && !Array.isArray(session.answers) && typeof session.answers === "object" ? session.answers : {};
    const answers = { ...currentAnswers, [questionId]: optionId };
    if (Object.keys(answers).length > 5) return { error: "Too many answers were submitted." };
    const supabase = createPrivilegedSupabaseClient();
    const { data, error } = await supabase.from("review_sessions").update({ answers }).eq("id", session.id).eq("business_id", resolved.business.id).select("*").single();
    if (error) throw error;
    return { session: publicSessionFromRow(data) };
  } catch {
    return { error: "That answer could not be saved. Please try again." };
  }
}

export async function completePublicReviewAction(slug: string, language: "en" | "ne"): Promise<PublicReviewActionState> {
  if (!slugSchema.safeParse(slug).success || !z.enum(["en", "ne"]).safeParse(language).success) return { error: "Choose a valid review language." };
  try {
    const resolved = await resolvePublicReview(slug);
    if (resolved.kind !== "READY") return { error: "This review form is no longer available." };
    const session = await loadExistingPublicSession(resolved.business.id);
    if (!session) return { error: "Your review session expired. Please refresh to start again." };
    const answers = session.answers && !Array.isArray(session.answers) && typeof session.answers === "object" ? session.answers : {};
    const complete = resolved.questions.every((question) => typeof answers[question.id] === "string" && question.options.some((option) => option.id === answers[question.id]));
    if (!complete || Object.keys(answers).length !== resolved.questions.length) return { error: "Please answer every question before continuing." };
    const supabase = createPrivilegedSupabaseClient();
    const { data, error } = await supabase.from("review_sessions").update({ completed_at: new Date().toISOString(), generation_language: language }).eq("id", session.id).eq("business_id", resolved.business.id).select("*").single();
    if (error) throw error;
    return { session: publicSessionFromRow(data) };
  } catch {
    return { error: "We couldn’t finish this step. Please try again." };
  }
}

export async function generatePublicReviewAction(slug: string): Promise<PublicReviewActionState> {
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return { error: "This review page is unavailable." };
  return generatePublicReview(parsedSlug.data);
}
