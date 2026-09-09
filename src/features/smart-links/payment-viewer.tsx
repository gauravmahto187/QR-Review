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
  return <dialog ref={dialog} onCancel={close} onClose={close} aria-labelledby="payment-provider" className="m-auto max-h-[95dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-4 backdrop:bg-slate-950/60">
    <header className="flex items-center justify-between gap-3"><h2 id="payment-provider" className="text-xl font-semibold">{provider}</h2><button autoFocus onClick={close} className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold">Close</button></header>
    <div className="mt-4 bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={`${provider} payment QR`} className="mx-auto h-auto max-w-full object-contain" onError={event => { event.currentTarget.hidden = true; const message = event.currentTarget.nextElementSibling as HTMLElement; message.hidden = false; }} />
      <p hidden role="alert" className="py-8 text-center text-sm text-slate-600">QR image unavailable. Close and try again.</p>
    </div>
  </dialog>;
}
