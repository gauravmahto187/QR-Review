"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeSmartLink, smartLinkSchema } from "./config";


export async function mutateSmartLink(businessId: string, form: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const action = z.enum(["CREATE", "UPDATE", "DELETE", "MOVE"]).safeParse(form.get("action"));
  if (!z.uuid().safeParse(businessId).success || !action.success) return { error: "Invalid request." };
  const linkId = form.get("id");
  if (action.data !== "CREATE" && !z.uuid().safeParse(linkId).success) return { error: "Invalid link." };
  const direction = form.get("direction");
  if (action.data === "MOVE" && direction !== "UP" && direction !== "DOWN") return { error: "Invalid direction." };
  const parsed = smartLinkSchema.safeParse({ type: form.get("type"), url: form.get("url") ?? "", isActive: form.get("isActive") === "on" });
  if ((action.data === "CREATE" || action.data === "UPDATE") && !parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("apply_smart_link_action", {
    p_business_id: businessId, p_action: action.data,
    ...(typeof linkId === "string" && action.data !== "CREATE" ? { p_link_id: linkId } : {}),
    ...(action.data === "MOVE" ? { p_direction: direction as string } : {}),
    ...(parsed.success && (action.data === "CREATE" || action.data === "UPDATE") ? {
      p_type: parsed.data.type, p_label: parsed.data.label,
      p_url: normalizeSmartLink(parsed.data.type, parsed.data.url)!, p_is_active: parsed.data.isActive,
    } : {}),
  });
  if (error) return { error: error.code === "23505" ? "Only one active link per type is allowed. Disable the existing link first." : "Unable to save changes. Reload and try again." };
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath(`/admin/businesses/${businessId}/smart-links`);
  return {};
}
