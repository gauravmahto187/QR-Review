import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BUSINESS_LOGO_BUCKET,
} from "@/features/businesses/constants";
import type { Database } from "@/types/database";

const extensionByMimeType: Record<string, string> = {
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
