"use client";

import { Check, Clipboard, Download } from "lucide-react";
import { useRef, useState } from "react";

import { qrDownloadFilename } from "@/lib/qr/filename";

export function QrLinkControls({ businessId, publicUrl, slug }: { businessId: string; publicUrl: string; slug: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copyUrl() {
    setFeedback(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(publicUrl);
      setFeedback("Link copied");
    } catch {
      const input = inputRef.current;
      if (!input) return setFeedback("Select and copy the link manually");
      input.focus();
      input.select();
      try { setFeedback(document.execCommand("copy") ? "Link copied" : "Select and copy the link manually"); } catch { setFeedback("Select and copy the link manually"); }
    }
  }

  return <div>
    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="permanent-review-url">Permanent review URL</label>
    <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none focus:border-emerald-600" id="permanent-review-url" readOnly ref={inputRef} value={publicUrl} />
    <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" onClick={copyUrl} type="button"><Clipboard className="size-4" />Copy Link</button>
    {feedback ? <p className="mt-2 text-center text-xs font-semibold text-emerald-700" role="status"><Check className="mr-1 inline size-3.5" />{feedback}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3"><a className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-3 text-sm font-semibold text-white" download={qrDownloadFilename(slug, "png")} href={`/api/admin/businesses/${businessId}/qr?format=png`}><Download className="size-4" />PNG</a><a className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-white" download={qrDownloadFilename(slug, "svg")} href={`/api/admin/businesses/${businessId}/qr?format=svg`}><Download className="size-4" />SVG</a></div>
  </div>;
}
