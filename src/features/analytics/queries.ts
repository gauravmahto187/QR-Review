import "server-only";

import { z } from "zod";

import type { AnalyticsDateRange } from "@/features/analytics/date-range";
import type { BusinessAnalytics, PlatformAnalytics } from "@/features/analytics/types";
import { getSubscriptionTiming } from "@/features/subscriptions/utils";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const eventCountsSchema = z.object({ google_handoffs: z.number(), page_views: z.number(), review_starts: z.number(), reviews_generated: z.number(), reviews_regenerated: z.number() });
const trendSchema = z.array(z.object({ date: z.string(), googleHandoffs: z.number(), pageViews: z.number(), reviewStarts: z.number(), reviewsGenerated: z.number() }));
const recentSchema = z.array(z.object({ business_id: z.string().optional(), business_name: z.string().optional(), created_at: z.string(), event_type: z.enum(["REVIEW_GENERATED", "REVIEW_REGENERATED", "GOOGLE_REVIEW_CLICK"]) }));
const businessAnalyticsSchema = z.object({ events: eventCountsSchema, recentActivity: recentSchema, trend: trendSchema });
const subscriptionCountsSchema = z.union([
  z.object({ expired: z.number(), expires_today: z.number(), within_7_days: z.number(), within_15_days: z.number(), within_30_days: z.number() }),
  z.object({ expired: z.number(), expires_today: z.number(), within_3_days: z.number(), within_7_days: z.number(), within_30_days: z.number() }),
]);
const platformAnalyticsSchema = businessAnalyticsSchema.extend({
  businesses: z.object({ active: z.number(), archived: z.number(), suspended: z.number(), total: z.number() }),
  subscriptions: subscriptionCountsSchema,
});

async function loadCurrentSubscriptionCounts(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data, error } = await supabase.from("subscriptions").select("*").eq("is_current", true);
  if (error) throw new Error("Unable to load subscription alerts.");
  const counts = { expired: 0, expires_today: 0, within_7_days: 0, within_15_days: 0, within_30_days: 0 };
  for (const subscription of data ?? []) {
    const timing = getSubscriptionTiming(subscription);
    if (timing.isExpired) counts.expired += 1;
    else if (timing.expiringWindow === "TODAY") counts.expires_today += 1;
    else if (timing.expiringWindow === "WITHIN_7_DAYS") counts.within_7_days += 1;
    else if (timing.expiringWindow === "WITHIN_15_DAYS") counts.within_15_days += 1;
    else if (timing.expiringWindow === "WITHIN_30_DAYS") counts.within_30_days += 1;
  }
  return counts;
}

export async function getPlatformAnalytics(range: AnalyticsDateRange): Promise<PlatformAnalytics> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_platform_analytics", { p_from: range.from.toISOString(), p_to: range.to.toISOString() });
  if (error) throw new Error("Unable to load platform analytics.");
  const parsed = platformAnalyticsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Platform analytics returned an invalid response.");
  if ("within_15_days" in parsed.data.subscriptions) {
    const subscriptions = parsed.data.subscriptions as PlatformAnalytics["subscriptions"];
    return { ...parsed.data, subscriptions };
  }
  return { ...parsed.data, subscriptions: await loadCurrentSubscriptionCounts(supabase) };
}

export async function getBusinessAnalytics(businessId: string, range: AnalyticsDateRange): Promise<BusinessAnalytics> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_business_analytics", { p_business_id: businessId, p_from: range.from.toISOString(), p_to: range.to.toISOString() });
  if (error) throw new Error("Unable to load business analytics.");
  const parsed = businessAnalyticsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Business analytics returned an invalid response.");
  return parsed.data;
}
