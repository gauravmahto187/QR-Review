"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { PendingLabel } from "./loading";

export function PendingSubmit({ children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending, data } = useFormStatus();
  const action = data?.get("action");
  const label = action === "MOVE" ? "Reordering…" : action === "ARCHIVE" ? "Archiving…" : action === "CREATE" || action === "CREATE_DEFAULTS" ? "Adding…" : "Saving…";
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>
    {pending ? <PendingLabel>{props["aria-label"] ? <span className="sr-only">{label}</span> : label}</PendingLabel> : children}
  </button>;
}
