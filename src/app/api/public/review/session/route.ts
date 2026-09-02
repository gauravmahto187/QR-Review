import { NextResponse } from "next/server";
import { z } from "zod";

import { completePublicReviewAction, generatePublicReviewAction, prepareGoogleHandoffAction, saveFinalReviewAction, savePublicAnswerAction, startPublicReviewAction } from "@/features/public-review/actions";
import { logger } from "@/lib/observability/logger";
import { hasTrustedMutationOrigin } from "@/lib/security/origin";
import { checkPublicRateLimit, type PublicRateLimitScope } from "@/lib/security/rate-limit";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START"), slug: z.string().min(1).max(80) }),
  z.object({ action: z.literal("ANSWER"), slug: z.string().min(1).max(80), questionId: z.uuid(), optionId: z.uuid() }),
  z.object({ action: z.literal("COMPLETE"), slug: z.string().min(1).max(80), language: z.enum(["en", "ne"]) }),
  z.object({ action: z.literal("GENERATE"), slug: z.string().min(1).max(80) }),
  z.object({ action: z.literal("SAVE_TEXT"), slug: z.string().min(1).max(80), finalText: z.string().min(1).max(1200) }),
  z.object({ action: z.literal("HANDOFF"), slug: z.string().min(1).max(80), finalText: z.string().min(1).max(1200) }),
]);

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 8192) return NextResponse.json({ error: "Invalid review request." }, { status: 413 });
  try {
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid review request." }, { status: 400 }); }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    const data = parsed.data;
    const scopes: Record<typeof data.action, PublicRateLimitScope> = {
      ANSWER: "review-answer",
      COMPLETE: "review-complete",
      GENERATE: "review-generate",
      HANDOFF: "review-handoff",
      SAVE_TEXT: "review-save",
      START: "review-start",
    };
    const rateLimitStartedAt = performance.now();
    const rateLimit = await checkPublicRateLimit(request, scopes[data.action]);
    const rateLimitDurationMs = Math.round(performance.now() - rateLimitStartedAt);
    if (!rateLimit.allowed) {
      logger.warn("public_review.rate_limited", { action: data.action, durationMs: Math.round(performance.now() - requestStartedAt), scope: scopes[data.action] });
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { headers: { "Retry-After": String(rateLimit.retryAfter) }, status: 429 },
      );
    }
    const result = data.action === "START"
      ? await startPublicReviewAction(data.slug, {})
      : data.action === "ANSWER"
        ? await savePublicAnswerAction(data.slug, data.questionId, data.optionId)
        : data.action === "COMPLETE"
          ? await completePublicReviewAction(data.slug, data.language)
          : data.action === "GENERATE"
            ? await generatePublicReviewAction(data.slug)
            : data.action === "SAVE_TEXT"
              ? await saveFinalReviewAction(data.slug, data.finalText)
              : await prepareGoogleHandoffAction(data.slug, data.finalText);
    logger.info("public_review.request_completed", {
      action: data.action,
      durationMs: Math.round(performance.now() - requestStartedAt),
      outcome: result.error ? "error" : "success",
      rateLimitDurationMs,
    });
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  } catch {
    logger.error("public_review.request_failed", { route: "/api/public/review/session" });
    return NextResponse.json({ error: "Unable to process this review request." }, { status: 500 });
  }
}
