"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DeleteBusinessState = { error?: string; deleted?: boolean; complete?: boolean };
const jobSchema = z.object({
  slug: z.string(),
  objects: z.array(z.object({ bucket: z.enum(["business-logos", "business-payment-qrs"]), path: z.string() })),
});

export async function deleteBusinessAction(_state: DeleteBusinessState, form: FormData): Promise<DeleteBusinessState> {
  let deleted = false;
  try {
    await requireAdmin();
    const input = z.object({ businessId: z.uuid(), confirmation: z.string().min(1).max(160) })
      .safeParse({ businessId: form.get("businessId"), confirmation: form.get("confirmation") });
    if (!input.success) return { error: "Enter the business name to confirm deletion." };
    const { businessId, confirmation } = input.data;
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("delete_business_permanently", { p_business_id: businessId, p_confirmation: confirmation });
    if (error) {
      if (error.message.includes("CONFIRMATION_MISMATCH")) return { error: "The business name does not match." };
      if (error.code === "PGRST202") return { error: "Business deletion is not available yet. Apply the deletion migration first." };
      return { error: "Unable to delete this business. Please try again." };
    }
    deleted = true;
    const job = jobSchema.parse(data);
    revalidatePath("/admin");
    revalidatePath("/admin/businesses");
    revalidatePath(`/r/${job.slug}`);
    revalidatePath(`/s/${job.slug}`);
    revalidatePath(`/s/${job.slug}/payments`);
    for (const bucket of ["business-logos", "business-payment-qrs"] as const) {
      const paths = job.objects.filter(object => object.bucket === bucket).map(object => object.path);
      if (paths.some(path => !path.startsWith(`${businessId}/`) || path.split("/").some(part => !part || part === "." || part === ".."))) {
        throw new Error("Invalid cleanup path");
      }
      for (let offset = 0; offset < paths.length; offset += 100) {
        const { error: storageError } = await client.storage.from(bucket).remove(paths.slice(offset, offset + 100));
        if (storageError) throw storageError;
      }
    }
    const { error: cleanupError } = await client.rpc("complete_business_deletion", { p_business_id: businessId });
    if (cleanupError) throw cleanupError;
    revalidatePath("/admin/businesses");
    return { deleted: true, complete: true };
  } catch {
    return deleted
      ? { deleted: true, error: "Business deleted. Uploaded-file cleanup is pending; retry here or from the Businesses page." }
      : { error: "Unable to delete this business. Please try again." };
  }
}
