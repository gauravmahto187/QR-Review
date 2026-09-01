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
  const [failed, setFailed] = useState(false);
  const sizing = size === "lg" ? "size-20 rounded-3xl" : "size-12 rounded-2xl";

  if (url && !failed) {
    return (
      // Native img lets the browser report unsupported HEIC/HEIF gracefully.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        className={`${sizing} shrink-0 border border-slate-200 bg-white object-cover`}
        onError={() => setFailed(true)}
        src={url}
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
