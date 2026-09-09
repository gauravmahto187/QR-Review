import { NextResponse } from "next/server";
import { z } from "zod";
import { hasTrustedMutationOrigin } from "@/lib/security/origin";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";
import { recordSmartEvent, recordPaymentEvent, resolveSmartLinks } from "@/server/services/smart-links";

const input = z.discriminatedUnion("event", [z.object({ event: z.literal("view") }).strict(), z.object({ event: z.literal("payment-page") }).strict(), z.object({ event: z.literal("payment-qr"), paymentId: z.uuid() }).strict(), z.object({ event: z.literal("click"), linkId: z.uuid() }).strict()]);
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 512) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
    body = input.safeParse(JSON.parse(raw));
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (!body.success) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
  try {
    const { slug } = await params;
    const limit = await checkPublicRateLimit(request, (body.data.event === "view" || body.data.event === "payment-page") ? "smart-page-view" : "smart-link-click");
    const resolved = await resolveSmartLinks(slug);
    if (!resolved) return NextResponse.json({ error: "Links unavailable." }, { status: 404, headers });
    if (body.data.event === "view") {
      if (limit.allowed) await recordSmartEvent(resolved.business.id);
      return new NextResponse(null, { status: 204, headers });
    }
    if (body.data.event === "payment-page") {
      if (limit.allowed) await recordPaymentEvent(resolved.business.id);
      return new NextResponse(null, { status: 204, headers });
    }
    if (body.data.event === "payment-qr") {
      const paymentId = body.data.paymentId;
      const payment = resolved.payments.find(method => method.id === paymentId);
      if (!payment) return NextResponse.json({ error: "Payment method unavailable." }, { status: 404, headers });
      if (limit.allowed) await recordPaymentEvent(resolved.business.id, payment.id);
      return NextResponse.json({ kind: "payment-qr", name: payment.name, imageUrl: `/api/public/smart/${encodeURIComponent(slug)}/image/${payment.id}` }, { headers });
    }
    const linkId = body.data.linkId;
    const link = resolved.links.find(link => link.id === linkId);
    if (!link) return NextResponse.json({ error: "Link unavailable." }, { status: 404, headers });
    // Limits suppress excess analytics, never an otherwise valid customer handoff.
    if (limit.allowed) await recordSmartEvent(resolved.business.id, link.type);
    return NextResponse.json({ kind: "link", url: link.url }, { headers });
  } catch { return NextResponse.json({ error: "Links unavailable. Please try again." }, { status: 503, headers }); }
}
