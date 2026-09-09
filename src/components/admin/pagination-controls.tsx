import Link from "next/link";

export function PaginationControls({ page, pageCount, hrefForPage }: { page: number; pageCount: number; hrefForPage: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
    {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-400" href={hrefForPage(page - 1)}>Previous</Link> : <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-300">Previous</span>}
    <span className="text-sm font-semibold text-slate-600">Page {page} of {pageCount}</span>
    {page < pageCount ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-400" href={hrefForPage(page + 1)}>Next</Link> : <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-300">Next</span>}
  </nav>;
}
