import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/env/public";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const { publishableKey, url } = getSupabasePublicConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
