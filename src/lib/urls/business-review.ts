import { z } from "zod";

const businessSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export class PublicUrlConfigurationError extends Error {
  constructor() {
    super("Public application URL configuration is invalid.");
    this.name = "PublicUrlConfigurationError";
  }
}

export function normalizeAppPublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch {
    throw new PublicUrlConfigurationError();
  }
}

export function buildBusinessReviewUrl(slug: string, appPublicUrl: string) {
  const parsedSlug = businessSlugSchema.safeParse(slug);
  if (!parsedSlug.success) throw new PublicUrlConfigurationError();
  return new URL(`r/${encodeURIComponent(parsedSlug.data)}`, normalizeAppPublicUrl(appPublicUrl)).toString();
}
