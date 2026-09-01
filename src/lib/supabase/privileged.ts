import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretConfig } from "@/lib/env";
import type { Database } from "@/types/database";

export function createPrivilegedSupabaseClient() {
  const { secretKey, url } = getSupabaseSecretConfig();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
