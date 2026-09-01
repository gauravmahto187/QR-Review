"use client";

import { Archive, LoaderCircle, PauseCircle, PlayCircle, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  changeBusinessStatusAction,
  type BusinessStatusState,
} from "@/features/businesses/actions";
import type { Database } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];
const initialState: BusinessStatusState = {};

export function BusinessStatusActions({
  businessId,
  status,
}: {
  businessId: string;
  status: BusinessStatus;
}) {
  const [selected, setSelected] = useState<BusinessStatus | null>(null);
  const [state, action, pending] = useActionState(changeBusinessStatusAction, initialState);

  if (status === "ARCHIVED") {
    return <p className="text-sm leading-6 text-slate-500">Archived businesses are retained for history and cannot be reactivated.</p>;
  }

  const target = selected;
  const label = target === "ARCHIVED" ? "Archive" : target === "SUSPENDED" ? "Suspend" : "Reactivate";

  return (
    <>
      {state.error ? <p className="mb-3 text-sm text-rose-600" role="alert">{state.error}</p> : null}
      {state.success ? <p className="mb-3 text-sm text-emerald-700" role="status">{state.success}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {status === "ACTIVE" ? (
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800" onClick={() => setSelected("SUSPENDED")} type="button">
            <PauseCircle className="size-5" aria-hidden="true" /> Suspend
          </button>
        ) : (
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800" onClick={() => setSelected("ACTIVE")} type="button">
            <PlayCircle className="size-5" aria-hidden="true" /> Reactivate
          </button>
        )}
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700" onClick={() => setSelected("ARCHIVED")} type="button">
          <Archive className="size-5" aria-hidden="true" /> Archive
        </button>
      </div>

      {target ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 sm:items-center sm:justify-center" role="presentation">
          <section aria-labelledby="status-dialog-title" aria-modal="true" className="w-full rounded-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-md" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950" id="status-dialog-title">{label} business?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {target === "ARCHIVED"
                    ? "This removes the business from active use and cannot be undone from the admin app. Its history remains stored."
                    : target === "SUSPENDED"
                      ? "The business remains stored but is marked unavailable until reactivated."
                      : "The business will return to active status."}
                </p>
              </div>
              <button aria-label="Close confirmation" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100" onClick={() => setSelected(null)} type="button"><X className="size-5" /></button>
            </div>
            <form action={action} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input name="businessId" type="hidden" value={businessId} />
              <input name="status" type="hidden" value={target} />
              <button className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700" onClick={() => setSelected(null)} type="button">Cancel</button>
              <button className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white ${target === "ARCHIVED" ? "bg-rose-700" : "bg-emerald-700"}`} disabled={pending} type="submit">
                {pending ? <LoaderCircle className="size-5 animate-spin" /> : null}
                {pending ? "Updating…" : `Yes, ${label.toLowerCase()}`}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
