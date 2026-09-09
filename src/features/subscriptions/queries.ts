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
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("Invalid subscription alert page.");
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_subscription_alerts_page", { p_bucket: bucket, p_page: page, p_page_size: pageSize });
  if (!error) {
    const parsed = subscriptionAlertPageSchema.safeParse(data);
    if (!parsed.success) throw new Error("Subscription alerts returned an invalid response.");
    return parsed.data;
  }

  // Older deployments may not have the alert RPC migration yet. Do not hide
  // permission, connectivity, or other database failures behind a fallback.
  if (error.code !== "PGRST202" && error.code !== "42883") {
    throw new Error("Unable to load subscription alerts.", { cause: error });
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const nepalOffset = (5 * 60 + 45) * 60 * 1000;
  const tomorrow = new Date((Math.floor((now.getTime() + nepalOffset) / day) + 1) * day - nepalOffset).toISOString();
  const afterDays = (days: number) => new Date(now.getTime() + days * day).toISOString();
  let query = supabase.from("subscriptions")
    .select("business_id, expires_at, status", { count: "exact" })
    .eq("is_current", true);

  if (bucket === "expired") {
    query = query.or(`status.eq.EXPIRED,expires_at.lte.${now.toISOString()}`);
  } else {
    query = query.in("status", ["TRIAL", "ACTIVE"]).gt("expires_at", now.toISOString());
    if (bucket === "today") {
      query = query.lt("expires_at", tomorrow);
    } else {
      query = query.gte("expires_at", tomorrow);
      if (bucket === "7-days") query = query.lte("expires_at", afterDays(7));
      if (bucket === "15-days") query = query.gt("expires_at", afterDays(7)).lte("expires_at", afterDays(15));
      if (bucket === "30-days") query = query.gt("expires_at", afterDays(15)).lte("expires_at", afterDays(30));
    }
  }

  const { data: subscriptions, count, error: subscriptionsError } = await query
    .order("expires_at", { ascending: true }).order("business_id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (subscriptionsError) throw new Error("Unable to load subscription alerts.", { cause: subscriptionsError });
  if (!subscriptions?.length) return { items: [], total: count ?? 0 };

  const { data: businesses, error: businessesError } = await supabase.from("businesses")
    .select("id, name").in("id", subscriptions.map(subscription => subscription.business_id));
  if (businessesError) throw new Error("Unable to load subscription alerts.", { cause: businessesError });
  const names = new Map(businesses?.map(business => [business.id, business.name]));
  const items = subscriptions.map(subscription => {
    const name = names.get(subscription.business_id);
    if (name === undefined) throw new Error("Unable to load subscription alert business.");
    return { ...subscription, business_name: name };
  });
  return { items, total: count ?? 0 };
}
