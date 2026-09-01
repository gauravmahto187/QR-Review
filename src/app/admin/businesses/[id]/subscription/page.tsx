import { ArrowLeft, CalendarDays, Clock3, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubscriptionActions } from "@/features/subscriptions/subscription-actions";
import { SubscriptionStatusBadge } from "@/features/subscriptions/subscription-status-badge";
import { getSubscriptionManagementData } from "@/features/subscriptions/queries";
import { formatNepalDateTime, getExpiringLabel, getSubscriptionTiming } from "@/features/subscriptions/utils";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const data = await getSubscriptionManagementData(id);
  if (!data) notFound();
  const timing = getSubscriptionTiming(data.current);
  const expiringLabel = getExpiringLabel(timing.expiringWindow);

  return <div className="mx-auto max-w-3xl">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href={`/admin/businesses/${data.business.id}`}><ArrowLeft className="size-5" /> {data.business.name}</Link>
    <div className="mt-3"><p className="text-sm font-semibold text-emerald-700">Subscription</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Manage access</h1><p className="mt-2 text-sm leading-6 text-slate-600">Subscription validity is enforced from current status and UTC expiry—not a scheduled job.</p></div>

    <section className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current subscription</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{data.current?.plan ?? "Not configured"}</h2></div><SubscriptionStatusBadge subscription={data.current} /></div>
      {data.current ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><CalendarDays className="size-4" />Expires</p><p className="mt-2 text-sm font-semibold text-slate-800">{formatNepalDateTime(data.current.expires_at)}</p><p className="mt-1 text-xs text-slate-500">Nepal time</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Clock3 className="size-4" />Remaining</p><p className="mt-2 text-sm font-semibold text-slate-800">{timing.isExpired ? "Expired" : timing.expiresToday ? "Expires today" : `${timing.daysRemaining} days`}</p>{expiringLabel ? <p className="mt-1 text-xs font-medium text-amber-700">{expiringLabel}</p> : null}</div></div> : <p className="mt-4 text-sm leading-6 text-slate-500">This business is unavailable until a trial or active subscription is created.</p>}
      <div className={`mt-5 rounded-2xl p-4 text-sm ${data.availability.valid ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}><span className="font-semibold">Business access:</span> {data.availability.valid ? "Available" : `Unavailable — ${data.availability.reason.toLowerCase().replaceAll("_", " ")}`}</div>
    </section>

    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Subscription actions</h2><p className="mb-5 mt-1 text-sm leading-6 text-slate-500">Valid renewals extend from the existing expiry. Expired or unavailable subscriptions start from now.</p><SubscriptionActions businessId={data.business.id} current={data.current} hasHistory={data.history.length > 0} /></section>

    <section className="mt-5"><div className="flex items-center gap-2"><History className="size-5 text-slate-500" /><h2 className="text-lg font-semibold text-slate-950">Subscription history</h2></div>
      {data.history.length ? <div className="mt-4 space-y-3">{data.history.map((subscription) => { const itemTiming = getSubscriptionTiming(subscription); return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm" key={subscription.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{subscription.plan}</p><p className="mt-1 text-xs text-slate-500">Created {formatNepalDateTime(subscription.created_at)}</p></div><div className="flex flex-col items-end gap-2"><SubscriptionStatusBadge subscription={subscription} />{subscription.is_current ? <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700">Current</span> : null}</div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">Started</dt><dd className="mt-1 text-slate-700">{formatNepalDateTime(subscription.starts_at)}</dd></div><div><dt className="text-xs text-slate-400">Expires</dt><dd className="mt-1 text-slate-700">{formatNepalDateTime(subscription.expires_at)}</dd></div>{subscription.suspended_at ? <div><dt className="text-xs text-slate-400">Suspended</dt><dd className="mt-1 text-slate-700">{formatNepalDateTime(subscription.suspended_at)}</dd></div> : null}{subscription.cancelled_at ? <div><dt className="text-xs text-slate-400">Cancelled</dt><dd className="mt-1 text-slate-700">{formatNepalDateTime(subscription.cancelled_at)}</dd></div> : null}</dl>{itemTiming.isExpired && subscription.status !== "EXPIRED" ? <p className="mt-3 text-xs text-rose-600">Effectively expired from its UTC expiry, regardless of stored status.</p> : null}</article>; })}</div> : <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No subscription history yet.</div>}
    </section>
  </div>;
}
