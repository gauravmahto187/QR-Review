import { History, MousePointerClick } from "lucide-react";

import { RecentActivityList } from "@/features/analytics/analytics-ui";
import { getAnalyticsDateRange } from "@/features/analytics/date-range";
import { DateRangeFilter } from "@/features/analytics/date-range-filter";
import { getPlatformAnalytics } from "@/features/analytics/queries";

export const metadata = { title: "Activity | NexGen Digital" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = getAnalyticsDateRange(await searchParams);
  const analytics = await getPlatformAnalytics(range);

  return <div className="mx-auto max-w-3xl">
    <header className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><History className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Customer journey</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Recent activity</h1></div></header>
    <p className="mt-3 text-sm leading-6 text-slate-600">Review generation and Google Maps handoff events across all businesses.</p>

    <DateRangeFilter basePath="/admin/activity" range={range} />

    <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-sky-900"><MousePointerClick className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden="true" /><p className="text-xs leading-5"><span className="font-semibold">Google Maps opened</span> means the customer continued to Google. It does not confirm that a review was posted.</p></div>
      <div className="mt-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Activity feed</h2><p className="mt-1 text-xs text-slate-500">Anonymous events only · Asia/Kathmandu time</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{analytics.recentActivity.length} shown</span></div>
      <RecentActivityList activity={analytics.recentActivity} />
    </section>
  </div>;
}
