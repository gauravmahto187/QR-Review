import Link from "next/link";
import { ArrowUpRight, Building2, MessageSquareText, Sparkles } from "lucide-react";

import { requireAdminPage } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin home | Boostup AI Smart QR",
};

const setupCards = [
  {
    description: "Create, search, edit, suspend, and archive business profiles.",
    href: "/admin/businesses",
    icon: Building2,
    label: "Businesses",
  },
  {
    description: "Review sessions and generation tools will be added later.",
    href: "/admin/reviews",
    icon: MessageSquareText,
    label: "Reviews",
  },
] as const;

export default async function AdminHomePage() {
  const admin = await requireAdminPage();
  const displayName = admin.display_name?.trim() || "Administrator";

  return (
    <div>
      <p className="text-sm font-semibold text-emerald-700">Admin home</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Welcome, {displayName}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Your secure workspace is ready. Business and review management will
        appear here as each product phase is approved.
      </p>

      <section className="mt-8 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-emerald-950">
              Admin foundation active
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900/75">
              Authentication, authorization, protected routing, and the mobile
              workspace shell are in place.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Workspace tools
            </h2>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {setupCards.map(({ description, href, icon: Icon, label }) => (
            <Link
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              href={href}
              key={href}
            >
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-5 text-slate-300 transition group-hover:text-slate-600"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-950">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
