import { ArrowLeft, ExternalLink, Link2, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessLogo } from "@/features/businesses/business-logo";
import { BusinessStatusActions } from "@/features/businesses/business-status-actions";
import { getBusinessById } from "@/features/businesses/queries";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { BusinessStatusBadge } from "@/features/businesses/status-badge";
import { serverEnv } from "@/lib/env/server";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business, supabase } = await getBusinessById(id);
  if (!business) notFound();
  const publicUrl = new URL(`/r/${business.slug}`, serverEnv.NEXT_PUBLIC_APP_URL).toString();
  return <div className="mx-auto max-w-3xl">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href="/admin/businesses"><ArrowLeft className="size-5" /> Businesses</Link>
    <section className="mt-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-4"><BusinessLogo alt={business.name} color={business.primary_color} size="lg" url={getBusinessLogoUrl(supabase, business.logo_path)} /><div className="min-w-0 flex-1"><BusinessStatusBadge status={business.status} /><h1 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{business.name}</h1>{business.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{business.description}</p> : null}</div></div><Link className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white" href={`/admin/businesses/${business.id}/edit`}><Pencil className="size-4" /> Edit profile</Link></section>
    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Links</h2><div className="mt-4 space-y-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Public review URL</p><a className="mt-1 flex items-center gap-2 break-all text-sm font-medium text-emerald-700" href={publicUrl} rel="noreferrer" target="_blank"><Link2 className="size-4 shrink-0" />{publicUrl}</a></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Google Review URL</p><a className="mt-1 flex items-center gap-2 break-all text-sm font-medium text-emerald-700" href={business.google_review_url} rel="noreferrer" target="_blank"><ExternalLink className="size-4 shrink-0" />{business.google_review_url}</a></div></div></section>
    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold text-slate-950">Availability</h2><p className="mb-4 mt-1 text-sm leading-6 text-slate-500">Change whether this business is available. Archiving is permanent in the admin app.</p><BusinessStatusActions businessId={business.id} status={business.status} /></section>
  </div>;
}
