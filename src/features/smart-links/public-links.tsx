"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2, QrCode } from "lucide-react";
import { smartLinkLabels, type SmartLinkType } from "./config";
import Link from "next/link";
import { SmartLinkIcon } from "./icon";

type PublicLink = { id: string; type: SmartLinkType };
export function PublicSmartLinks({ slug, links, hasPayments = false }: { slug: string; links: PublicLink[]; hasPayments?: boolean }) {
  const tracked = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const endpoint = `/api/public/smart/${encodeURIComponent(slug)}`;
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "view" }), keepalive: true }).catch(() => {});
  }, [endpoint]);
  async function openLink(id: string) {
    setPending(id); setError(undefined);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "click", linkId: id }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.kind !== "link") throw new Error();
      window.location.assign(data.url);
    } catch { setError("This link is unavailable. Please try again."); }
    finally { setPending(null); }
  }
  return <div className="mt-7 space-y-2.5">
    {links.length === 0 && !hasPayments && <p className="py-10 text-center text-sm text-slate-500">No links available yet.</p>}
    {hasPayments && <Link href={`/s/${encodeURIComponent(slug)}/payments`} className="group flex min-h-16 items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 font-semibold text-slate-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"><QrCode className="size-5 text-emerald-700" /><span className="flex-1">Payment</span><span aria-hidden="true" className="text-lg font-normal text-slate-400 transition-transform group-hover:translate-x-0.5">›</span></Link>}
    {links.map(link => <button key={link.id} onClick={() => openLink(link.id)} disabled={pending !== null} className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-left font-semibold text-slate-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60">
      <span className="text-slate-600"><SmartLinkIcon type={link.type} /></span><span className="min-w-0 flex-1 break-words">{smartLinkLabels[link.type]}</span>{pending === link.id ? <Loader2 className="size-4 animate-spin text-slate-400" /> : <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />}
    </button>)}
    {error && <p role="alert" className="text-center text-sm text-red-700">{error}</p>}
    <noscript><p className="text-center text-sm text-slate-500">Enable JavaScript to open links.</p></noscript>
  </div>;
}
