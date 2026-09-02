import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
} from "@/features/businesses/constants";

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
