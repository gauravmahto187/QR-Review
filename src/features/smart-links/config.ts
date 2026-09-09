import { z } from "zod";

export const SMART_LINK_TYPES = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "WEBSITE"] as const;
export type SmartLinkType = typeof SMART_LINK_TYPES[number];
export const smartLinkLabels: Record<SmartLinkType, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok", YOUTUBE: "YouTube",
  WEBSITE: "Website",
};

const hosts: Partial<Record<SmartLinkType, readonly string[]>> = {
  FACEBOOK: ["facebook.com", "www.facebook.com", "m.facebook.com"],
  INSTAGRAM: ["instagram.com", "www.instagram.com"],
  TIKTOK: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  YOUTUBE: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
};

// Shared by admin validation and server-side public resolution. Unknown types fail closed.
export function normalizeSmartLink(type: string, input: string): string | null {
  if (!SMART_LINK_TYPES.includes(type as SmartLinkType)) return null;
  const value = input.trim();
  if (!value || value.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(value) || /%0[ad]/i.test(value)) return null;
  try {
    if (!/^https:\/\//i.test(value)) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname;
    if (!host.includes(".") || host === "localhost" || /^[\d.]+$/.test(host) || host.includes(":")) return null;
    const allowed = hosts[type as SmartLinkType];
    if (allowed && !allowed.includes(host)) return null;

    return url.toString();
  } catch { return null; }
}

export const smartLinkSchema = z.object({
  type: z.enum(SMART_LINK_TYPES), label: z.string().trim().max(60).optional().default(""),
  url: z.string().trim().max(2048), isActive: z.boolean(),
}).superRefine((link, ctx) => {
  if (!normalizeSmartLink(link.type, link.url)) ctx.addIssue({ code: "custom", path: ["url"], message: "Enter a valid destination for this link type. Use HTTPS and the selected provider’s official domain." });
});
