"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PendingLabel } from "@/components/loading";
import { deleteBusinessAction, type DeleteBusinessState } from "./delete-action";

export function DeleteBusinessButton({ businessId, businessName, cleanup = false }: { businessId: string; businessName: string; cleanup?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteBusinessAction, {} as DeleteBusinessState);
  const router = useRouter();
  useEffect(() => {
    if (state.complete) { dialog.current?.close(); router.replace("/admin/businesses"); router.refresh(); }
  }, [state.complete, router]);
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700"><Trash2 aria-hidden="true" className="size-5" />{cleanup ? "Retry cleanup" : "Delete Business"}</button>
    <dialog ref={dialog} onCancel={event => { if (pending) event.preventDefault(); }} className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-3xl bg-white p-6 shadow-2xl backdrop:bg-slate-950/50" aria-label="Delete business confirmation">
      <h2 className="text-xl font-semibold text-slate-950">{cleanup || state.deleted ? "Finish uploaded-file cleanup" : "Permanently delete this business?"}</h2>
      <p className="mt-3 break-words text-sm leading-6 text-slate-600">{cleanup || state.deleted ? `${businessName} has been deleted. Retry removing its remaining uploaded files.` : `This permanently deletes ${businessName}, its subscriptions, reviews, questions, Smart Links, payment methods, analytics, and uploaded images. Its QR links will stop working.`}</p>
      <form action={action} onReset={event => event.preventDefault()} className="mt-5 space-y-4" aria-busy={pending}>
        <input type="hidden" name="businessId" value={businessId} />
        {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
        <div className="grid grid-cols-2 gap-3"><button type="button" disabled={pending} onClick={() => dialog.current?.close()} className="min-h-12 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-rose-700 px-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? <PendingLabel>{cleanup || state.deleted ? "Cleaning up…" : "Deleting…"}</PendingLabel> : cleanup || state.deleted ? "Retry cleanup" : "Delete"}</button></div>
      </form>
    </dialog>
  </>;
}
