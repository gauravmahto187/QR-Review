import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

import { logoutAction } from "@/features/auth/actions";
import { LoginForm } from "@/features/auth/login-form";
import { getAdminAuthState } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin sign in | NexGen Digital",
};

export default async function LoginPage() {
  const { admin, authUserId } = await getAdminAuthState();

  if (admin) {
    redirect("/admin");
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center sm:min-h-[calc(100dvh-6rem)]">
        <section className="w-full rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] sm:p-8">
          <BrandLogo className="h-14 w-48" priority />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Welcome back
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Sign in to manage your review workspace.
          </p>

          {authUserId ? (
            <div className="mt-8">
              <div
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
                role="alert"
              >
                This signed-in account does not have administrator access.
                Sign out before trying another account.
              </div>
              <form action={logoutAction} className="mt-5">
                <button
                  className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <LoginForm />
          )}

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Central administrator access only
          </p>
        </section>
      </div>
    </main>
  );
}
