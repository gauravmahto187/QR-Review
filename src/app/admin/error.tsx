"use client";

import { TriangleAlert } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-center">
      <TriangleAlert aria-hidden="true" className="mx-auto size-8 text-amber-700" />
      <h1 className="mt-4 text-xl font-semibold text-amber-950">This page couldn’t be loaded</h1>
      <p className="mt-2 text-sm leading-6 text-amber-800">The service may be temporarily unavailable. Try again without losing your signed-in session.</p>
      <button className="mt-5 min-h-12 rounded-2xl bg-amber-900 px-5 text-sm font-semibold text-white" onClick={reset} type="button">Try again</button>
    </section>
  );
}
