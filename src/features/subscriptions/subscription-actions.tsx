"use client";

import { CalendarClock, LoaderCircle, PauseCircle, PlayCircle, Rocket, X, XCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { applySubscriptionAction, type SubscriptionActionState } from "@/features/subscriptions/actions";
import { getSubscriptionTiming, type Subscription } from "@/features/subscriptions/utils";

type Selection = {
  action: "START_TRIAL" | "ACTIVATE_MONTHS" | "SET_CUSTOM_EXPIRY" | "SUSPEND" | "REACTIVATE" | "CANCEL";
  label: string;
  months?: number;
};

const initialState: SubscriptionActionState = {};

function todayInNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kathmandu",
    year: "numeric",
  }).format(new Date());
}

export function SubscriptionActions({
  businessId,
  current,
  hasHistory,
}: {
  businessId: string;
  current: Subscription | null;
  hasHistory: boolean;
}) {
  const [state, formAction, pending] = useActionState(applySubscriptionAction, initialState);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [customDate, setCustomDate] = useState("");
  const timing = getSubscriptionTiming(current);
  const canExtend = current && ["TRIAL", "ACTIVE"].includes(current.status) && !timing.isExpired;
  const canSuspend = Boolean(canExtend);
  const canReactivate = current?.status === "SUSPENDED" && !timing.isExpired;
  const canCancel = Boolean(current && current.status !== "CANCELLED");

  const durationActions = [
    { label: "1 month", months: 1 },
    { label: "3 months", months: 3 },
    { label: "6 months", months: 6 },
    { label: "1 year", months: 12 },
  ];

  return (
    <div>
      {state.error ? <p className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{state.error}</p> : null}
      {state.success ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700" role="status">{state.success}</p> : null}

      {!hasHistory ? (
        <button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700" onClick={() => setSelected({ action: "START_TRIAL", label: "Start 7-day trial" })} type="button">
          <Rocket className="size-5" aria-hidden="true" /> Start 7-day trial
        </button>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {durationActions.map(({ label, months }) => (
          <button className="min-h-14 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-400" key={months} onClick={() => setSelected({ action: "ACTIVATE_MONTHS", label: `${canExtend ? "Extend" : "Activate"} ${label}`, months })} type="button">
            {canExtend ? "Extend" : "Activate"}<span className="block text-base">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <label className="text-sm font-semibold text-slate-800" htmlFor="custom-expiry">Custom expiry date</label>
        <p className="mt-1 text-xs leading-5 text-slate-500">Valid through 11:59 PM on the selected date in Nepal.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="min-h-12 rounded-2xl border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" id="custom-expiry" min={todayInNepal()} onChange={(event) => setCustomDate(event.target.value)} type="date" value={customDate} />
          <button className="min-h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={!customDate} onClick={() => setSelected({ action: "SET_CUSTOM_EXPIRY", label: "Set custom expiry" })} type="button"><CalendarClock className="mr-2 inline size-5" />Set expiry</button>
        </div>
      </div>

      {current ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {canSuspend ? <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800" onClick={() => setSelected({ action: "SUSPEND", label: "Suspend subscription" })} type="button"><PauseCircle className="size-5" />Suspend</button> : null}
          {canReactivate ? <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800" onClick={() => setSelected({ action: "REACTIVATE", label: "Reactivate subscription" })} type="button"><PlayCircle className="size-5" />Reactivate</button> : null}
          {canCancel ? <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700" onClick={() => setSelected({ action: "CANCEL", label: "Cancel subscription" })} type="button"><XCircle className="size-5" />Cancel</button> : null}
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 sm:items-center sm:justify-center" role="presentation">
          <section aria-labelledby="subscription-dialog-title" aria-modal="true" className="w-full rounded-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-md" role="dialog">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-950" id="subscription-dialog-title">{selected.label}?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This creates a new current subscription record and retains the previous record in history.</p></div><button aria-label="Close confirmation" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100" onClick={() => setSelected(null)} type="button"><X className="size-5" /></button></div>
            <form action={formAction} className="mt-6 grid gap-3 sm:grid-cols-2" onSubmit={() => setSelected(null)}>
              <input name="action" type="hidden" value={selected.action} /><input name="businessId" type="hidden" value={businessId} />
              {selected.months ? <input name="months" type="hidden" value={selected.months} /> : null}
              {selected.action === "SET_CUSTOM_EXPIRY" ? <input name="customDate" type="hidden" value={customDate} /> : null}
              <button className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700" onClick={() => setSelected(null)} type="button">Go back</button>
              <button className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white ${["CANCEL", "SUSPEND"].includes(selected.action) ? "bg-rose-700" : "bg-emerald-700"}`} disabled={pending} type="submit">{pending ? <LoaderCircle className="size-5 animate-spin" /> : null}{pending ? "Updating…" : "Confirm"}</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
