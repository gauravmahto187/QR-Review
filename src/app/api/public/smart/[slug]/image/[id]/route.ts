import { resolveSmartLinks } from "@/server/services/smart-links";
import { PAYMENT_QR_BUCKET, validPaymentPath } from "@/features/smart-links/payment-images";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  try {
    const { slug, id } = await params;
    const resolved = await resolveSmartLinks(slug);
    const link = resolved?.payments.find(link => link.id === id);
    if (!resolved || !link || !validPaymentPath(link.image_path, resolved.business.id, link.id)) return new Response(null, { status: 404, headers });
    const { data, error } = await resolved.supabase.storage.from(PAYMENT_QR_BUCKET).download(link.image_path);
    if (error || !data) return new Response(null, { status: 404, headers });
    return new Response(data, { headers: { ...headers, "Content-Type": "image/png" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
