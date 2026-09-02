export default function BusinessAnalyticsLoading() {
  return <div className="animate-pulse"><div className="h-5 w-24 rounded bg-slate-200" /><div className="mt-5 h-14 w-64 rounded-2xl bg-slate-200" /><div className="mt-6 grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, index) => <div className="h-28 rounded-3xl bg-white shadow-sm" key={index} />)}</div><div className="mt-6 h-56 rounded-3xl bg-white shadow-sm" /></div>;
}
