import "server-only";

import { z } from "zod";
import type { SubscriptionAlertBucket } from "@/features/subscriptions/alert-buckets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { evaluateBusinessAvailability } from "@/server/services/business-availability";

const subscriptionAlertSchema = z.object({ business_id: z.string(), business_name: z.string(), expires_at: z.string(), status: z.string() });
const subscriptionAlertPageSchema = z.object({ total: z.number(), items: z.array(subscriptionAlertSchema) });

export async function getSubscriptionManagementData(businessId: string, page = 1, pageSize = 10) {
  const supabase = await createServerSupabaseClient();
  const [{ data: business, error: businessError }, { data: currentRows, error: currentError }, { data: subscriptions, error: subscriptionsError, count: historyTotal }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("business_id", businessId).eq("is_current", true).maybeSingle(),
    supabase.from("subscriptions").select("*", { count: "exact" }).eq("business_id", businessId).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1),
  ]);

  if (businessError || currentError || subscriptionsError) throw new Error("Unable to load subscription management.");
  if (!business) return null;
  const current = currentRows ?? null;

  return {
    availability: evaluateBusinessAvailability(business.status, current),
    business,
    current,
    history: subscriptions ?? [],
    historyTotal: historyTotal ?? 0,
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

export async function getSubscriptionAlerts(bucket: SubscriptionAlertBucket, page = 1, pageSize = 10) {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_subscription_alerts_page", { p_bucket: bucket, p_page: page, p_page_size: pageSize });
  if (!error) {
    const parsed = subscriptionAlertPageSchema.safeParse(data);
    if (!parsed.success) throw new Error("Subscription alerts returned an invalid response.");
    return parsed.data;
  }

  const { data: legacyData, error: legacyError } = await supabase.rpc("get_subscription_alerts", { p_bucket: bucket }).range((page - 1) * pageSize, page * pageSize - 1);
  if (legacyError) throw new Error("Unable to load subscription alerts.");
  const items = legacyData ?? [];
  const total = items.length === pageSize ? page * pageSize + 1 : (page - 1) * pageSize + items.length;
  return { items, total };
}
