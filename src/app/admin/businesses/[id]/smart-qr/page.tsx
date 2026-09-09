import { ArrowLeft, BadgeCheck, Info, Printer, QrCode } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BusinessLogo } from "@/features/businesses/business-logo";
import { getBusinessById } from "@/features/businesses/queries";
import { QrLinkControls } from "@/features/businesses/qr-link-controls";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { requireAdminPage } from "@/lib/auth/admin";
import { serverEnv } from "@/lib/env/server";
import { buildBusinessSmartUrl } from "@/lib/urls/business-smart";
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
    publicUrl = buildBusinessSmartUrl(business.slug, serverEnv.NEXT_PUBLIC_APP_URL);
    previewUrl = qrSvgDataUrl(await generateQrSvg(publicUrl, await loadQrLogo(supabase, business)));
  } catch {
    return <div className="mx-auto max-w-2xl"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> Business</Link><section className="mt-4 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-center"><Info className="mx-auto size-8 text-amber-700" /><h1 className="mt-4 text-xl font-semibold text-amber-950">QR configuration unavailable</h1><p className="mt-2 text-sm leading-6 text-amber-800">Set NEXT_PUBLIC_APP_URL to a valid public HTTP or HTTPS base URL, then reload this page.</p></section></div>;
  }

  return <div className="mx-auto max-w-2xl pb-8">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> Business</Link>
    <header className="mt-3 flex items-center gap-4"><BusinessLogo alt={business.name} color={business.primary_color} size="md" url={getBusinessLogoUrl(supabase, business.logo_path)} /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Boostup · AI Smart QR</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{business.name}</h1></div></header>
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8"><div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><QrCode className="size-6" /></div><h2 className="mt-3 text-xl font-semibold text-slate-950">Permanent Smart Links QR</h2><p className="mt-2 text-sm leading-6 text-slate-500">This QR always points to the same business Smart Links page.</p><div className="mx-auto mt-5 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-4"><Image alt={`QR code for ${business.name}`} className="h-auto w-full" height={1024} priority src={previewUrl} unoptimized width={1024} /></div><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><BadgeCheck className="size-4" />Ready for print and scan</p></section>
    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><QrLinkControls purpose="smart" businessId={business.id} publicUrl={publicUrl} slug={business.slug} /></section>
    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><Printer className="size-5 text-slate-600" /><h2 className="text-lg font-semibold text-slate-950">Printing guidance</h2></div><ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600"><li>Use PNG for everyday printing and SVG for professional or large-format artwork.</li><li>Keep the white border intact and avoid stretching, recoloring, or placing artwork over the code.</li><li>Test-scan one printed sample at its intended size before producing a full batch.</li></ul><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Subscription or link changes never alter this QR. NFC tags will use this exact same permanent URL.</p></section>
  </div>;
}

