import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/env/public";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { publishableKey, url } = getSupabasePublicConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes them.
        }
      },
    },
  });
}
