import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-lg bg-slate-200/70 motion-safe:animate-pulse ${className}`} />;
}

export function LoadingRegion({ children, label = "Loading…", className = "space-y-5" }: { children: ReactNode; label?: string; className?: string }) {
  return <div aria-busy="true" aria-label={label} role="status" className={className}><span className="sr-only">{label}</span><div aria-hidden="true" className="space-y-5">{children}</div></div>;
}

export function PendingLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center justify-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin" />{children}</span>;
}

export function CardSkeleton({ className = "", rows = 3 }: { className?: string; rows?: number }) {
  return <div className={`space-y-4 rounded-3xl border border-slate-200 bg-white p-5 ${className}`}><Skeleton className="h-5 w-1/2" />{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={`h-4 ${i === rows - 1 ? "w-2/3" : "w-full"}`} />)}</div>;
}

export function ListSkeleton({ cards = false, count = 10 }: { cards?: boolean; count?: number }) {
  return <LoadingRegion label="Loading results…"><div className={cards ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>{Array.from({ length: count }, (_, i) => <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><Skeleton className="size-12 shrink-0 rounded-2xl" /><div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-5 w-20 rounded-full" /></div></div>{cards && <div className="mt-4 border-t border-slate-100 pt-4"><Skeleton className="h-9 w-full" /></div>}</div>)}</div></LoadingRegion>;
}

export function QrSkeleton() {
  return <Skeleton className="mx-auto aspect-square w-full max-w-sm rounded-3xl" />;
}

export function AdminSkeleton({ kind = "detail" }: { kind?: "dashboard" | "detail" | "analytics" | "businesses" | "rows" | "subscription" | "questions" | "qr" | "links" }) {
  return <LoadingRegion label="Loading workspace…" className={`mx-auto ${kind === "dashboard" || kind === "analytics" ? "" : kind === "businesses" ? "max-w-4xl" : "max-w-3xl"}`}>
    <Skeleton className="h-12 w-56 max-w-full" />
    {kind === "businesses" ? <><Skeleton className="h-28 w-full sm:h-20" /><ListSkeleton cards /></> : kind === "rows" ? <ListSkeleton /> : kind === "qr" ? <><div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"><QrSkeleton /></div><CardSkeleton rows={1} /><Skeleton className="h-13 w-full" /></> : kind === "dashboard" || kind === "analytics" ? <><Skeleton className="h-24 w-full" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} rows={1} />)}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} rows={1} />)}</div><CardSkeleton className="h-80" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} rows={1} />)}</div></> : kind === "subscription" ? <><CardSkeleton className="h-72" /><CardSkeleton className="h-80" /><ListSkeleton /></> : kind === "links" ? <div className="grid gap-5 lg:grid-cols-2"><CardSkeleton className="h-96" /><div className="space-y-5"><QrSkeleton /><CardSkeleton /></div></div> : kind === "questions" ? <><CardSkeleton rows={5} /><CardSkeleton rows={5} /><CardSkeleton rows={5} /></> : <><div className="flex items-center gap-4"><Skeleton className="size-20 shrink-0 rounded-3xl" /><Skeleton className="h-8 w-1/2" /></div><CardSkeleton className="h-44" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} rows={2} />)}</div></>}
  </LoadingRegion>;
}

export function PublicSkeleton({ kind }: { kind: "links" | "payments" | "review" }) {
  const review = kind === "review";
  return <main className={`min-h-dvh px-5 py-7 ${review ? "bg-white" : "bg-slate-50"}`}><LoadingRegion label={review ? "Loading review…" : "Loading payment and links…"} className={`mx-auto ${review ? "max-w-md" : "max-w-[460px]"}`}>
    {kind === "payments" ? <Skeleton className="h-11 w-20" /> : <Skeleton className="mx-auto size-20 rounded-3xl" />}
    <Skeleton className={`h-7 w-3/5 ${kind === "payments" ? "" : "mx-auto"}`} />
    <Skeleton className="h-4 w-2/5" />
    {review && <Skeleton className="mt-8 h-16 w-full" />}
    <div className="space-y-3">{Array.from({ length: kind === "payments" ? 3 : 4 }, (_, i) => <Skeleton key={i} className={`${kind === "payments" ? "h-24" : "h-14"} w-full rounded-2xl`} />)}</div>
  </LoadingRegion></main>;
}
