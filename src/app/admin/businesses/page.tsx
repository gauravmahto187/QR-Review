import { Building2 } from "lucide-react";

export const metadata = {
  title: "Businesses | Smart Review QR",
};

export default function BusinessesPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-emerald-700">Businesses</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Business management
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Business profiles, subscriptions, questions, and QR URLs will be added
        in a later approved phase.
      </p>

      <section className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Building2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-slate-950">No business tools yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          This protected placeholder confirms the route and navigation are ready.
        </p>
      </section>
    </div>
  );
}
