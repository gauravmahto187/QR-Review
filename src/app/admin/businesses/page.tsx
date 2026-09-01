import { Building2, Plus, Search } from "lucide-react";
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

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Businesses</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Business management</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Manage core business profiles and availability.</p>
        </div>
        <Link className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800" href="/admin/businesses/new">
          <Plus className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Add business</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      <form className="mt-7 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_12rem_auto]" method="get">
        <label className="relative block">
          <span className="sr-only">Search by business name</span>
          <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" aria-hidden="true" />
          <input className="min-h-12 w-full rounded-2xl border border-slate-300 pl-12 pr-4 text-base outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" defaultValue={search} name="q" placeholder="Search businesses" />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-emerald-600" defaultValue={status ?? ""} name="status">
            <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <button className="min-h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white" type="submit">Apply</button>
      </form>

      {businesses.length ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Business list">
          {businesses.map((business) => {
            const subscription = subscriptions.get(business.id) ?? null;
            const expiringLabel = getExpiringLabel(getSubscriptionTiming(subscription).expiringWindow);
            return (
            <Link className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" href={`/admin/businesses/${business.id}`} key={business.id}>
              <div className="flex items-start gap-3">
                <BusinessLogo alt={business.name} color={business.primary_color} url={getBusinessLogoUrl(supabase, business.logo_path)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h2 className="truncate font-semibold text-slate-950 group-hover:text-emerald-800">{business.name}</h2><BusinessStatusBadge status={business.status} /></div>
                  <p className="mt-1 truncate text-sm text-slate-500">/r/{business.slug}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2"><SubscriptionStatusBadge subscription={subscription} />{expiringLabel ? <span className="text-xs font-medium text-amber-700">{expiringLabel}</span> : null}</div>
                </div>
              </div>
            </Link>
            );
          })}
        </section>
      ) : (
        <section className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Building2 className="size-7" aria-hidden="true" /></span>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">{search || status ? "No matching businesses" : "No businesses yet"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{search || status ? "Try changing your search or status filter." : "Create the first profile to begin managing a business."}</p>
        </section>
      )}
    </div>
  );
}
