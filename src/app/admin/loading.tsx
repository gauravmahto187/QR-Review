export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-14 w-64 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-3xl bg-white shadow-sm" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-24 rounded-3xl bg-white shadow-sm" key={index} />)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 5 }, (_, index) => <div className="h-28 rounded-3xl bg-white shadow-sm" key={index} />)}</div>
      <div className="h-64 rounded-3xl bg-white shadow-sm" />
    </div>
  );
}
