import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SMART_LINK_TYPES } from "./config";

export async function getSmartLinksAdmin(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("business_smart_links").select("*").eq("business_id", businessId).in("type", [...SMART_LINK_TYPES]).order("sort_order");
  if (error) throw new Error("Unable to load Smart Links.");
  return data;
}

export async function getPaymentMethodsAdmin(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("business_payment_qrs").select("*").eq("business_id", businessId).order("sort_order");
  if (error) throw new Error("Unable to load payment methods.");
  return data;
}

export async function getSmartMetrics(businessId: string) {
  const supabase = await createServerSupabaseClient();
  const methods = await getPaymentMethodsAdmin(businessId);
  const counts = await Promise.all([
    supabase.from("smart_link_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "SMART_PAGE_VIEW"),
    supabase.from("smart_link_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "PAYMENT_PAGE_VIEW"),
    supabase.from("smart_link_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "PAYMENT_QR_VIEW"),
    ...SMART_LINK_TYPES.map(type => supabase.from("smart_link_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "SMART_LINK_CLICK").eq("link_type", type)),
    ...methods.map(method => supabase.from("smart_link_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "PAYMENT_QR_VIEW").eq("payment_method_id", method.id)),
  ]);
  if (counts.some(result => result.error)) throw new Error("Unable to load Smart Links metrics.");
  return { views: counts[0].count ?? 0, paymentPageViews: counts[1].count ?? 0, paymentQrViews: counts[2].count ?? 0,
    clicks: counts.slice(3, 3 + SMART_LINK_TYPES.length).reduce((sum,row) => sum + (row.count ?? 0), 0),
    byType: SMART_LINK_TYPES.map((type,i) => ({ type, count: counts[i+3].count ?? 0 })),
    paymentViews: methods.map((method,i) => ({ id: method.id, name: method.name, count: counts[i+3+SMART_LINK_TYPES.length].count ?? 0 })),
  };
}
