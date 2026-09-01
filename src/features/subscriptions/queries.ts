import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateBusinessAvailability } from "@/server/services/business-availability";

export async function getSubscriptionManagementData(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: business, error: businessError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);

  if (businessError || subscriptionsError) throw new Error("Unable to load subscription management.");
  if (!business) return null;
  const current = subscriptions?.find((subscription) => subscription.is_current) ?? null;

  return {
    availability: evaluateBusinessAvailability(business.status, current),
    business,
    current,
    history: subscriptions ?? [],
  };
}

export async function getCurrentSubscriptionsByBusinessIds(businessIds: string[]) {
  if (!businessIds.length) return new Map();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .in("business_id", businessIds)
    .eq("is_current", true);
  if (error) throw new Error("Unable to load business subscriptions.");
  return new Map((data ?? []).map((subscription) => [subscription.business_id, subscription]));
}
