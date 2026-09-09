"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  History,
  Home,
  MoreHorizontal,
} from "lucide-react";

import { LogoutButton } from "@/features/auth/logout-button";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  { href: "/admin", icon: Home, label: "Home" },
  { href: "/admin/businesses", icon: Building2, label: "Businesses" },
  { href: "/admin/activity", icon: History, label: "Activity" },
  { href: "/admin/more", icon: MoreHorizontal, label: "More" },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  children,
  displayName,
}: Readonly<{ children: React.ReactNode; displayName: string }>) {
  const pathname = usePathname();
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950 md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:p-5">
        <div className="flex items-center gap-3 px-2 py-2">
          <BrandLogo className="h-10 w-32" />
          <div>
            <p className="text-xs text-slate-500">Admin workspace</p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="mt-8 space-y-1">
          {navigation.map(({ href, icon: Icon, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href={href}
                key={href}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <LogoutButton compact />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="mobile-app-header sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 px-5 pb-3 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.4)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-9 w-28" />
              <div>
                <p className="text-xs font-medium text-slate-500">Admin workspace</p>
              </div>
            </div>
            <span
              aria-label={`Signed in as ${displayName}`}
              className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
            >
              {initial}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-6 sm:px-7 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>

        <nav
          aria-label="Admin navigation"
          className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur md:hidden"
        >
          {navigation.map(({ href, icon: Icon, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.7rem] font-medium transition ${
                  active ? "text-emerald-700" : "text-slate-500"
                }`}
                href={href}
                key={href}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? "bg-emerald-100" : "bg-transparent"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
