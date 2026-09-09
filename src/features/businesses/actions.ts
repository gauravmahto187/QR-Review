"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  businessFormSchema,
  getBusinessFormInput,
} from "@/features/businesses/schemas";
import {
  removeBusinessLogo,
  uploadBusinessLogo,
} from "@/features/businesses/storage";
import { validateLogoFile } from "@/features/businesses/logo-validation";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];

export type BusinessFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type BusinessStatusState = { error?: string; success?: string };

type AuditEntry = {
  action: string;
  metadata?: Json;
};

async function writeBusinessAudit(
  supabase: SupabaseClient<Database>,
  adminUserId: string,
  businessId: string,
  entries: AuditEntry[],
) {
  const { error } = await supabase.from("audit_logs").insert(
    entries.map(({ action, metadata = {} }) => ({
      action,
      admin_user_id: adminUserId,
      business_id: businessId,
      entity_id: businessId,
      entity_type: "business",
      metadata,
    })),
  );

  if (error) throw new Error("Unable to record the business audit event.");
}

function getLogoFile(formData: FormData, field = "logo") {
  const value = formData.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

async function slugExists(
  supabase: SupabaseClient<Database>,
  slug: string,
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error("Unable to validate the business slug.");
  return Boolean(data);
}

export async function createBusinessAction(
  _previousState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const admin = await requireAdmin();
  const parsed = businessFormSchema.safeParse(getBusinessFormInput(formData));
  const logo = getLogoFile(formData);
  const logoError = validateLogoFile(logo);
  const qrLogo = getLogoFile(formData, "qrLogo");
  const qrLogoError = validateLogoFile(qrLogo);
  const useBusinessLogoForQr = formData.get("useBusinessLogoForQr") === "on";

  if (!parsed.success || logoError || qrLogoError) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...(logoError ? { logo: [logoError] } : {}),
        ...(qrLogoError ? { qrLogo: [qrLogoError] } : {}),
      },
    };
  }

  const supabase = await createServerSupabaseClient();

  if (await slugExists(supabase, parsed.data.slug)) {
    return { fieldErrors: { slug: ["This slug is already in use."] } };
  }

  const businessId = crypto.randomUUID();
  let logoPath: string | null = null;
  let qrLogoPath: string | null = null;
  let businessCreated = false;

  try {
    if (logo) {
      logoPath = await uploadBusinessLogo(supabase, businessId, logo);
    }

    if (qrLogo) qrLogoPath = await uploadBusinessLogo(supabase, businessId, qrLogo);

    const { data: business, error } = await supabase
      .from("businesses")
      .insert({
        archived_at: parsed.data.status === "ARCHIVED" ? new Date().toISOString() : null,
        description: parsed.data.description ?? null,
        google_review_url: parsed.data.googleReviewUrl,
        id: businessId,
        logo_path: logoPath,
        qr_logo_path: qrLogoPath,
        use_business_logo_for_qr: useBusinessLogoForQr,
        name: parsed.data.name,
        primary_color: parsed.data.primaryColor ?? null,
        slug: parsed.data.slug,
        status: parsed.data.status,
      })
      .select("id")
      .single();

    if (error) {
      if (logoPath) await removeBusinessLogo(supabase, logoPath);
      if (qrLogoPath) await removeBusinessLogo(supabase, qrLogoPath);
      if (error.code === "23505") {
        return { fieldErrors: { slug: ["This slug is already in use."] } };
      }
      return { error: "Unable to create the business. Please try again." };
    }

    businessCreated = true;

    await writeBusinessAudit(supabase, admin.auth_user_id, business.id, [
      { action: "BUSINESS_CREATED", metadata: { status: parsed.data.status } },
      ...(logoPath ? [{ action: "BUSINESS_LOGO_CHANGED" }] : []),
      ...(qrLogoPath || useBusinessLogoForQr ? [{ action: "QR_BRANDING_CHANGED" }] : []),
    ]);
  } catch {
    if (qrLogoPath && !businessCreated) await removeBusinessLogo(supabase, qrLogoPath);
    if (logoPath && !businessCreated) await removeBusinessLogo(supabase, logoPath);
    return { error: "Unable to create the business. Please try again." };
  }

  revalidatePath("/admin/businesses");
  redirect(`/admin/businesses/${businessId}`);
}

export async function updateBusinessAction(
  businessId: string,
  _previousState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(businessId).success) return { error: "Business not found." };
  const supabase = await createServerSupabaseClient();
  const { data: current, error: currentError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (currentError || !current) return { error: "Business not found." };

  const input = getBusinessFormInput(formData);
  const parsed = businessFormSchema.safeParse({ ...input, slug: current.slug });
  const logo = getLogoFile(formData);
  const logoError = validateLogoFile(logo);
  const qrLogo = getLogoFile(formData, "qrLogo");
  const qrLogoError = validateLogoFile(qrLogo);
  const useBusinessLogoForQr = formData.get("useBusinessLogoForQr") === "on";

  if (!parsed.success || logoError || qrLogoError) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : parsed.error.flatten().fieldErrors),
        ...(logoError ? { logo: [logoError] } : {}),
        ...(qrLogoError ? { qrLogo: [qrLogoError] } : {}),
      },
    };
  }

  let newLogoPath: string | null = null;
  let newQrLogoPath: string | null = null;
  const removeQrLogo = formData.get("removeQrLogo") === "on";
  let businessUpdated = false;

  try {
    if (logo) {
      newLogoPath = await uploadBusinessLogo(supabase, businessId, logo);
    }

    if (qrLogo && !removeQrLogo) newQrLogoPath = await uploadBusinessLogo(supabase, businessId, qrLogo);

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        description: parsed.data.description ?? null,
        google_review_url: parsed.data.googleReviewUrl,
        logo_path: newLogoPath ?? current.logo_path,
        qr_logo_path: removeQrLogo ? null : newQrLogoPath ?? current.qr_logo_path,
        use_business_logo_for_qr: useBusinessLogoForQr,
        name: parsed.data.name,
        primary_color: parsed.data.primaryColor ?? null,
      })
      .eq("id", businessId);

    if (updateError) {
      if (newLogoPath) await removeBusinessLogo(supabase, newLogoPath);
      if (newQrLogoPath) await removeBusinessLogo(supabase, newQrLogoPath);
      return { error: "Unable to update the business. Please try again." };
    }


    businessUpdated = true;

    const auditEntries: AuditEntry[] = [{ action: "BUSINESS_UPDATED" }];
    if (current.google_review_url !== parsed.data.googleReviewUrl) {
      auditEntries.push({ action: "GOOGLE_REVIEW_URL_CHANGED" });
    }
    if (newQrLogoPath || removeQrLogo || current.use_business_logo_for_qr !== useBusinessLogoForQr) auditEntries.push({ action: "QR_BRANDING_CHANGED" });
    if (newLogoPath) auditEntries.push({ action: "BUSINESS_LOGO_CHANGED" });
    await writeBusinessAudit(
      supabase,
      admin.auth_user_id,
      businessId,
      auditEntries,
    );

    if ((newQrLogoPath || removeQrLogo) && current.qr_logo_path) await removeBusinessLogo(supabase, current.qr_logo_path);
    if (newLogoPath && current.logo_path) {
      await removeBusinessLogo(supabase, current.logo_path);
    }
  } catch {
    if (newQrLogoPath && !businessUpdated) await removeBusinessLogo(supabase, newQrLogoPath);
    if (newLogoPath && !businessUpdated) {
      await removeBusinessLogo(supabase, newLogoPath);
    }
    return { error: "Unable to update the business. Please try again." };
  }

  revalidatePath(`/admin/businesses/${businessId}/qr`);
  revalidatePath(`/r/${current.slug}`);
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/admin/businesses");
  redirect(`/admin/businesses/${businessId}`);
}

function allowedStatusTransition(current: BusinessStatus, next: BusinessStatus) {
  if (current === "ACTIVE") return next === "SUSPENDED" || next === "ARCHIVED";
  if (current === "SUSPENDED") return next === "ACTIVE" || next === "ARCHIVED";
  return false;
}

export async function changeBusinessStatusAction(
  _previousState: BusinessStatusState,
  formData: FormData,
): Promise<BusinessStatusState> {
  const admin = await requireAdmin();
  const businessId = formData.get("businessId");
  const nextStatus = formData.get("status");

  if (
    typeof businessId !== "string" || !z.uuid().safeParse(businessId).success ||
    !["ACTIVE", "SUSPENDED", "ARCHIVED"].includes(String(nextStatus))
  ) {
    return { error: "Invalid status request." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: current, error: currentError } = await supabase
    .from("businesses")
    .select("id, status")
    .eq("id", businessId)
    .maybeSingle();

  if (currentError || !current) return { error: "Business not found." };
  const status = nextStatus as BusinessStatus;

  if (!allowedStatusTransition(current.status, status)) {
    return { error: "This status change is not allowed." };
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      archived_at: status === "ARCHIVED" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", businessId);

  if (updateError) return { error: "Unable to change business status." };

  const action =
    status === "ARCHIVED"
      ? "BUSINESS_ARCHIVED"
      : status === "SUSPENDED"
        ? "BUSINESS_SUSPENDED"
        : "BUSINESS_REACTIVATED";

  await writeBusinessAudit(supabase, admin.auth_user_id, businessId, [
    { action, metadata: { from: current.status, to: status } },
  ]);

  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/admin/businesses");
  return { success: `Business status changed to ${status.toLowerCase()}.` };
}
