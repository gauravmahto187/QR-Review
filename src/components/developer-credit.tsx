import { ExternalLink } from "lucide-react";

export function DeveloperCredit() {
  return (
    <a
      aria-label="Developed by Gaurav — open portfolio"
      className="developer-credit group fixed right-3 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[0.68rem] font-medium text-slate-600 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md sm:right-5"
      href="https://gaurav-gules.vercel.app/"
      rel="noreferrer"
      target="_blank"
    >
      <span className="flex size-5 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" aria-hidden="true" className="size-full object-contain" src="/brands/gaurav-logo.png" />
      </span>
      <span>Developed by Gaurav</span>
      <ExternalLink aria-hidden="true" className="size-3.5 text-slate-400 transition group-hover:text-emerald-700" />
    </a>
  );
}
