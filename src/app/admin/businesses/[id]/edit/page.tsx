import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBusinessAction } from "@/features/businesses/actions";
import { BusinessForm } from "@/features/businesses/business-form";
import { getBusinessById } from "@/features/businesses/queries";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getBusinessById(id);
  if (!business) notFound();
  return <div className="mx-auto max-w-3xl"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href={`/admin/businesses/${business.id}`}><ArrowLeft className="size-5" /> {business.name}</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Edit business</h1><p className="mb-7 mt-2 text-sm leading-6 text-slate-600">Update profile details without changing the permanent slug.</p><BusinessForm action={updateBusinessAction.bind(null, business.id)} business={business} mode="edit" /></div>;
}
