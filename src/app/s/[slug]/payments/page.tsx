import Link from "next/link";
import { CircleOff } from "lucide-react";
import type { Metadata } from "next";
import { resolveSmartLinks } from "@/server/services/smart-links";
import { PublicPayments } from "@/features/smart-links/public-payments";
import { BrandLogo } from "@/components/brand-logo";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment | NexGen Digital", referrer: "no-referrer" };
export default async function PaymentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let resolved;
  try { resolved = await resolveSmartLinks(slug); } catch { resolved = null; }
  return <main className="min-h-dvh bg-slate-50 px-4 py-7 sm:px-5 sm:py-8"><div className="mx-auto w-full max-w-[460px]">
    <Link href={`/s/${encodeURIComponent(slug)}`} className="inline-flex min-h-12 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">← <span>Back</span></Link>
    {resolved ? <><header className="mt-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Payment</p><h1 className="mt-1 break-words text-[1.65rem] font-semibold leading-tight text-slate-950">{resolved.business.name}</h1></header><PublicPayments slug={slug} methods={resolved.payments.map(({ id, name }) => ({ id, name }))} /></> : <section className="mt-16 text-center"><CircleOff className="mx-auto size-9 text-slate-400" /><h1 className="mt-4 text-xl font-semibold text-slate-900">Links unavailable</h1><p className="mt-2 text-sm text-slate-500">This business’s links are unavailable right now.</p></section>}
    <footer className="mt-8 text-center text-[0.7rem] text-slate-400"><BrandLogo className="mx-auto h-5 w-20 opacity-60" /><span className="mt-1 block">Powered by NexGen Digital</span></footer>
  </div></main>;
}
