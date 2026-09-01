import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createPrivilegedSupabaseClient } from "@/lib/supabase/privileged";
import { resolvePublicReview } from "@/server/services/public-review";

const requestSchema = z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });
const VISITOR_COOKIE = "boostup_review_visitor";

export async function POST(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return response;
    const resolved = await resolvePublicReview(parsed.data.slug);
    if (resolved.kind !== "READY" && resolved.kind !== "NO_QUESTIONS") return response;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const existing = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${VISITOR_COOKIE}=`))?.split("=")[1];
    const parsedVisitor = z.uuid().safeParse(existing);
    const visitorId = parsedVisitor.success ? parsedVisitor.data : randomUUID();
    if (!existing) response.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, maxAge: 60 * 60 * 24, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    const supabase = createPrivilegedSupabaseClient();
    await supabase.from("analytics_events").insert({ business_id: resolved.business.id, dedupe_key: `PAGE_VIEW:${resolved.business.id}:${visitorId}`, event_type: "PAGE_VIEW", metadata: {} });
  } catch {
    // Analytics is best-effort and never blocks the customer experience.
  }
  return response;
}
