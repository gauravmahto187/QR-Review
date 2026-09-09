export type AnalyticsEventCounts = {
  google_handoffs: number;
  page_views: number;
  review_starts: number;
  reviews_generated: number;
  reviews_regenerated: number;
};

export type AnalyticsTrendPoint = {
  date: string;
  googleHandoffs: number;
  pageViews: number;
  reviewStarts: number;
  reviewsGenerated: number;
};

export type RecentActivity = {
  business_id?: string;
  business_name?: string;
  created_at: string;
  event_type: "REVIEW_GENERATED" | "REVIEW_REGENERATED" | "GOOGLE_REVIEW_CLICK";
};

export type BusinessAnalytics = {
  events: AnalyticsEventCounts;
  recentActivity: RecentActivity[];
  trend: AnalyticsTrendPoint[];
};

export type PlatformAnalytics = BusinessAnalytics & {
  businesses: { active: number; archived: number; suspended: number; total: number };
  subscriptions: { expired: number; expires_today: number; within_7_days: number; within_15_days: number; within_30_days: number };
};

export function analyticsConversions(events: AnalyticsEventCounts) {
  const rate = (numerator: number, denominator: number) => denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
  return {
    generationRate: rate(events.reviews_generated, events.review_starts),
    googleHandoffRate: rate(events.google_handoffs, events.reviews_generated),
    overallHandoffConversion: rate(events.google_handoffs, events.page_views),
    reviewStartRate: rate(events.review_starts, events.page_views),
  };
}
