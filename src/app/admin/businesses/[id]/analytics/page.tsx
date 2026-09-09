import { ArrowLeft, BarChart3, QrCode } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ConversionGrid, EventMetricGrid, RecentActivityList, TrendChart } from "@/features/analytics/analytics-ui";
import { getAnalyticsDateRange } from "@/features/analytics/date-range";
import { DateRangeFilter } from "@/features/analytics/date-range-filter";
import { getBusinessAnalytics } from "@/features/analytics/queries";
import { BusinessLogo } from "@/features/businesses/business-logo";
import { getBusinessById } from "@/features/businesses/queries";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { requireAdminPage } from "@/lib/auth/admin";

const idSchema = z.uuid();

export default async function BusinessAnalyticsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const range = getAnalyticsDateRange(await searchParams);
  const { business, supabase } = await getBusinessById(id);
  if (!business) notFound();
  const analytics = await getBusinessAnalytics(business.id, range);
  const hasActivity = Object.values(analytics.events).some((value) => value > 0);

  return <div className="mx-auto max-w-3xl pb-8">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> Business</Link>
    <header className="mt-3 flex items-center gap-4"><BusinessLogo alt={business.name} color={business.primary_color} size="md" url={getBusinessLogoUrl(supabase, business.logo_path)} /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Business analytics</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{business.name}</h1></div></header>
    <DateRangeFilter basePath={`/admin/businesses/${business.id}/analytics`} range={range} />
    {!hasActivity ? <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-sm"><BarChart3 className="mx-auto size-9 text-slate-300" /><h2 className="mt-4 text-lg font-semibold text-slate-950">No activity yet</h2><Link className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 text-sm font-semibold text-white" href={`/admin/businesses/${business.id}/qr`}><QrCode className="size-5" />View QR</Link></section> : <>
      <section className="mt-7"><h2 className="text-lg font-semibold text-slate-950">Activity</h2><EventMetricGrid events={analytics.events} /></section>
      <section className="mt-8"><h2 className="text-lg font-semibold text-slate-950">Conversion</h2><ConversionGrid events={analytics.events} /></section>
      <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Daily trend</h2><TrendChart points={analytics.trend} /></section>
      <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Recent activity</h2><RecentActivityList activity={analytics.recentActivity} /></section>
    </>}
  </div>;
}
