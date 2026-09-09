import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentSubscriptionsByBusinessIds } from "@/features/subscriptions/queries";
import type { Database } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];

export async function listBusinesses(filters: {
  search?: string;
  status?: BusinessStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("businesses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.search) {
    const escapedSearch = filters.search.replace(/[\\%_]/g, "\\$&");
    query = query.ilike("name", `%${escapedSearch}%`);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;

  if (error) throw new Error("Unable to load businesses.");
  const subscriptions = await getCurrentSubscriptionsByBusinessIds(data.map((business) => business.id));
  return { businesses: data, subscriptions, supabase, totalCount: count ?? 0 };
}

export async function getBusinessById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Unable to load this business.");
  return { business: data, supabase };
}
