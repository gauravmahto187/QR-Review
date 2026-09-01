"use client";

import { useEffect } from "react";

export function PageViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch("/api/public/review/page-view", { body: JSON.stringify({ slug }), headers: { "content-type": "application/json" }, method: "POST" });
  }, [slug]);
  return null;
}
