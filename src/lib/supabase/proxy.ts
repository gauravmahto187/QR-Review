import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getSupabasePublicConfig,
  hasSupabasePublicConfig,
} from "@/lib/env/public";
import type { Database } from "@/types/database";

export async function refreshSupabaseAuth(request: NextRequest) {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabasePublicConfig();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
