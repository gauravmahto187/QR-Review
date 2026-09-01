export default function BusinessesLoading() {
  return <div className="animate-pulse" aria-label="Loading businesses" role="status"><div className="h-4 w-24 rounded bg-slate-200" /><div className="mt-3 h-9 w-64 rounded bg-slate-200" /><div className="mt-7 h-20 rounded-[1.5rem] bg-white shadow-sm" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <div className="h-24 rounded-[1.5rem] bg-white shadow-sm" key={item} />)}</div></div>;
}
