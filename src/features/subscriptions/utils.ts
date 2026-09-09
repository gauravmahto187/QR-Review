import type { Database, Tables } from "@/types/database";

export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

export type Subscription = Tables<"subscriptions">;
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type ExpiringWindow = "TODAY" | "WITHIN_7_DAYS" | "WITHIN_15_DAYS" | "WITHIN_30_DAYS" | null;

const DAY_MS = 24 * 60 * 60 * 1000;

function nepalDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: NEPAL_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getSubscriptionTiming(subscription: Subscription | null, now = new Date()) {
  if (!subscription) {
    return { daysRemaining: null, effectiveStatus: null, expiresToday: false, expiringWindow: null as ExpiringWindow, isExpired: false, isExpiringSoon: false };
  }

  const expiresAt = new Date(subscription.expires_at);
  const remainingMs = expiresAt.getTime() - now.getTime();
  const isExpired = remainingMs <= 0 || subscription.status === "EXPIRED";
  const daysRemaining = isExpired ? 0 : Math.ceil(remainingMs / DAY_MS);
  const expiresToday = !isExpired && nepalDateKey(expiresAt) === nepalDateKey(now);
  let expiringWindow: ExpiringWindow = null;

  if (!isExpired && ["TRIAL", "ACTIVE"].includes(subscription.status)) {
    if (expiresToday) expiringWindow = "TODAY";
    else if (remainingMs <= 7 * DAY_MS) expiringWindow = "WITHIN_7_DAYS";
    else if (remainingMs <= 15 * DAY_MS) expiringWindow = "WITHIN_15_DAYS";
    else if (remainingMs <= 30 * DAY_MS) expiringWindow = "WITHIN_30_DAYS";
  }

  return {
    daysRemaining,
    effectiveStatus: isExpired ? ("EXPIRED" as const) : subscription.status,
    expiresToday,
    expiringWindow,
    isExpired,
    isExpiringSoon: expiringWindow !== null,
  };
}

export function formatNepalDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: NEPAL_TIME_ZONE,
  }).format(new Date(value));
}

export function formatNepalDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeZone: NEPAL_TIME_ZONE,
  }).format(new Date(value));
}

export function getExpiringLabel(window: ExpiringWindow) {
  if (window === "TODAY") return "Expires today";
  if (window === "WITHIN_7_DAYS") return "Expires within 7 days";
  if (window === "WITHIN_15_DAYS") return "Expires within 15 days";
  if (window === "WITHIN_30_DAYS") return "Expires within 30 days";
  return null;
}
