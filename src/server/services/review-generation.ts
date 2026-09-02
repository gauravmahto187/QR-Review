import "server-only";

import { createHash } from "node:crypto";

import type { PublicGeneration } from "@/features/public-review/types";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { logger } from "@/lib/observability/logger";
import { getReviewProvider } from "@/server/ai";
import { AIProviderError } from "@/server/ai/errors";
import { PROMPT_VERSION } from "@/server/ai/prompt";
import type { GenerateReviewInput } from "@/server/ai/types";
import { loadExistingPublicSession, resolvePublicReview } from "@/server/services/public-review";

function providerFailure(error: unknown) {
  const code = error instanceof AIProviderError ? error.code : "GENERATION_FAILED";
  return { code, message: "We couldn’t generate your review right now. Please try again." };
}

function reservationFailure(message?: string) {
  if (message?.includes("GENERATION_LIMIT_REACHED")) return "You have already created both available review versions.";
  if (message?.includes("GENERATION_IN_PROGRESS")) return "Your review is already being generated. Please wait a moment.";
  if (message?.includes("GENERATION_RATE_LIMITED")) return "Please wait a few seconds before trying again.";
  if (message?.includes("GENERATION_ATTEMPT_LIMIT_REACHED")) return "Review generation is temporarily unavailable for this session.";
  if (message?.includes("GENERATION_SESSION_INVALID")) return "Your review session expired. Please refresh to start again.";
  return "We couldn’t start review generation. Please try again.";
}

async function resolveInput(slug: string) {
  const resolved = await resolvePublicReview(slug);
  if (resolved.kind !== "READY") throw new Error("BUSINESS_UNAVAILABLE");
  const session = await loadExistingPublicSession(resolved.business.id);
  if (!session || !session.completed_at) throw new Error("SESSION_INVALID");

  const answers = session.answers && !Array.isArray(session.answers) && typeof session.answers === "object" ? session.answers : {};
  if (Object.keys(answers).length !== resolved.questions.length) throw new Error("ANSWERS_INVALID");
  const optionIds = resolved.questions.map((question) => answers[question.id]).filter((value): value is string => typeof value === "string");
  if (optionIds.length !== resolved.questions.length) throw new Error("ANSWERS_INVALID");

  const supabase = createPrivilegedSupabaseClient();
  const { data: options, error } = await supabase.from("review_question_options").select("id, question_id, label, value").in("id", optionIds).eq("is_active", true);
  if (error || options.length !== optionIds.length) throw new Error("ANSWERS_INVALID");

  const input: GenerateReviewInput = {
    answers: resolved.questions.map((question) => {
      const option = options.find((item) => item.id === answers[question.id] && item.question_id === question.id);
      if (!option || !question.options.some((item) => item.id === option.id)) throw new Error("ANSWERS_INVALID");
      return { optionLabel: option.label, optionValue: option.value, question: question.question };
    }),
    businessName: resolved.business.name,
    language: session.generation_language,
    promptVersion: PROMPT_VERSION,
  };
  return { business: resolved.business, input, session, supabase };
}

export async function generatePublicReview(slug: string): Promise<{ error?: string; generation?: PublicGeneration }> {
  const startedAt = performance.now();
  let generationId: string | null = null;
  let supabase: ReturnType<typeof createPrivilegedSupabaseClient> | null = null;
  try {
    const context = await resolveInput(slug);
    supabase = context.supabase;
    const provider = getReviewProvider();
    const inputHash = createHash("sha256").update(JSON.stringify(context.input)).digest("hex");
    const { data: reservation, error: reserveError } = await supabase.rpc("reserve_review_generation", {
      p_business_id: context.business.id,
      p_input_hash: inputHash,
      p_language: context.input.language,
      p_model: provider.model,
      p_prompt_version: PROMPT_VERSION,
      p_provider: provider.name,
      p_session_id: context.session.id,
    });
    if (reserveError || !reservation?.[0]) {
      const code = reserveError?.message?.includes("GENERATION_RATE_LIMITED") ? "GENERATION_RATE_LIMIT" : "GENERATION_RESERVATION_FAILED";
      logger.warn("review_generation.reservation_failed", { code, durationMs: Math.round(performance.now() - startedAt) });
      return { error: reservationFailure(reserveError?.message) };
    }
    generationId = reservation[0].generation_id;
    const generationNumber = reservation[0].generation_number as 1 | 2;

    let generated;
    try {
      generated = await provider.generate(context.input);
    } catch (error) {
      const failure = providerFailure(error);
      logger.warn("review_generation.provider_failed", { code: failure.code, durationMs: Math.round(performance.now() - startedAt), model: provider.model, provider: provider.name });
      await supabase.rpc("finish_review_generation", { p_error_code: failure.code, p_generated_text: null, p_generation_id: generationId, p_status: "FAILED" });
      return { error: failure.message };
    }

    const { error: finishError } = await supabase.rpc("finish_review_generation", { p_error_code: null, p_generated_text: generated.text, p_generation_id: generationId, p_status: "SUCCEEDED" });
    if (finishError) {
      logger.error("review_generation.persistence_failed", { code: "GENERATION_PERSISTENCE_FAILED", durationMs: Math.round(performance.now() - startedAt) });
      return { error: "We couldn’t generate your review right now. Please try again." };
    }

    const eventType = generationNumber === 1 ? "REVIEW_GENERATED" : "REVIEW_REGENERATED";
    await supabase.from("analytics_events").insert({ business_id: context.business.id, event_type: eventType, metadata: { generation_number: generationNumber }, session_id: context.session.id });
    logger.info("review_generation.completed", { durationMs: Math.round(performance.now() - startedAt), generationNumber, provider: provider.name });
    return { generation: { canRegenerate: generationNumber < 2, generationNumber, language: context.input.language, text: generated.text } };
  } catch (error) {
    if (generationId && supabase) await supabase.rpc("finish_review_generation", { p_error_code: "GENERATION_FAILED", p_generated_text: null, p_generation_id: generationId, p_status: "FAILED" });
    const message = error instanceof Error ? error.message : "";
    if (message === "SESSION_INVALID") return { error: "Your review session expired. Please refresh to start again." };
    if (message === "BUSINESS_UNAVAILABLE") return { error: "This review form is no longer available." };
    if (message === "ANSWERS_INVALID") return { error: "Your saved answers are no longer valid. Please start a new review." };
    logger.error("review_generation.failed", { reason: "unexpected" });
    return { error: "We couldn’t generate your review right now. Please try again." };
  }
}
