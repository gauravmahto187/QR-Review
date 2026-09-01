import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];

export async function listBusinesses(filters: {
  search?: string;
  status?: BusinessStatus;
}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.search) {
    const escapedSearch = filters.search.replace(/[\\%_]/g, "\\$&");
    query = query.ilike("name", `%${escapedSearch}%`);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error("Unable to load businesses.");
  return { businesses: data, supabase };
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
