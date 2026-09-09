"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ListSkeleton } from "@/components/loading";

const PendingContext = createContext(false);

export function ListTransition({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <PendingContext.Provider value={pending}><div onClickCapture={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search === location.search) return;
    event.preventDefault();
    if (!pending) startTransition(() => router.push(url.pathname + url.search, { scroll: false }));
  }} onSubmitCapture={event => {
    const form = event.target as HTMLFormElement;
    if (form.method.toLowerCase() !== "get") return;
    event.preventDefault();
    if (pending) return;
    const query = new URLSearchParams();
    new FormData(form).forEach((value, key) => { if (typeof value === "string") query.append(key, value); });
    startTransition(() => router.push(`${location.pathname}?${query}`, { scroll: false }));
  }}>{children}</div></PendingContext.Provider>;
}

export function ListPendingContent({ children, cards = false }: { children: ReactNode; cards?: boolean }) {
  const pending = useContext(PendingContext);
  return <div aria-busy={pending} className="grid"><div inert={pending} className={`col-start-1 row-start-1 min-w-0 ${pending ? "invisible" : ""}`}>{children}</div>{pending && <div className="col-start-1 row-start-1 min-w-0 pt-3"><ListSkeleton cards={cards} /></div>}</div>;
}
