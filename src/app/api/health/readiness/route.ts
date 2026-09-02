import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const configured = serverEnv.READINESS_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!serverEnv.READINESS_TOKEN) return new NextResponse(null, { status: 404 });
  if (!authorized(request)) return NextResponse.json({ status: "unauthorized" }, { status: 401 });

  try {
    const supabase = createPrivilegedSupabaseClient();
    const { error } = await supabase.from("businesses").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logger.error("readiness.database_unavailable");
    return NextResponse.json({ status: "not_ready" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
}
