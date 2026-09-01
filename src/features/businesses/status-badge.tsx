import type { Database } from "@/types/database";

type BusinessStatus = Database["public"]["Enums"]["business_status"];

const styles: Record<BusinessStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  SUSPENDED: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
