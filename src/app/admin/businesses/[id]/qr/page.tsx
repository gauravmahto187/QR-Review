import { ArrowLeft, Info, QrCode } from "lucide-react";
import { LoadingImage } from "@/components/loading-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BusinessLogo } from "@/features/businesses/business-logo";
import { getBusinessById } from "@/features/businesses/queries";
import { QrLinkControls } from "@/features/businesses/qr-link-controls";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { requireAdminPage } from "@/lib/auth/admin";
import { serverEnv } from "@/lib/env/server";
import { buildBusinessReviewUrl } from "@/lib/urls/business-review";
import { generateQrSvg, qrSvgDataUrl, loadQrLogo } from "@/server/services/qr-code";

const idSchema = z.uuid();

export default async function BusinessQrPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const { business, supabase } = await getBusinessById(id);
  if (!business) notFound();

  let publicUrl: string;
  let previewUrl: string;
  try {
    publicUrl = buildBusinessReviewUrl(business.slug, serverEnv.NEXT_PUBLIC_APP_URL);
    previewUrl = qrSvgDataUrl(await generateQrSvg(publicUrl, await loadQrLogo(supabase, business)));
  } catch {
    return <div className="mx-auto max-w-2xl"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> Business</Link><section className="mt-4 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-center"><Info className="mx-auto size-8 text-amber-700" /><h1 className="mt-4 text-xl font-semibold text-amber-950">QR configuration unavailable</h1><p className="mt-2 text-sm leading-6 text-amber-800">Set NEXT_PUBLIC_APP_URL to a valid public HTTP or HTTPS base URL, then reload this page.</p></section></div>;
  }

  return <div className="mx-auto max-w-2xl pb-8">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> Business</Link>
    <header className="mt-3 flex items-center gap-4"><BusinessLogo alt={business.name} color={business.primary_color} size="md" url={getBusinessLogoUrl(supabase, business.logo_path)} /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">NexGen Digital</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{business.name}</h1></div></header>
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8"><div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><QrCode className="size-6" /></div><h2 className="mt-3 text-xl font-semibold text-slate-950">Permanent review QR</h2><div className="mx-auto mt-5 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-4"><LoadingImage alt={`QR code for ${business.name}`} src={previewUrl} /></div></section>
    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><QrLinkControls businessId={business.id} publicUrl={publicUrl} slug={business.slug} /></section>
  </div>;
}
