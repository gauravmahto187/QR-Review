"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";

export function BusinessLogo({
  alt,
  color,
  size = "md",
  url,
}: {
  alt: string;
  color: string | null;
  size?: "md" | "lg";
  url: string | null;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const sizing = size === "lg" ? "size-20 rounded-3xl" : "size-12 rounded-2xl";

  if (url && failedUrl !== url) {
    return (
      // Native img lets the browser report unsupported HEIC/HEIF gracefully.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className={`${sizing} shrink-0 border border-slate-200 bg-slate-100 object-cover ${loadedUrl !== url ? "motion-safe:animate-pulse" : ""}`}
        decoding="async"
        height={size === "lg" ? 80 : 48}
        loading="lazy"
        onError={() => setFailedUrl(url)}
        onLoad={() => setLoadedUrl(url)}
        src={url}
        width={size === "lg" ? 80 : 48}
      />
    );
  }

  return (
    <span
      aria-label={`${alt} logo placeholder`}
      className={`${sizing} flex shrink-0 items-center justify-center text-white shadow-sm`}
      style={{ backgroundColor: color ?? "#0F766E" }}
    >
      <Building2 className={size === "lg" ? "size-8" : "size-5"} aria-hidden="true" />
    </span>
  );
}
