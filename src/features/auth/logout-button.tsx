"use client";

import { LogOut, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { logoutAction } from "@/features/auth/actions";

function LogoutSubmit({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        compact
          ? "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60"
          : "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      }
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-5" aria-hidden="true" />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction} className="w-full">
      <LogoutSubmit compact={compact} />
    </form>
  );
}
