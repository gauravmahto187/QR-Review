"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import { loginAction } from "@/features/auth/actions";
import type { LoginActionState } from "@/features/auth/actions";

const initialLoginState: LoginActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Signing in…
        </>
      ) : (
        <>
          Sign in
          <ArrowRight className="size-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      {state.error ? (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="email">
          Email address
        </label>
        <div className="relative mt-2">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          />
          <input
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            autoComplete="email"
            autoFocus
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            id="email"
            inputMode="email"
            name="email"
            placeholder="admin@example.com"
            type="email"
          />
        </div>
        {state.fieldErrors?.email ? (
          <p className="mt-2 text-sm text-rose-700" id="email-error">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Password
        </label>
        <div className="relative mt-2">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          />
          <input
            aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.password)}
            autoComplete="current-password"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            id="password"
            name="password"
            placeholder="Enter your password"
            type="password"
          />
        </div>
        {state.fieldErrors?.password ? (
          <p className="mt-2 text-sm text-rose-700" id="password-error">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
