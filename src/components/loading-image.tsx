"use client";

import { useState } from "react";
import { Skeleton } from "./loading";

export function LoadingImage({ src, alt, className = "", errorMessage = "Image unavailable." }: { src: string; alt: string; className?: string; errorMessage?: string }) {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();
  const failed = failedSrc === src;
  const loading = loadedSrc !== src && !failed;
  return <div aria-busy={loading} className={`relative mx-auto aspect-square w-full ${className}`}>
    {loading && <div className="absolute inset-0"><Skeleton className="h-full w-full rounded-2xl" /><span role="status" className="sr-only">Loading image…</span></div>}
    {failed ? <p role="alert" className="flex h-full items-center justify-center p-5 text-center text-sm text-slate-600">{errorMessage}</p> : <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onLoad={() => setLoadedSrc(src)} onError={() => setFailedSrc(src)} className={`absolute inset-0 h-full w-full object-contain ${loading ? "opacity-0" : "opacity-100"}`} />
    </>}
  </div>;
}
