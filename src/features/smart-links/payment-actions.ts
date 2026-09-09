"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PAYMENT_QR_BUCKET, preparePaymentImage, uploadPaymentImage, validPaymentPath } from "./payment-images";

export async function mutatePaymentQr(businessId: string, form: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const action = z.enum(["CREATE", "UPDATE", "DELETE", "MOVE"]).safeParse(form.get("action"));
  if (!z.uuid().safeParse(businessId).success || !action.success) return { error: "Invalid request." };
  const paymentId = action.data === "CREATE" ? crypto.randomUUID() : form.get("id");
  if (typeof paymentId !== "string" || !z.uuid().safeParse(paymentId).success) return { error: "Invalid payment method." };
  const direction = form.get("direction");
  if (action.data === "MOVE" && direction !== "UP" && direction !== "DOWN") return { error: "Invalid direction." };
  const editing = action.data === "CREATE" || action.data === "UPDATE";
  const name = z.string().trim().min(1, "Enter a payment name.").max(80).safeParse(form.get("name"));
  if (editing && !name.success) return { error: "Enter a payment name (1–80 characters)." };
  const client = await createServerSupabaseClient();
  let oldPath: string | null = null;
  if (action.data !== "CREATE") {
    const { data, error } = await client.from("business_payment_qrs").select("*").eq("business_id", businessId).eq("id", paymentId).maybeSingle();
    if (error || !data) return { error: "Payment method not found." };
    if (validPaymentPath(data.image_path, businessId, paymentId)) oldPath = data.image_path;
  }
  let imagePath = oldPath;
  let uploaded: string | null = null;
  if (editing) {
    const file = form.get("image");
    if (file !== null && !(file instanceof File)) return { error: "Invalid image upload." };
    if (file instanceof File && (file.size > 0 || file.name !== "")) {
      try {
        uploaded = await uploadPaymentImage(client, businessId, paymentId, await preparePaymentImage(file));
        imagePath = uploaded;
      } catch (error) { return { error: error instanceof Error ? error.message : "Unable to upload payment QR." }; }
    }
    if (!imagePath) return { error: "Upload a payment QR image." };
  }
  const { error } = await client.rpc("apply_payment_qr_action", {
    p_business_id: businessId, p_payment_id: paymentId, p_action: action.data,
    ...(editing && name.success ? { p_name: name.data, p_image_path: imagePath!, p_is_active: form.get("isActive") === "on" } : {}),
    ...(action.data === "MOVE" ? { p_direction: direction as string } : {}),
  });
  if (error) {
    if (uploaded) await client.storage.from(PAYMENT_QR_BUCKET).remove([uploaded]);
    return { error: "Unable to save payment method. Reload and try again." };
  }
  if (oldPath && (action.data === "DELETE" || (editing && imagePath !== oldPath))) {
    await client.storage.from(PAYMENT_QR_BUCKET).remove([oldPath]);
  }
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath(`/admin/businesses/${businessId}/smart-links`);
  return {};
}
