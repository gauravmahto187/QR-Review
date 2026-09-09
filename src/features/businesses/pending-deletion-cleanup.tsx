import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DeleteBusinessButton } from "./delete-business-button";

export async function PendingDeletionCleanup() {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("business_deletion_cleanup")
    .select("business_id, business_name").order("created_at").limit(100);
  if (error) return <p role="alert" className="mt-4 text-sm text-amber-800">Unable to check pending file cleanup.</p>;
  if (!data.length) return null;
  return <section className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Pending deletion cleanup"><h2 className="text-sm font-semibold text-amber-900">Deleted businesses: file cleanup pending</h2>{data.map(job => <div key={job.business_id} className="flex flex-wrap items-center justify-between gap-3"><span className="min-w-0 break-words text-sm text-slate-700">{job.business_name}</span><DeleteBusinessButton businessId={job.business_id} businessName={job.business_name} cleanup /></div>)}</section>;
}
