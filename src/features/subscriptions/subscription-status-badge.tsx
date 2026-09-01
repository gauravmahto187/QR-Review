import { getSubscriptionTiming, type Subscription, type SubscriptionStatus } from "@/features/subscriptions/utils";

const styles: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  EXPIRED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  SUSPENDED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  TRIAL: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export function SubscriptionStatusBadge({ subscription }: { subscription: Subscription | null }) {
  const status = subscription ? getSubscriptionTiming(subscription).effectiveStatus : null;
  if (!status) return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/20">No subscription</span>;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}
