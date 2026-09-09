"use client";

import { Check, Clipboard, Download } from "lucide-react";
import { useRef, useState } from "react";
import { PendingLabel } from "@/components/loading";

import { qrDownloadFilename } from "@/lib/qr/filename";
import { smartQrFilename } from "@/lib/urls/business-smart";

export function QrLinkControls({ businessId, publicUrl, slug, purpose = "review" }: { businessId: string; publicUrl: string; slug: string; purpose?: "review" | "smart" }) {
  const filename = purpose === "smart" ? smartQrFilename : qrDownloadFilename;
  const route = purpose === "smart" ? "smart-qr" : "qr";
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<"png" | "svg" | null>(null);
  const downloadLock = useRef(false);

  async function download(format: "png" | "svg") {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setPreparing(format);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/${route}?format=${format}`);
      if (!response.ok || !response.headers.get("content-type")?.includes(format === "png" ? "image/png" : "image/svg+xml")) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename(slug, format);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFeedback("Download unavailable. Please try again.");
    } finally {
      downloadLock.current = false;
      setPreparing(null);
    }
  }

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
    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor="permanent-review-url">{purpose === "smart" ? "Permanent Smart Links URL" : "Permanent review URL"}</label>
    <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none focus:border-emerald-600" id="permanent-review-url" readOnly ref={inputRef} value={publicUrl} />
    <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" onClick={copyUrl} type="button"><Clipboard className="size-4" />Copy Link</button>
    {feedback ? <p className="mt-2 text-center text-xs font-semibold text-emerald-700" role="status"><Check className="mr-1 inline size-3.5" />{feedback}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-3">{(["png", "svg"] as const).map(format => <button key={format} type="button" disabled={preparing !== null} aria-busy={preparing === format} onClick={() => download(format)} className={`flex min-h-13 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold text-white disabled:opacity-60 ${format === "png" ? "bg-emerald-700" : "bg-slate-900"}`}>{preparing === format ? <PendingLabel>Preparing…</PendingLabel> : <><Download aria-hidden="true" className="size-4" />{format.toUpperCase()}</>}</button>)}</div>
  </div>;
}
