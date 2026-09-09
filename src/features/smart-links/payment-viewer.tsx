"use client";
import { useEffect, useRef } from "react";
export function PaymentViewer({ provider, imageUrl, close }: { provider: string; imageUrl: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} onCancel={close} onClose={close} aria-labelledby="payment-provider" className="m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/60 sm:p-7">
    <header className="flex items-center justify-between gap-3"><h2 id="payment-provider" className="text-xl font-semibold text-slate-950">{provider}</h2><button autoFocus onClick={close} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Close</button></header>
    <div className="mt-4 rounded-2xl bg-white p-4 sm:p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={`${provider} payment QR`} className="mx-auto h-auto max-w-full object-contain" onError={event => { event.currentTarget.hidden = true; const message = event.currentTarget.nextElementSibling as HTMLElement; message.hidden = false; }} />
      <p hidden role="alert" className="py-8 text-center text-sm text-slate-600">QR image unavailable. Close and try again.</p>
    </div>
  </dialog>;
}
