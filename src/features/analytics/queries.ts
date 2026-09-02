import "server-only";

import { z } from "zod";

import type { AnalyticsDateRange } from "@/features/analytics/date-range";
import type { BusinessAnalytics, PlatformAnalytics } from "@/features/analytics/types";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const eventCountsSchema = z.object({ google_handoffs: z.number(), page_views: z.number(), review_starts: z.number(), reviews_generated: z.number(), reviews_regenerated: z.number() });
const trendSchema = z.array(z.object({ date: z.string(), googleHandoffs: z.number(), pageViews: z.number(), reviewStarts: z.number(), reviewsGenerated: z.number() }));
const recentSchema = z.array(z.object({ business_id: z.string().optional(), business_name: z.string().optional(), created_at: z.string(), event_type: z.enum(["REVIEW_GENERATED", "REVIEW_REGENERATED", "GOOGLE_REVIEW_CLICK"]) }));
const businessAnalyticsSchema = z.object({ events: eventCountsSchema, recentActivity: recentSchema, trend: trendSchema });
const platformAnalyticsSchema = businessAnalyticsSchema.extend({
  businesses: z.object({ active: z.number(), archived: z.number(), suspended: z.number(), total: z.number() }),
  subscriptionAlerts: z.array(z.object({ business_id: z.string(), business_name: z.string(), expires_at: z.string(), status: z.string(), window: z.enum(["EXPIRED", "TODAY", "WITHIN_3_DAYS", "WITHIN_7_DAYS", "WITHIN_30_DAYS"]) })),
  subscriptions: z.object({ expired: z.number(), expires_today: z.number(), within_3_days: z.number(), within_7_days: z.number(), within_30_days: z.number() }),
});

export async function getPlatformAnalytics(range: AnalyticsDateRange): Promise<PlatformAnalytics> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_platform_analytics", { p_from: range.from.toISOString(), p_to: range.to.toISOString() });
  if (error) throw new Error("Unable to load platform analytics.");
  const parsed = platformAnalyticsSchema.safeParse(data);
  if (!parsed.success) throw new Error("Platform analytics returned an invalid response.");
  return parsed.data;
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
