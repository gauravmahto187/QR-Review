import { BarChart3, Building2, CalendarClock } from "lucide-react";
import Link from "next/link";

import { EventMetricGrid, MetricCard, TrendChart } from "@/features/analytics/analytics-ui";
import { getAnalyticsDateRange } from "@/features/analytics/date-range";
import { DateRangeFilter } from "@/features/analytics/date-range-filter";
import { getPlatformAnalytics } from "@/features/analytics/queries";
import { ALERT_BUCKETS } from "@/features/subscriptions/alert-buckets";

export const metadata = { title: "Analytics | NexGen Digital" };

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = getAnalyticsDateRange(await searchParams);
  const analytics = await getPlatformAnalytics(range);
  const subscriptionMetrics = ALERT_BUCKETS.map(({ key, label, countKey }) => ({ bucket: key, label, value: analytics.subscriptions[countKey] }));

  return <div>
    <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><BarChart3 className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Platform analytics</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Dashboard</h1></div></div>
    <DateRangeFilter basePath="/admin" range={range} />

    <section className="mt-7"><div className="flex items-center gap-2"><Building2 className="size-5 text-slate-500" /><h2 className="text-lg font-semibold text-slate-950">Businesses</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard label="Total" value={analytics.businesses.total} /><MetricCard label="Active" value={analytics.businesses.active} /><MetricCard label="Suspended" value={analytics.businesses.suspended} /><MetricCard label="Archived" value={analytics.businesses.archived} /></div></section>

    <section className="mt-8"><h2 className="text-lg font-semibold text-slate-950">Review activity</h2><EventMetricGrid events={analytics.events} /></section>
    <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Activity trend</h2><TrendChart points={analytics.trend} /></section>

    <section className="mt-8"><div className="flex items-center gap-2"><CalendarClock className="size-5 text-amber-600" /><h2 className="text-lg font-semibold text-slate-950">Subscription alerts</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{subscriptionMetrics.map(({ bucket, label, value }) => <Link className="group block rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" href={`/admin/subscriptions/alerts/${bucket}`} key={bucket}><MetricCard className="pr-10 transition group-hover:border-amber-300 group-hover:shadow-md" interactive label={label} value={value} /></Link>)}</div></section>
  </div>;
}
