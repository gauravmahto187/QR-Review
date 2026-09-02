import "server-only";

import { cookies } from "next/headers";

import type { PublicGeneration, PublicQuestion, PublicSession } from "@/features/public-review/types";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { evaluateBusinessAvailability } from "@/server/services/business-availability";
import type { Json, Tables } from "@/types/database";

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function reviewSessionCookieName(businessId: string) {
  return `boostup_review_${businessId}`;
}

function safeAnswers(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string").slice(0, 5));
}

export function publicSessionFromRow(row: Tables<"review_sessions">): PublicSession {
  return {
    answers: safeAnswers(row.answers),
    completed: row.completed_at !== null,
    id: row.anonymous_session_id,
    language: row.generation_language,
  };
}

export async function resolvePublicReview(slug: string) {
  const supabase = createPrivilegedSupabaseClient();
  const { data: business, error: businessError } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (businessError) throw new Error("Unable to load this review page.");
  if (!business) return { kind: "NOT_FOUND" as const };

  const { data: subscription, error: subscriptionError } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).eq("is_current", true).maybeSingle();
  if (subscriptionError) throw new Error("Unable to load this review page.");
  const availability = evaluateBusinessAvailability(business.status, subscription);
  if (!availability.valid) return { business, kind: "UNAVAILABLE" as const };

  const { data: questions, error: questionError } = await supabase.from("review_questions").select("id, question, sort_order").eq("business_id", business.id).eq("is_active", true).is("archived_at", null).order("sort_order");
  if (questionError) throw new Error("Unable to load this review page.");
  const questionIds = questions.map((question) => question.id);
  const { data: options, error: optionError } = questionIds.length
    ? await supabase.from("review_question_options").select("id, question_id, label, sort_order").in("question_id", questionIds).eq("is_active", true).order("sort_order")
    : { data: [], error: null };
  if (optionError) throw new Error("Unable to load this review page.");

  const publicQuestions: PublicQuestion[] = questions.map((question) => ({
    id: question.id,
    options: options.filter((option) => option.question_id === question.id).map(({ id, label }) => ({ id, label })),
    question: question.question,
  })).filter((question) => question.options.length >= 2).slice(0, 5);

  return { business, kind: publicQuestions.length ? ("READY" as const) : ("NO_QUESTIONS" as const), questions: publicQuestions, supabase };
}

export async function loadExistingPublicSession(businessId: string) {
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get(reviewSessionCookieName(businessId))?.value;
  if (!anonymousId) return null;
  const supabase = createPrivilegedSupabaseClient();
  const { data, error } = await supabase.from("review_sessions").select("*").eq("business_id", businessId).eq("anonymous_session_id", anonymousId).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function hasPublicSessionCookie(businessId: string) {
  const cookieStore = await cookies();
  return cookieStore.has(reviewSessionCookieName(businessId));
}

export async function createPublicSession(businessId: string) {
  const supabase = createPrivilegedSupabaseClient();
  const now = new Date();
  const { data, error } = await supabase.from("review_sessions").insert({
    answers: {}, business_id: businessId, expires_at: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(), generation_language: "en", regeneration_count: 0, started_at: now.toISOString(),
  }).select("*").single();
  if (error) throw new Error("Unable to start your review. Please try again.");
  const cookieStore = await cookies();
  cookieStore.set(reviewSessionCookieName(businessId), data.anonymous_session_id, { httpOnly: true, maxAge: SESSION_DURATION_MS / 1000, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return data;
}

export async function loadPublicGeneration(sessionId: string): Promise<PublicGeneration | null> {
  const supabase = createPrivilegedSupabaseClient();
  const { data, error } = await supabase.from("review_generations").select("final_text, generated_text, generation_number, language").eq("session_id", sessionId).eq("status", "SUCCEEDED").order("generation_number", { ascending: false }).limit(1).maybeSingle();
  if (error || !data?.generated_text) return null;
  return {
    canRegenerate: data.generation_number < 2,
    generationNumber: data.generation_number as 1 | 2,
    language: data.language,
    text: data.final_text ?? data.generated_text,
  };
}
