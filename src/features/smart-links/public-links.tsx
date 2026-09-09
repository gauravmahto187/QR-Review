"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { smartLinkLabels, type SmartLinkType } from "./config";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { SmartLinkIcon } from "./icon";

type PublicLink = { id: string; type: SmartLinkType; label: string };
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
  return <div className="mt-7 space-y-3">
    {links.length === 0 && !hasPayments && <p className="py-10 text-center text-sm text-slate-500">No links available yet.</p>}
    {hasPayments && <Link href={`/s/${encodeURIComponent(slug)}/payments`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900"><QrCode className="size-5" />Payment<span aria-hidden="true" className="ml-auto">→</span></Link>}
    {links.map(link => <button key={link.id} onClick={() => openLink(link.id)} disabled={pending !== null} className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition disabled:opacity-60 border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}>
      <SmartLinkIcon type={link.type} /><span className="min-w-0 flex-1 break-words">{link.label || smartLinkLabels[link.type]}</span>{pending === link.id ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />}
    </button>)}
    {error && <p role="alert" className="text-center text-sm text-red-700">{error}</p>}
    <noscript><p className="text-center text-sm text-slate-500">Enable JavaScript to open links.</p></noscript>
  </div>;
}
