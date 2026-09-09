import "server-only";
import type { Tables } from "@/types/database";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { evaluateSmartLinksAvailability } from "./smart-links-availability";
import { SMART_LINK_TYPES, normalizeSmartLink, type SmartLinkType } from "@/features/smart-links/config";
import { logger } from "@/lib/observability/logger";

import { validPaymentPath } from "@/features/smart-links/payment-images";

export async function resolveSmartLinks(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const supabase = createPrivilegedSupabaseClient();
  const { data: business, error } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to load business.");
  if (!business) return null;
  const availability = evaluateSmartLinksAvailability(business);
  if (!availability?.valid) return null;
  const { data, error: linksError } = await supabase.from("business_smart_links").select("*").eq("business_id", business.id).eq("is_active", true).in("type", [...SMART_LINK_TYPES]).order("sort_order");
  if (linksError) throw new Error("Unable to load links.");
  const links = data.flatMap<Tables<"business_smart_links">>(link => {
    const url = normalizeSmartLink(link.type, link.url ?? "");
    return url ? [{ ...link, url }] : [];
  });
  const { data: payments, error: paymentError } = await supabase.from("business_payment_qrs").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order");
  if (paymentError) throw new Error("Unable to load payment methods.");
  return { business, links, payments: payments.filter(method => validPaymentPath(method.image_path, business.id, method.id)), supabase };
}

export async function recordSmartEvent(businessId: string, type?: SmartLinkType) {
  try {
    const supabase = createPrivilegedSupabaseClient();
    const { error } = await supabase.from("smart_link_events").insert({ business_id: businessId, event_type: type ? "SMART_LINK_CLICK" : "SMART_PAGE_VIEW", link_type: type ?? null });
    if (error) throw error;
  } catch { logger.error("smart_links.analytics_failed", {}); }
}

export async function recordPaymentEvent(businessId: string, paymentId?: string) {
  try {
    const { error } = await createPrivilegedSupabaseClient().from("smart_link_events").insert({ business_id: businessId, event_type: paymentId ? "PAYMENT_QR_VIEW" : "PAYMENT_PAGE_VIEW", payment_method_id: paymentId ?? null, link_type: null });
    if (error) throw error;
  } catch { logger.error("smart_links.analytics_failed", {}); }
}
