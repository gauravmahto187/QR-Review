import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUSINESS_LOGO_BUCKET, MAX_LOGO_SIZE_BYTES } from "@/features/businesses/constants";
import { resolveQrLogoPath } from "@/lib/qr/logo-source";
import { prepareQrLogo, renderQrPng, renderQrSvg } from "@/lib/qr/render";
import type { Database, Tables } from "@/types/database";

export async function loadQrLogo(supabase: SupabaseClient<Database>, business: Tables<"businesses">) {
  const path = resolveQrLogoPath(business);
  // Only server-resolved storage objects belonging to this business.
  if (!path || !path.startsWith(`${business.id}/`) || path.includes("..")) return null;
  try {
    const { data, error } = await supabase.storage.from(BUSINESS_LOGO_BUCKET).download(path);
    if (error || !data || data.size > MAX_LOGO_SIZE_BYTES) return null;
    return await prepareQrLogo(Buffer.from(await data.arrayBuffer()));
  } catch { return null; }
}

export const generateQrPng = renderQrPng;
export const generateQrSvg = renderQrSvg;
export function qrSvgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
