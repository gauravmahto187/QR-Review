export default function LoginLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-md animate-pulse rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="size-12 rounded-2xl bg-slate-200" />
        <div className="mt-6 h-4 w-28 rounded bg-slate-200" />
        <div className="mt-4 h-9 w-52 rounded bg-slate-200" />
        <div className="mt-3 h-5 w-72 max-w-full rounded bg-slate-100" />
        <div className="mt-8 h-12 rounded-2xl bg-slate-100" />
        <div className="mt-5 h-12 rounded-2xl bg-slate-100" />
        <div className="mt-5 h-12 rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}
