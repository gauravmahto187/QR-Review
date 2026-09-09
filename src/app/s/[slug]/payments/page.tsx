import Link from "next/link";
import type { Metadata } from "next";
import { resolveSmartLinks } from "@/server/services/smart-links";
import { PublicPayments } from "@/features/smart-links/public-payments";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment | Boostup", referrer: "no-referrer" };
export default async function PaymentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let resolved;
  try { resolved = await resolveSmartLinks(slug); } catch { resolved = null; }
  return <main className="min-h-dvh bg-slate-50 px-4 py-5"><section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <Link href={`/s/${encodeURIComponent(slug)}`} className="inline-flex min-h-12 items-center text-sm font-semibold text-slate-600">← Back</Link>
    <h1 className="mt-3 text-2xl font-semibold">{resolved ? "Payment" : "Links unavailable"}</h1>
    {resolved ? <><p className="mt-1 text-sm text-slate-500">{resolved.business.name}</p><PublicPayments slug={slug} methods={resolved.payments.map(({ id, name }) => ({ id, name }))} /></> : <p className="mt-3 text-sm text-slate-600">This business’s links are unavailable right now.</p>}
  </section></main>;
}
