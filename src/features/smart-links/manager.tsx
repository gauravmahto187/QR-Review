"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { Tables } from "@/types/database";
import { mutateSmartLink } from "./actions";
import { SMART_LINK_TYPES, smartLinkLabels, type SmartLinkType } from "./config";
import { SmartLinkIcon } from "./icon";

const field = "mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const button = "min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40";
function LinkEditor({ businessId, link, first, last }: { businessId: string; link?: Tables<"business_smart_links">; first?: boolean; last?: boolean }) {
  const [type, setType] = useState<SmartLinkType>(link?.type ?? "FACEBOOK");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function submit(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await mutateSmartLink(businessId, form);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch { setError("Unable to save changes. Please try again."); }
    });
  }
  function control(action: string, direction?: string) {
    if (action === "DELETE" && !window.confirm("Delete this link? This cannot be undone.")) return;
    const form = new FormData(); form.set("action", action); form.set("id", link!.id);
    if (direction) form.set("direction", direction);
    submit(form);
  }
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="flex items-center gap-2 font-semibold">{link ? <><SmartLinkIcon type={link.type} />{smartLinkLabels[link.type]}<span className="ml-auto text-xs text-slate-500">{link.is_active ? "Enabled" : "Disabled"}</span></> : <><Plus className="size-5" />Add link</>}</h2>
    <form onSubmit={event => { event.preventDefault(); submit(new FormData(event.currentTarget)); }} className="mt-4 space-y-3">
      <input name="action" type="hidden" value={link ? "UPDATE" : "CREATE"} />
      {link && <input name="id" type="hidden" value={link.id} />}
      <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">
        <label className="block text-sm font-medium">Type<select className={field} name="type" value={type} onChange={event => setType(event.target.value as SmartLinkType)}>{SMART_LINK_TYPES.map(type => <option key={type} value={type}>{smartLinkLabels[type]}</option>)}</select></label>
        <label className="block text-sm font-medium">Destination<input className={field} name="url" required maxLength={2048} defaultValue={link?.url ?? ""} placeholder="HTTPS URL, phone number, or email" /></label>
        <p className="text-xs leading-5 text-slate-500">Social links must use the selected provider’s domain.</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={link?.is_active ?? true} className="size-5 accent-emerald-700" />Enabled</label>
        <button className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white" type="submit">{pending ? "Saving…" : link ? "Save changes" : "Add link"}</button>
      </fieldset>
    </form>
    {link && <div className="mt-3 flex flex-wrap gap-2">
      <button className={button} disabled={pending || first} onClick={() => control("MOVE", "UP")} aria-label={`Move ${smartLinkLabels[link.type]} up`}><ArrowUp className="inline size-4" /> Up</button>
      <button className={button} disabled={pending || last} onClick={() => control("MOVE", "DOWN")} aria-label={`Move ${smartLinkLabels[link.type]} down`}><ArrowDown className="inline size-4" /> Down</button>
      <button className={`${button} ml-auto text-red-700`} disabled={pending} onClick={() => control("DELETE")}><Trash2 className="inline size-4" /> Delete</button>
    </div>}
    {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
  </section>;
}

export function SmartLinksManager({ businessId, links }: { businessId: string; links: Tables<"business_smart_links">[] }) {
  return <div className="space-y-4">{links.map((link, i) => <LinkEditor key={`${link.id}-${link.updated_at}`} businessId={businessId} link={link} first={i === 0} last={i === links.length - 1} />)}<LinkEditor key={`new-${links.length}`} businessId={businessId} /></div>;
}
