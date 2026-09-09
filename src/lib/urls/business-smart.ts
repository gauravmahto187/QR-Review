import { buildBusinessReviewUrl } from "./business-review";

export function buildBusinessSmartUrl(slug: string, appPublicUrl: string) {
  const url = new URL(buildBusinessReviewUrl(slug, appPublicUrl));
  url.pathname = url.pathname.replace(/\/r\/([^/]+)$/, "/s/$1");
  return url.toString();
}

export function smartQrFilename(slug: string, format: "png" | "svg") {
  return `nexgen-${slug.replace(/[^a-z0-9-]/g, "")}-smart-qr.${format}`;
}
