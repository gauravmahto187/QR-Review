import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createBusinessAction } from "@/features/businesses/actions";
import { BusinessForm } from "@/features/businesses/business-form";

export const metadata = { title: "Add business | Smart Review QR" };

export default function NewBusinessPage() {
  return <div className="mx-auto max-w-3xl"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href="/admin/businesses"><ArrowLeft className="size-5" /> Businesses</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Add business</h1><p className="mb-7 mt-2 text-sm leading-6 text-slate-600">Create the permanent profile and public review URL.</p><BusinessForm action={createBusinessAction} mode="create" /></div>;
}
