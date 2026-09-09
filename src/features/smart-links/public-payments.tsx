"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, LoaderCircle } from "lucide-react";
import { PaymentViewer } from "./payment-viewer";
import { PaymentProviderLogo } from "./provider-logo";

export function PublicPayments({ slug, methods }: { slug: string; methods: { id: string; name: string }[] }) {
  const tracked = useRef(false);
  const [payment, setPayment] = useState<{ provider: string; imageUrl: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const endpoint = `/api/public/smart/${encodeURIComponent(slug)}`;
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "payment-page" }), keepalive: true }).catch(() => {});
  }, [endpoint]);
  async function open(id: string) {
    setPending(true); setError(undefined);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "payment-qr", paymentId: id }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.kind !== "payment-qr" || data.imageUrl !== `${endpoint}/image/${id}`) throw new Error();
      setPayment({ provider: data.name, imageUrl: data.imageUrl });
    } catch { setError("Payment QR unavailable. Please try again."); }
    finally { setPending(false); }
  }
  return <div className="mt-6 space-y-3" aria-busy={pending}>
    {methods.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No payment methods available yet.</p>}
    {methods.map(method => <button key={method.id} disabled={pending} onClick={() => open(method.id)} className="group flex min-h-24 w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:p-5"><span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white p-2"><PaymentProviderLogo name={method.name} className="h-10 w-16" /></span><span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold text-slate-900">{method.name}</span><span className="mt-1 block text-xs text-slate-500">View payment QR</span></span><ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700" /></button>)}
    {pending && <p role="status" className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Loading payment QR…</p>}
    {payment && <PaymentViewer {...payment} close={() => setPayment(null)} />}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
