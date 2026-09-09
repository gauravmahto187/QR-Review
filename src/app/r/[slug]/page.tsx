import { Building2, CircleOff } from "lucide-react";

import { BusinessLogo } from "@/features/businesses/business-logo";
import { BrandLogo } from "@/components/brand-logo";
import { getBusinessLogoUrl } from "@/features/businesses/storage";
import { PageViewTracker } from "@/features/public-review/page-view-tracker";
import { PublicReviewFlow } from "@/features/public-review/public-review-flow";
import { hasPublicSessionCookie, loadExistingPublicSession, loadPublicGeneration, publicSessionFromRow, resolvePublicReview } from "@/server/services/public-review";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function PublicState({ message, title }: { message: string; title: string }) {
  return <main className="flex min-h-dvh items-center bg-slate-50 px-5 py-10"><section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><CircleOff className="size-7" /></span><h1 className="mt-5 text-2xl font-semibold text-slate-950">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{message}</p><p className="mt-8 text-xs font-semibold text-slate-400">NexGen Digital</p></section></main>;
}

async function loadPublicPage(slug: string) {
  try {
    const resolved = await resolvePublicReview(slug);
    if (resolved.kind !== "READY") return { existing: null, generation: null, logoUrl: null, resolved };
    const existing = await loadExistingPublicSession(resolved.business.id);
    const sessionExpired = !existing && await hasPublicSessionCookie(resolved.business.id);
    const generation = existing ? await loadPublicGeneration(existing.id) : null;
    const logoUrl = getBusinessLogoUrl(resolved.supabase, resolved.business.logo_path);
    return { existing, generation, logoUrl, resolved, sessionExpired };
  } catch {
    logger.error("public_review.page_load_failed", { route: "/r/[slug]" });
    return null;
  }
}

export default async function PublicReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPublicPage(slug);
  if (!page) return <PublicState title="Something went wrong" message="We couldn’t load this review page. Please try again shortly." />;
  const { resolved } = page;
  if (resolved.kind === "NOT_FOUND") return <PublicState title="Review page not found" message="Please check the link or ask the business for a new one." />;
  if (resolved.kind === "UNAVAILABLE") return <PublicState title="Reviews unavailable" message="This business’s review page is unavailable right now. Please try again later." />;
  if (resolved.kind === "NO_QUESTIONS") return <><PageViewTracker slug={slug} /><PublicState title="Review form not ready" message="This business is still preparing its review questions. Please try again later." /></>;

  return <main className="min-h-dvh bg-slate-50 px-4 py-5 sm:px-5 sm:py-8">
    <PageViewTracker slug={slug} />
    <section className="mx-auto min-h-[calc(100dvh-2.5rem)] w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] sm:min-h-0 sm:p-7">
      <header className="text-center"><div className="flex justify-center"><BusinessLogo alt={resolved.business.name} color={resolved.business.primary_color} size="lg" url={page.logoUrl} /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Share your experience</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{resolved.business.name}</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your feedback helps us improve.</p></header>
      <PublicReviewFlow initialGeneration={page.generation} initialSession={page.existing ? publicSessionFromRow(page.existing) : null} initialSessionExpired={page.sessionExpired ?? false} questions={resolved.questions} slug={slug} />
      <footer className="mt-8 border-t border-slate-100 pt-4 text-center text-[0.7rem] text-slate-400"><BrandLogo className="mx-auto h-5 w-20 opacity-60" /><span className="mt-1 inline-flex items-center gap-1.5"><Building2 className="size-3.5" />Powered by NexGen Digital</span></footer>
    </section>
  </main>;
}
