import { PaymentManager } from "@/features/smart-links/payment-manager";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/lib/auth/admin";
import { getBusinessById } from "@/features/businesses/queries";
import { getSmartLinksAdmin, getSmartMetrics, getPaymentMethodsAdmin } from "@/features/smart-links/queries";
import { SmartLinksManager } from "@/features/smart-links/manager";
import { smartLinkLabels } from "@/features/smart-links/config";

export default async function SmartLinksAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { business } = await getBusinessById(id);
  if (!business) notFound();
  const [links, metrics, methods] = await Promise.all([getSmartLinksAdmin(id), getSmartMetrics(id), getPaymentMethodsAdmin(id)]);
  return <div className="mx-auto max-w-2xl space-y-5">
    <Link href={`/admin/businesses/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← Business</Link>
    <header><h1 className="text-2xl font-semibold">Smart Links</h1><p className="mt-1 text-slate-500">{business.name} · {links.length} configured</p><Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-700" href={`/admin/businesses/${id}/smart-qr`}>View Smart QR →</Link></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Smart Links analytics <span className="text-sm font-normal text-slate-500">· All time</span></h2>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-2xl font-semibold">{metrics.views}</p><p className="text-sm text-slate-500">Smart QR page views</p></div><div><p className="text-2xl font-semibold">{metrics.clicks}</p><p className="text-sm text-slate-500">Link clicks</p></div></div>
      <dl className="mt-4 space-y-2 text-sm">{metrics.byType.map(row => <div className="flex justify-between" key={row.type}><dt>{smartLinkLabels[row.type]}</dt><dd>{row.count}</dd></div>)}</dl>
      <p className="mt-5 text-sm">Payment page views: {metrics.paymentPageViews} · QR views: {metrics.paymentQrViews}</p><h3 className="mt-3 font-semibold">Views by payment method</h3><dl className="mt-2 space-y-2 text-sm">{metrics.paymentViews.map(row => <div className="flex justify-between" key={row.id}><dt>{row.name}</dt><dd>{row.count}</dd></div>)}</dl>
    </section>
    <SmartLinksManager businessId={id} links={links} />
    <PaymentManager businessId={id} methods={methods} />
  </div>;
}
