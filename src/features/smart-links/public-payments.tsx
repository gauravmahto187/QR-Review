"use client";
import { useEffect, useRef, useState } from "react";
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
  return <div className="mt-6 space-y-3">
    {methods.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No payment methods available yet.</p>}
    {methods.map(method => <button key={method.id} disabled={pending} onClick={() => open(method.id)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left font-semibold text-emerald-900 disabled:opacity-50"><span className="break-words">{method.name}</span><span aria-hidden="true">→</span></button>)}
    {payment && <PaymentViewer {...payment} close={() => setPayment(null)} />}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
