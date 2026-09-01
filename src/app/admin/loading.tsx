export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-9 w-56 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 rounded-3xl bg-white shadow-sm" />
        <div className="h-40 rounded-3xl bg-white shadow-sm" />
      </div>
    </div>
  );
}
