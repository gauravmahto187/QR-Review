import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSubscriptionTiming, type Subscription } from "@/features/subscriptions/utils";
import type { Database } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];

export type BusinessAvailabilityReason =
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED"
  | "NO_SUBSCRIPTION"
  | "BUSINESS_SUSPENDED"
  | "BUSINESS_ARCHIVED";

export type BusinessAvailability = {
  businessStatus: BusinessStatus;
  reason: BusinessAvailabilityReason;
  subscriptionStatus: Database["public"]["Enums"]["subscription_status"] | null;
  valid: boolean;
};

export function evaluateBusinessAvailability(
  businessStatus: BusinessStatus,
  subscription: Subscription | null,
  now = new Date(),
): BusinessAvailability {
  if (businessStatus === "ARCHIVED") {
    return { businessStatus, reason: "BUSINESS_ARCHIVED", subscriptionStatus: subscription?.status ?? null, valid: false };
  }
  if (businessStatus === "SUSPENDED") {
    return { businessStatus, reason: "BUSINESS_SUSPENDED", subscriptionStatus: subscription?.status ?? null, valid: false };
  }
  if (!subscription) {
    return { businessStatus, reason: "NO_SUBSCRIPTION", subscriptionStatus: null, valid: false };
  }

  const timing = getSubscriptionTiming(subscription, now);
  if (timing.isExpired) {
    return { businessStatus, reason: "EXPIRED", subscriptionStatus: "EXPIRED", valid: false };
  }
  if (subscription.status === "SUSPENDED") {
    return { businessStatus, reason: "SUSPENDED", subscriptionStatus: subscription.status, valid: false };
  }
  if (subscription.status === "CANCELLED") {
    return { businessStatus, reason: "CANCELLED", subscriptionStatus: subscription.status, valid: false };
  }
  if (subscription.status !== "TRIAL" && subscription.status !== "ACTIVE") {
    return { businessStatus, reason: "EXPIRED", subscriptionStatus: subscription.status, valid: false };
  }

  return { businessStatus, reason: "ACTIVE", subscriptionStatus: subscription.status, valid: true };
}

export async function getBusinessAvailability(
  supabase: SupabaseClient<Database>,
  businessId: string,
  now = new Date(),
) {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, status")
    .eq("id", businessId)
    .maybeSingle();
  if (businessError) throw new Error("Unable to evaluate business availability.");
  if (!business) return null;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_current", true)
    .maybeSingle();
  if (subscriptionError) throw new Error("Unable to evaluate business availability.");

  return evaluateBusinessAvailability(business.status, subscription, now);
}
