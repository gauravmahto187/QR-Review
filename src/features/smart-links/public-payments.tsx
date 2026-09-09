"use client";
import { useEffect, useRef, useState } from "react";
import { QrCode } from "lucide-react";
import { PaymentViewer } from "./payment-viewer";

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
  return <div className="mt-7 space-y-2.5">
    {methods.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No payment methods available yet.</p>}
    {methods.map(method => <button key={method.id} disabled={pending} onClick={() => open(method.id)} className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-left font-semibold text-slate-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50"><span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><QrCode className="size-5" /></span><span className="flex-1 break-words">{method.name}</span><span aria-hidden="true" className="text-lg font-normal text-slate-400 transition-transform group-hover:translate-x-0.5">›</span></button>)}
    {payment && <PaymentViewer {...payment} close={() => setPayment(null)} />}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
