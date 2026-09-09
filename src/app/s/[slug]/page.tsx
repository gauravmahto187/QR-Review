import type { Metadata } from "next";
import { CircleOff } from "lucide-react";
import { BusinessLogo } from "@/features/businesses/business-logo";
import { BrandLogo } from "@/components/brand-logo";
import { DeveloperCredit } from "@/components/developer-credit";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { PublicSmartLinks } from "@/features/smart-links/public-links";
import { resolveSmartLinks } from "@/server/services/smart-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Smart Links | NexGen Digital", referrer: "no-referrer" };

export default async function SmartLinksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let resolved;
  try { resolved = await resolveSmartLinks(slug); } catch { resolved = null; }
  if (!resolved) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-10"><section className="w-full max-w-md text-center"><CircleOff className="mx-auto size-9 text-slate-400" /><h1 className="mt-4 text-xl font-semibold text-slate-900">Links unavailable</h1><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">This business’s links are unavailable right now.</p><p className="mt-8 text-xs text-slate-400">NexGen Digital</p><DeveloperCredit /></section></main>;
  const { business, links, supabase } = resolved;
  return <main className="min-h-dvh bg-slate-50 px-4 py-7 sm:px-5 sm:py-8"><div className="mx-auto w-full max-w-[460px]">
    <header className="text-center"><div className="flex justify-center"><div className="scale-[0.88]"><BusinessLogo alt={business.name} color={business.primary_color} size="lg" url={getBusinessLogoUrl(supabase, business.logo_path)} /></div></div><h1 className="mt-1 break-words text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-950">{business.name}</h1>{business.description && <p className="mx-auto mt-2 line-clamp-2 max-w-[36ch] whitespace-pre-line break-words text-sm leading-5 text-slate-500">{business.description}</p>}</header>
    <PublicSmartLinks hasPayments={resolved.payments.length > 0} slug={slug} links={links.map(({ id, type }) => ({ id, type }))} />
    <footer className="mt-8 text-center text-[0.7rem] text-slate-400"><BrandLogo className="mx-auto h-5 w-20 opacity-60" /><span className="mt-1 block">Powered by NexGen Digital</span><DeveloperCredit /></footer>
  </div></main>;
}
