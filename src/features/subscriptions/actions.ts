"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubscriptionActionState = { error?: string; success?: string };

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START_TRIAL"), businessId: z.uuid() }),
  z.object({ action: z.literal("ACTIVATE_MONTHS"), businessId: z.uuid(), months: z.coerce.number().refine((value) => [1, 3, 6, 12].includes(value)) }),
  z.object({ action: z.literal("SET_CUSTOM_EXPIRY"), businessId: z.uuid(), customDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ action: z.literal("SUSPEND"), businessId: z.uuid() }),
  z.object({ action: z.literal("REACTIVATE"), businessId: z.uuid() }),
  z.object({ action: z.literal("CANCEL"), businessId: z.uuid() }),
]);

export async function applySubscriptionAction(
  _previousState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  await requireAdmin();
  const parsed = actionSchema.safeParse({
    action: formData.get("action"),
    businessId: formData.get("businessId"),
    customDate: formData.get("customDate"),
    months: formData.get("months"),
  });
  if (!parsed.success) return { error: "Invalid subscription request." };

  let customExpiresAt: string | null = null;
  let months: number | null = null;
  if (parsed.data.action === "SET_CUSTOM_EXPIRY") {
    customExpiresAt = new Date(`${parsed.data.customDate}T23:59:59+05:45`).toISOString();
    if (new Date(customExpiresAt) <= new Date()) return { error: "Choose a future expiry date in Nepal time." };
  }
  if (parsed.data.action === "ACTIVATE_MONTHS") months = parsed.data.months;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("apply_subscription_action", {
    p_action: parsed.data.action,
    p_business_id: parsed.data.businessId,
    p_custom_expires_at: customExpiresAt,
    p_months: months,
  });

  if (error) {
    if (error.message.includes("trial can only")) return { error: "A trial can only be started before subscription history exists." };
    if (error.message.includes("future")) return { error: "Choose a future expiry date." };
    if (error.message.includes("reactivated")) return { error: "This subscription cannot be reactivated because it has expired." };
    return { error: "Unable to update the subscription. Refresh and try again." };
  }

  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  revalidatePath(`/admin/businesses/${parsed.data.businessId}/subscription`);
  revalidatePath("/admin/businesses");
  return { success: "Subscription updated." };
}
