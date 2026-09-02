import { ArrowRight, Building2, CalendarClock, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/features/businesses/business-logo";
import { BUSINESS_STATUSES } from "@/features/businesses/constants";
import { listBusinesses } from "@/features/businesses/queries";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { BusinessStatusBadge } from "@/features/businesses/status-badge";
import { SubscriptionStatusBadge } from "@/features/subscriptions/subscription-status-badge";
import { getExpiringLabel, getSubscriptionTiming } from "@/features/subscriptions/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import type { Database } from "@/types/database";

export const metadata = { title: "Businesses | Boostup AI Smart QR" };

type BusinessStatus = Database["public"]["Enums"]["business_status"];

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminPage();
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const status = BUSINESS_STATUSES.includes(params.status as BusinessStatus) ? (params.status as BusinessStatus) : undefined;
  const { businesses, subscriptions, supabase } = await listBusinesses({ search, status });
  const hasFilters = Boolean(search || status);
  const resultLabel = `${businesses.length} ${businesses.length === 1 ? "business" : "businesses"}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Business workspace</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Businesses</h1>
        </div>
        <Link className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(4,120,87,0.8)] transition hover:bg-emerald-800" href="/admin/businesses/new">
          <Plus className="size-5" aria-hidden="true" />Add business
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage profiles, availability, and subscription access.</p>

      <form className="mt-6 rounded-[1.5rem] border border-slate-200/90 bg-white p-3.5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] sm:grid sm:grid-cols-[1fr_12rem_auto] sm:gap-3 sm:p-4" method="get">
        <label className="relative block">
          <span className="sr-only">Search by business name</span>
          <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" aria-hidden="true" />
          <input className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50/60 pl-12 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" defaultValue={search} name="q" placeholder="Search businesses" />
        </label>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 sm:mt-0 sm:contents">
          <label>
            <span className="sr-only">Filter by status</span>
            <select className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" defaultValue={status ?? ""} name="status">
              <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit"><SlidersHorizontal className="size-4" aria-hidden="true" />Apply</button>
        </div>
      </form>

      <div className="mt-6 flex min-h-8 items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-slate-900">{hasFilters ? "Filtered results" : "All businesses"}</p><p className="mt-0.5 text-xs text-slate-500">{resultLabel}</p></div>
        {hasFilters ? <Link className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" href="/admin/businesses">Clear filters</Link> : null}
      </div>

      {businesses.length ? (
        <section className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="Business list">
          {businesses.map((business) => {
            const subscription = subscriptions.get(business.id) ?? null;
            const timing = getSubscriptionTiming(subscription);
            const expiringLabel = getExpiringLabel(timing.expiringWindow);
            return (
            <Link className="group rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)]" href={`/admin/businesses/${business.id}`} key={business.id}>
              <div className="flex items-start gap-3.5">
                <BusinessLogo alt={business.name} color={business.primary_color} url={getBusinessLogoUrl(supabase, business.logo_path)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-slate-950 transition group-hover:text-emerald-800">{business.name}</h2><p className="mt-1 truncate text-xs font-medium text-slate-500">/r/{business.slug}</p></div><ArrowRight className="mt-1 size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" /></div>
                  <div className="mt-3"><BusinessStatusBadge status={business.status} /></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                <div className="flex min-w-0 items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarClock className="size-4.5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Subscription</p><p className={`mt-0.5 truncate text-xs font-medium ${expiringLabel ? "text-amber-700" : "text-slate-600"}`}>{expiringLabel ?? subscription?.plan ?? "No plan configured"}</p></div></div>
                <SubscriptionStatusBadge subscription={subscription} />
              </div>
            </Link>
            );
          })}
        </section>
      ) : (
        <section className="mt-4 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Building2 className="size-7" aria-hidden="true" /></span>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">{search || status ? "No matching businesses" : "No businesses yet"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{search || status ? "Try changing your search or status filter." : "Create the first profile to begin managing a business."}</p>
          {hasFilters ? <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white" href="/admin/businesses">Clear filters</Link> : null}
        </section>
      )}
    </div>
  );
}
