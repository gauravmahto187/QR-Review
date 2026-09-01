export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-5 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Boostup AI Smart QR</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Foundation ready
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The application foundation is running. Product features will be
          added in later approved phases.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
          System operational
        </div>
      </section>
    </main>
  );
}
