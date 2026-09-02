import { z } from "zod";

import {
  BUSINESS_STATUSES,
  RESERVED_BUSINESS_SLUGS,
} from "@/features/businesses/constants";

export function slugifyBusinessName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;

    const isGoogleMapsUrl =
      (hostname === "google.com" || hostname === "www.google.com") &&
      (url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
    const isMapsGoogleUrl = hostname === "maps.google.com";
    const isGoogleMapsShareUrl =
      hostname === "maps.app.goo.gl" && url.pathname.length > 1;

    if (isGoogleMapsUrl || isMapsGoogleUrl || isGoogleMapsShareUrl) {
      return url.toString();
    }

    if (hostname === "search.google.com" && /^\/local\/writereview\/?$/.test(url.pathname)) {
      const placeId = url.searchParams.get("placeid");
      if (!placeId || !/^[A-Za-z0-9_-]{10,256}$/.test(placeId)) return null;
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    }

    if (hostname === "g.page" && url.pathname.length > 1) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

export function isAllowedGoogleMapsUrl(value: string) {
  return normalizeGoogleMapsUrl(value) !== null;
}

const optionalDescription = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(1000, "Description must be 1,000 characters or fewer.").optional(),
);

const optionalPrimaryColor = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color such as #10B981.")
    .transform((value) => value.toUpperCase())
    .optional(),
);

export const businessFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(160),
  slug: z
    .string()
    .trim()
    .min(1, "Enter a permanent slug.")
    .max(80, "Slug must be 80 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens only.",
    )
    .refine((value) => !RESERVED_BUSINESS_SLUGS.has(value), {
      message: "This slug is reserved. Choose another one.",
    }),
  description: optionalDescription,
  primaryColor: optionalPrimaryColor,
  googleReviewUrl: z
    .string()
    .trim()
    .min(1, "Enter a Google Maps link.")
    .max(2048)
    .refine(isAllowedGoogleMapsUrl, {
      message: "Use a valid HTTPS Google Maps link.",
    })
    .transform((value) => normalizeGoogleMapsUrl(value) as string),
  status: z.enum(BUSINESS_STATUSES),
});

export type BusinessFormInput = z.infer<typeof businessFormSchema>;

export function getBusinessFormInput(formData: FormData) {
  return {
    description: formData.get("description"),
    googleReviewUrl: formData.get("googleReviewUrl"),
    name: formData.get("name"),
    primaryColor: formData.get("primaryColor"),
    slug: formData.get("slug"),
    status: formData.get("status"),
  };
}
