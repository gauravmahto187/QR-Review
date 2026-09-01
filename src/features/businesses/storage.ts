import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ALLOWED_LOGO_MIME_TYPES,
  BUSINESS_LOGO_BUCKET,
  MAX_LOGO_SIZE_BYTES,
} from "@/features/businesses/constants";
import type { Database } from "@/types/database";

const extensionByMimeType: Record<string, string> = {
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateLogoFile(file: File | null) {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return "Logo must be 2 MiB or smaller.";
  }

  if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Use a PNG, JPEG, WebP, HEIC, or HEIF image.";
  }

  return null;
}

export async function uploadBusinessLogo(
  supabase: SupabaseClient<Database>,
  businessId: string,
  file: File,
) {
  const extension = extensionByMimeType[file.type];
  const path = `${businessId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(BUSINESS_LOGO_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error("Unable to upload the business logo.");
  }

  return path;
}

export async function removeBusinessLogo(
  supabase: SupabaseClient<Database>,
  path: string,
) {
  await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([path]);
}

export function getBusinessLogoUrl(
  supabase: SupabaseClient<Database>,
  path: string | null,
) {
  if (!path) return null;
  return supabase.storage.from(BUSINESS_LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}
