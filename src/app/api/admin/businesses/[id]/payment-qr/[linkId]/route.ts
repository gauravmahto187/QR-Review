import { getAdminAuthState } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PAYMENT_QR_BUCKET, validPaymentPath } from "@/features/smart-links/payment-images";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const { admin } = await getAdminAuthState();
  if (!admin) return new Response(null, { status: 401 });
  const { id, linkId } = await params;
  const client = await createServerSupabaseClient();
  const { data: link } = await client.from("business_payment_qrs").select("*").eq("business_id", id).eq("id", linkId).maybeSingle();
  if (!link || !validPaymentPath(link.image_path, id, link.id)) return new Response(null, { status: 404 });
  const { data, error } = await client.storage.from(PAYMENT_QR_BUCKET).download(link.image_path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
