import "server-only";

import { createHmac } from "node:crypto";

import { serverEnv, runtimeEnvironment } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";

export type PublicRateLimitScope =
  | "smart-page-view"
  | "smart-link-click"
  | "page-view"
  | "review-start"
  | "review-answer"
  | "review-complete"
  | "review-generate"
  | "review-save"
  | "review-handoff";

const policies: Record<PublicRateLimitScope, { limit: number; windowSeconds: number; critical: boolean }> = {
  "smart-page-view": { critical: false, limit: 60, windowSeconds: 60 },
  "smart-link-click": { critical: false, limit: 120, windowSeconds: 60 },
  "page-view": { critical: false, limit: 60, windowSeconds: 60 },
  "review-start": { critical: true, limit: 12, windowSeconds: 600 },
  "review-answer": { critical: false, limit: 120, windowSeconds: 600 },
  "review-complete": { critical: false, limit: 20, windowSeconds: 600 },
  "review-generate": { critical: true, limit: 6, windowSeconds: 600 },
  "review-save": { critical: false, limit: 30, windowSeconds: 600 },
  "review-handoff": { critical: true, limit: 12, windowSeconds: 600 },
};

function clientFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = request.headers.get("x-real-ip")?.trim();
  const visitor = request.headers.get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("boostup_review_visitor="))
    ?.slice("boostup_review_visitor=".length);
  return `${forwarded ?? direct ?? "unknown"}|${visitor ?? "new"}|${request.headers.get("user-agent")?.slice(0, 120) ?? "unknown"}`;
}

export async function checkPublicRateLimit(request: Request, scope: PublicRateLimitScope) {
  const policy = policies[scope];
  const secret = serverEnv.RATE_LIMIT_SECRET ?? "boostup-local-development-rate-limit-key";
  // Smart Links uses no visitor cookie. Only a keyed, non-reversible limiter hash is persisted.
  const fingerprint = scope.startsWith("smart-")
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown"
    : clientFingerprint(request);
  const keyHash = createHmac("sha256", secret).update(fingerprint).digest("hex");
  try {
    const supabase = createPrivilegedSupabaseClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key_hash: keyHash,
      p_limit: policy.limit,
      p_scope: scope,
      p_window_seconds: policy.windowSeconds,
    });
    if (error) throw error;
    return { allowed: data, retryAfter: policy.windowSeconds };
  } catch {
    logger.error("rate_limit.unavailable", { critical: policy.critical, scope });
    return {
      allowed: !(runtimeEnvironment.isProduction && policy.critical),
      retryAfter: policy.windowSeconds,
    };
  }
}
