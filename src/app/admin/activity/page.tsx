import { History } from "lucide-react";

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
    <DateRangeFilter basePath="/admin/activity" range={range} />

    <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Activity feed</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{analytics.recentActivity.length} shown</span></div>
      <RecentActivityList activity={analytics.recentActivity} />
    </section>
  </div>;
}
