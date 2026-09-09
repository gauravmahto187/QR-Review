import type { Metadata } from "next";
import { CircleOff } from "lucide-react";
import { BusinessLogo } from "@/features/businesses/business-logo";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { PublicSmartLinks } from "@/features/smart-links/public-links";
import { resolveSmartLinks } from "@/server/services/smart-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Smart Links | Boostup", referrer: "no-referrer" };

export default async function SmartLinksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let resolved;
  try { resolved = await resolveSmartLinks(slug); } catch { resolved = null; }
  if (!resolved) return <main className="flex min-h-dvh items-center bg-slate-50 px-5 py-10"><section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm"><CircleOff className="mx-auto size-10 text-slate-400" /><h1 className="mt-5 text-2xl font-semibold">Links unavailable</h1><p className="mt-3 text-sm leading-6 text-slate-600">This business’s links are unavailable right now. Please try again later.</p><p className="mt-8 text-xs text-slate-400">Boostup AI Smart QR</p></section></main>;
  const { business, links, supabase } = resolved;
  return <main className="min-h-dvh bg-slate-50 px-4 py-5 sm:py-8"><section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <header className="text-center"><div className="flex justify-center"><BusinessLogo alt={business.name} color={business.primary_color} size="lg" url={getBusinessLogoUrl(supabase, business.logo_path)} /></div><h1 className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-950">{business.name}</h1>{business.description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-500">{business.description}</p>}</header>
    <PublicSmartLinks hasPayments={resolved.payments.length > 0} slug={slug} links={links.map(({ id, type, label }) => ({ id, type, label }))} />
    <footer className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">Powered by Boostup AI Smart QR</footer>
  </section></main>;
}
