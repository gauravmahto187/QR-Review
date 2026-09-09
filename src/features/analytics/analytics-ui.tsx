import { ArrowRight, Eye, MousePointerClick, Play, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";

import { analyticsConversions, type AnalyticsEventCounts, type AnalyticsTrendPoint, type RecentActivity } from "@/features/analytics/types";
import { formatNepalDateTime } from "@/features/subscriptions/utils";

export function MetricCard({ label, value, className, interactive }: { label: string; value: number | string; className?: string; interactive?: boolean }) {
  return <article className={`relative rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{typeof value === "number" ? value.toLocaleString() : value}</p>{interactive ? <ArrowRight aria-hidden="true" className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600" /> : null}</article>;
}

export function EventMetricGrid({ events }: { events: AnalyticsEventCounts }) {
  const metrics = [
    { icon: Eye, label: "Page views", value: events.page_views },
    { icon: Play, label: "Review starts", value: events.review_starts },
    { icon: Sparkles, label: "Generated", value: events.reviews_generated },
    { icon: RefreshCw, label: "Regenerated", value: events.reviews_regenerated },
    { icon: MousePointerClick, label: "Google handoffs", value: events.google_handoffs },
  ];
  return <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map(({ icon: Icon, label, value }) => <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm" key={label}><Icon className="size-5 text-emerald-700" /><p className="mt-4 text-2xl font-semibold text-slate-950">{value.toLocaleString()}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></article>)}</div>;
}

export function ConversionGrid({ events }: { events: AnalyticsEventCounts }) {
  const conversion = analyticsConversions(events);
  const metrics = [
    ["Review start rate", conversion.reviewStartRate],
    ["Generation rate", conversion.generationRate],
    ["Google handoff rate", conversion.googleHandoffRate],
    ["Overall handoff conversion", conversion.overallHandoffConversion],
  ] as const;
  return <div className="mt-4 grid grid-cols-2 gap-3">{metrics.map(([label, value]) => <MetricCard key={label} label={label} value={`${value}%`} />)}</div>;
}

export function TrendChart({ points }: { points: AnalyticsTrendPoint[] }) {
  const hasActivity = points.some((point) => point.pageViews || point.googleHandoffs);
  if (!hasActivity) return <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">No activity in this date range.</div>;
  const width = 320;
  const height = 120;
  const padding = 10;
  const max = Math.max(1, ...points.flatMap((point) => [point.pageViews, point.googleHandoffs]));
  const coordinates = (key: "pageViews" | "googleHandoffs") => points.map((point, index) => `${padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1)},${height - padding - (point[key] * (height - padding * 2)) / max}`).join(" ");
  return <div className="mt-4"><div className="flex items-center gap-4 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600" />Page views</span><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-sky-500" />Google handoffs</span></div><svg aria-label="Daily page views and Google handoffs" className="mt-3 h-auto w-full overflow-visible" role="img" viewBox={`0 0 ${width} ${height}`}><line stroke="#e2e8f0" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} /><polyline fill="none" points={coordinates("pageViews")} stroke="#059669" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /><polyline fill="none" points={coordinates("googleHandoffs")} stroke="#0ea5e9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg><div className="mt-1 flex justify-between text-[0.65rem] font-medium text-slate-400"><span>{points[0]?.date}</span><span>{points.at(-1)?.date}</span></div></div>;
}

function activityLabel(type: RecentActivity["event_type"]) {
  if (type === "REVIEW_GENERATED") return "Review generated";
  if (type === "REVIEW_REGENERATED") return "Review regenerated";
  return "Google Maps opened";
}

export function RecentActivityList({ activity }: { activity: RecentActivity[] }) {
  if (!activity.length) return <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No recent activity in this range.</p>;
  return <div className="mt-4 divide-y divide-slate-100">{activity.map((item, index) => <div className="flex items-start justify-between gap-3 py-3" key={`${item.created_at}-${index}`}><div><p className="text-sm font-semibold text-slate-800">{activityLabel(item.event_type)}</p>{item.business_name && item.business_id ? <Link className="mt-1 block text-xs font-medium text-emerald-700" href={`/admin/businesses/${item.business_id}/analytics`}>{item.business_name}</Link> : null}</div><time className="shrink-0 text-right text-[0.65rem] leading-4 text-slate-400">{formatNepalDateTime(item.created_at)}</time></div>)}</div>;
}
