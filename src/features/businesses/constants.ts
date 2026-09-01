export const BUSINESS_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export const RESERVED_BUSINESS_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "r",
  "settings",
]);

export const BUSINESS_LOGO_BUCKET = "business-logos";
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
