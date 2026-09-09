"use client";
import { PendingLabel } from "@/components/loading";
import { LoadingImage } from "@/components/loading-image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/types/database";
import { mutatePaymentQr } from "./payment-actions";
import { PaymentProviderLogo } from "./provider-logo";

const field = "mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm";
const button = "min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40";
function PaymentEditor({ businessId, method, first, last }: { businessId: string; method?: Tables<"business_payment_qrs">; first?: boolean; last?: boolean }) {
  const [pendingLabel, setPendingLabel] = useState("Saving…");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(form: FormData) {
    if (pending) return;
    const image = form.get("image");
    setPendingLabel(image instanceof File && image.size ? "Uploading…" : form.get("action") === "DELETE" ? "Deleting…" : form.get("action") === "MOVE" ? "Reordering…" : "Saving…");
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await mutatePaymentQr(businessId, form);
        if (result.error) setError(result.error); else router.refresh();
      } catch { setError("Unable to save payment method."); }
    });
  }
  function control(action: string, direction?: string) {
    if (action === "DELETE" && !confirm("Remove this payment method and its QR image?")) return;
    const form = new FormData(); form.set("action", action); form.set("id", method!.id);
    if (direction) form.set("direction", direction);
    submit(form);
  }
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="flex items-center justify-between gap-3 font-semibold"><span className="flex min-w-0 items-center gap-2"><PaymentProviderLogo name={method?.name ?? "Payment"} className="size-8" /><span className="truncate">{method?.name ?? "Add Payment Method"}</span></span>{method && <span className="text-xs text-slate-500">{method.is_active ? "Enabled" : "Disabled"}</span>}</h3>
    {method && <LoadingImage src={`/api/admin/businesses/${businessId}/payment-qr/${method.id}?v=${encodeURIComponent(method.updated_at)}`} alt={`${method.name} QR`} className="mt-3 max-w-80" />}
    <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
      <input type="hidden" name="action" value={method ? "UPDATE" : "CREATE"} />
      {method && <input type="hidden" name="id" value={method.id} />}
      <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">
        <label className="block text-sm font-medium">Payment Name<input className={field} name="name" required maxLength={80} defaultValue={method?.name ?? ""} /></label>
        <label className="block text-sm font-medium">{method ? "Replace QR image" : "QR image"}<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required={!method} className="mt-2 block w-full text-sm" /></label>
        <p className="text-xs text-slate-500">PNG, JPEG or WebP · Maximum 2 MiB</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={method?.is_active ?? true} className="size-5 accent-emerald-700" />Enabled</label>
        <button className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white" type="submit">{pending ? <PendingLabel>{pendingLabel}</PendingLabel> : method ? "Save changes" : "Add Payment Method"}</button>
      </fieldset>
    </form>
    {method && <div className="mt-3 flex gap-2"><button className={button} disabled={pending || first} onClick={() => control("MOVE", "UP")}>↑ Up</button><button className={button} disabled={pending || last} onClick={() => control("MOVE", "DOWN")}>↓ Down</button><button className={`${button} ml-auto text-red-700`} disabled={pending} onClick={() => control("DELETE")}>Remove</button></div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
export function PaymentManager({ businessId, methods }: { businessId: string; methods: Tables<"business_payment_qrs">[] }) {
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Payment</h2>{methods.map((method, index) => <PaymentEditor key={`${method.id}-${method.updated_at}`} businessId={businessId} method={method} first={index === 0} last={index === methods.length - 1} />)}<PaymentEditor key={`new-${methods.length}`} businessId={businessId} /></section>;
}
