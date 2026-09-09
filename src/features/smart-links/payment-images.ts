import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const PAYMENT_QR_BUCKET = "business-payment-qrs";
export function validPaymentPath(path: string | null, businessId: string, paymentId: string): path is string {
  if (!path || !path.startsWith(`${businessId}/`)) return false;
  const parts = path.split("/");
  // Older private objects retain their paths; only stored migrated rows resolve them.
  return parts.length === 3 && (parts[1] === paymentId || ["esewa", "fonepay", "khalti"].includes(parts[1]))
    && /^[a-f0-9-]+[.]png$/.test(parts[2]);
}
export async function preparePaymentImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use a PNG, JPEG, or WebP image.");
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error("Payment QR images must be at most 2 MiB.");
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: true });
    const metadata = await image.metadata();
    const formats: Record<string, string> = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" };
    if (metadata.format !== formats[file.type] || (metadata.pages ?? 1) !== 1) throw new Error();
    // Decode fully, preserve dimensions and strip metadata without lossy resizing.
    const result = await image.rotate().png().toBuffer();
    if (result.length > 2 * 1024 * 1024) throw new Error();
    return result;
  } catch { throw new Error("Invalid image, excessive dimensions, or decoded PNG exceeds 2 MiB."); }
}
export async function uploadPaymentImage(client: SupabaseClient<Database>, businessId: string, paymentId: string, bytes: Buffer) {
  const path = `${businessId}/${paymentId}/${crypto.randomUUID()}.png`;
  const { error } = await client.storage.from(PAYMENT_QR_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
  if (error) throw new Error("Unable to upload payment QR image.");
  return path;
}
