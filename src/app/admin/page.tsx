import { AlertTriangle, BarChart3, Building2, CalendarClock } from "lucide-react";
import Link from "next/link";

import { ConversionGrid, EventMetricGrid, MetricCard, TrendChart } from "@/features/analytics/analytics-ui";
import { getAnalyticsDateRange } from "@/features/analytics/date-range";
import { DateRangeFilter } from "@/features/analytics/date-range-filter";
import { getPlatformAnalytics } from "@/features/analytics/queries";
import { formatNepalDate } from "@/features/subscriptions/utils";

export const metadata = { title: "Analytics | NexGen Digital" };

function alertLabel(window: string) {
  if (window === "EXPIRED") return "Expired";
  if (window === "TODAY") return "Expires today";
  if (window === "WITHIN_3_DAYS") return "Within 3 days";
  if (window === "WITHIN_7_DAYS") return "Within 7 days";
  return "Within 30 days";
}

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = getAnalyticsDateRange(await searchParams);
  const analytics = await getPlatformAnalytics(range);
  const subscriptionMetrics = [
    ["Expired", analytics.subscriptions.expired],
    ["Today", analytics.subscriptions.expires_today],
    ["Within 3 days", analytics.subscriptions.within_3_days],
    ["Within 7 days", analytics.subscriptions.within_7_days],
    ["Within 30 days", analytics.subscriptions.within_30_days],
  ] as const;

  return <div>
    <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><BarChart3 className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Platform analytics</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Dashboard</h1></div></div><p className="mt-3 text-sm leading-6 text-slate-500">Real anonymous activity for {range.label.toLowerCase()}. Google handoffs are outbound clicks, not confirmed submissions.</p>
    <DateRangeFilter basePath="/admin" range={range} />

    <section className="mt-7"><div className="flex items-center gap-2"><Building2 className="size-5 text-slate-500" /><h2 className="text-lg font-semibold text-slate-950">Businesses</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard label="Total" value={analytics.businesses.total} /><MetricCard label="Active" value={analytics.businesses.active} /><MetricCard label="Suspended" value={analytics.businesses.suspended} /><MetricCard label="Archived" value={analytics.businesses.archived} /></div></section>

    <section className="mt-8"><h2 className="text-lg font-semibold text-slate-950">Review activity</h2><EventMetricGrid events={analytics.events} /></section>
    <section className="mt-8"><h2 className="text-lg font-semibold text-slate-950">Conversion</h2><p className="mt-1 text-xs leading-5 text-slate-500">Rates safely show 0% when no earlier funnel activity exists.</p><ConversionGrid events={analytics.events} /></section>
    <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Activity trend</h2><p className="mt-1 text-xs text-slate-500">Daily totals use Asia/Kathmandu calendar dates.</p><TrendChart points={analytics.trend} /></section>

    <section className="mt-8"><div className="flex items-center gap-2"><CalendarClock className="size-5 text-amber-600" /><h2 className="text-lg font-semibold text-slate-950">Subscription alerts</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{subscriptionMetrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}</div>{analytics.subscriptionAlerts.length ? <div className="mt-4 space-y-3">{analytics.subscriptionAlerts.map((alert) => <Link className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4" href={`/admin/businesses/${alert.business_id}/subscription`} key={alert.business_id}><div className="min-w-0"><p className="truncate text-sm font-semibold text-amber-950">{alert.business_name}</p><p className="mt-1 text-xs text-amber-800">{alertLabel(alert.window)} · {formatNepalDate(alert.expires_at)}</p></div><AlertTriangle className="size-5 shrink-0 text-amber-600" /></Link>)}</div> : <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No expired or expiring subscriptions.</p>}</section>
  </div>;
}
