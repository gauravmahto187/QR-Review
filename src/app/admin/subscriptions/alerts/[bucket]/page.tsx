import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAlertBucket } from "@/features/subscriptions/alert-buckets";
import { getSubscriptionAlerts } from "@/features/subscriptions/queries";
import { formatNepalDate } from "@/features/subscriptions/utils";
import { requireAdminPage } from "@/lib/auth/admin";

function statusLabel(status: string, expired: boolean) {
  if (expired) return "Expired";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function SubscriptionAlertPage({ params }: { params: Promise<{ bucket: string }> }) {
  await requireAdminPage();
  const { bucket: bucketValue } = await params;
  const bucket = getAlertBucket(bucketValue);
  if (!bucket) notFound();

  const alerts = await getSubscriptionAlerts(bucket.key);

  return <div className="mx-auto max-w-3xl">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href="/admin"><ArrowLeft className="size-5" /> Dashboard</Link>
    <header className="mt-3"><p className="text-sm font-semibold text-emerald-700">Subscription alerts</p><div className="mt-1 flex items-baseline justify-between gap-3"><h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{bucket.label}</h1><span className="text-sm font-semibold text-slate-500">{alerts.length} total</span></div></header>

    {alerts.length ? <section className="mt-6 space-y-3" aria-label={`${bucket.label} subscriptions`}>
      {alerts.map((alert) => <Link className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" href={`/admin/businesses/${alert.business_id}/subscription`} key={alert.business_id}>
        <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{alert.business_name}</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="size-4 shrink-0 text-slate-400" />Expires {formatNepalDate(alert.expires_at)}</p><p className="mt-1 text-xs font-medium text-slate-500">{statusLabel(alert.status, bucket.key === "expired")}</p></div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700">Manage subscription <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
      </Link>)}
    </section> : <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No subscriptions in this range.</p>}
  </div>;
}
