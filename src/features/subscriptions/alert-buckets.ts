export const ALERT_BUCKETS = [
  { key: "expired", label: "Expired", countKey: "expired" },
  { key: "today", label: "Today", countKey: "expires_today" },
  { key: "7-days", label: "Within 7 Days", countKey: "within_7_days" },
  { key: "15-days", label: "Within 15 Days", countKey: "within_15_days" },
  { key: "30-days", label: "Within 30 Days", countKey: "within_30_days" },
] as const;

export type SubscriptionAlertBucket = (typeof ALERT_BUCKETS)[number]["key"];

export function getAlertBucket(value: string) {
  return ALERT_BUCKETS.find((bucket) => bucket.key === value) ?? null;
}
