import "server-only";

import { normalizeGoogleMapsUrl } from "@/features/businesses/schemas";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { loadExistingPublicSession, resolvePublicReview } from "@/server/services/public-review";

type HandoffResult = { error?: string; googleUrl?: string };

export async function prepareReviewHandoff(slug: string, finalText: string, recordGoogleClick: boolean): Promise<HandoffResult> {
  try {
    const resolved = await resolvePublicReview(slug);
    if (resolved.kind !== "READY") return { error: "This review page is no longer available." };
    const session = await loadExistingPublicSession(resolved.business.id);
    if (!session?.completed_at) return { error: "Your review session expired. Please refresh to start again." };
    const googleUrl = normalizeGoogleMapsUrl(resolved.business.google_review_url);
    if (!googleUrl) return { error: "The Google Maps link is unavailable. Please ask the business for help." };

    const supabase = createPrivilegedSupabaseClient();
    const { data: generation, error: generationError } = await supabase.from("review_generations").select("id").eq("session_id", session.id).eq("business_id", resolved.business.id).eq("status", "SUCCEEDED").order("generation_number", { ascending: false }).limit(1).maybeSingle();
    if (generationError || !generation) return { error: "Your generated review could not be found. Please refresh and try again." };

    const { error: saveError } = await supabase.from("review_generations").update({ final_text: finalText, finalized_at: new Date().toISOString() }).eq("id", generation.id).eq("session_id", session.id).eq("business_id", resolved.business.id).eq("status", "SUCCEEDED");
    if (saveError) return { error: "We couldn’t save your review. Your text is still visible so you can copy it manually." };

    if (recordGoogleClick) {
      const timeBucket = Math.floor(Date.now() / 30_000);
      await supabase.from("analytics_events").insert({
        business_id: resolved.business.id,
        dedupe_key: `google:${session.id}:${timeBucket}`,
        event_type: "GOOGLE_REVIEW_CLICK",
        metadata: { meaning: "customer_sent_to_google" },
        session_id: session.id,
      });
    }

    return recordGoogleClick ? { googleUrl } : {};
  } catch {
    return { error: "We couldn’t prepare the next step. Your review is still available to copy manually." };
  }
}
