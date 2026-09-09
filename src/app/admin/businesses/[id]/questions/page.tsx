import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionManager } from "@/features/review-questions/question-manager";
import { QuestionPreview } from "@/features/review-questions/question-preview";
import { getQuestionManagementData } from "@/features/review-questions/queries";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const data = await getQuestionManagementData(id);
  if (!data) notFound();
  const active = data.questions.filter((question) => question.is_active).length;

  return <div className="mx-auto max-w-3xl">
    <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950" href={`/admin/businesses/${data.business.id}`}><ArrowLeft className="size-5" /> {data.business.name}</Link>
    <div className="mt-3"><p className="text-sm font-semibold text-emerald-700">Review questions</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Question flow</h1><p className="mt-2 text-sm text-slate-600">{active} active · {data.questions.length} total</p></div>
    <section className="mt-7"><QuestionManager businessId={data.business.id} questions={data.questions} /></section>
    <section className="mt-9"><div className="mb-4 flex items-center gap-2"><Eye className="size-5 text-slate-500" /><h2 className="text-lg font-semibold text-slate-950">Mobile flow preview</h2></div><QuestionPreview questions={data.questions} /></section>
  </div>;
}
