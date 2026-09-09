import "server-only";

import type { SubscriptionAlertBucket } from "@/features/subscriptions/alert-buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { evaluateBusinessAvailability } from "@/server/services/business-availability";
import { getSubscriptionTiming } from "@/features/subscriptions/utils";

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

export async function getSubscriptionAlerts(bucket: SubscriptionAlertBucket) {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_subscription_alerts", { p_bucket: bucket });
  if (!error) return data ?? [];

  const [{ data: subscriptions, error: subscriptionsError }, { data: businesses, error: businessesError }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("is_current", true),
    supabase.from("businesses").select("id, name"),
  ]);
  if (subscriptionsError || businessesError) throw new Error("Unable to load subscription alerts.");
  const businessNames = new Map((businesses ?? []).map((business) => [business.id, business.name]));
  const now = new Date();
  return (subscriptions ?? []).filter((subscription) => {
    const timing = getSubscriptionTiming(subscription, now);
    if (bucket === "expired") return timing.isExpired;
    if (bucket === "today") return timing.expiringWindow === "TODAY";
    if (bucket === "7-days") return timing.expiringWindow === "WITHIN_7_DAYS";
    if (bucket === "15-days") return timing.expiringWindow === "WITHIN_15_DAYS";
    return timing.expiringWindow === "WITHIN_30_DAYS";
  }).map((subscription) => ({
    business_id: subscription.business_id,
    business_name: businessNames.get(subscription.business_id) ?? "Business",
    expires_at: subscription.expires_at,
    status: subscription.status,
  })).sort((a, b) => a.expires_at.localeCompare(b.expires_at));
}
