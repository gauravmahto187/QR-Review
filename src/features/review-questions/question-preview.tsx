"use client";

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";

import type { Tables } from "@/types/database";

type Question = Tables<"review_questions"> & { options: Tables<"review_question_options">[] };

export function QuestionPreview({ questions }: { questions: Question[] }) {
  const active = questions.filter((question) => question.is_active).map((question) => ({ ...question, options: question.options.filter((option) => option.is_active) }));
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!active.length) return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Enable questions with at least two active options to preview the flow.</div>;
  const complete = step >= active.length;
  const question = active[Math.min(step, active.length - 1)];

  return <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Customer preview</span><span>{complete ? "Complete" : `${step + 1} of ${active.length}`}</span></div><div className="mt-3 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${complete ? 100 : ((step + 1) / active.length) * 100}%` }} /></div></div>
    {complete ? <div className="p-6 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span><h3 className="mt-4 text-xl font-semibold text-slate-950">Questions complete</h3><p className="mt-2 text-sm text-slate-500">AI generation and Google handoff are intentionally not part of this preview.</p><button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white" onClick={() => { setStep(0); setAnswers({}); }} type="button"><RotateCcw className="size-4" />Restart</button></div> : <div className="p-5 sm:p-6"><h3 className="text-xl font-semibold leading-7 text-slate-950">{question.question}</h3><div className="mt-5 grid gap-3">{question.options.map((option) => <button className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-medium transition ${answers[question.id] === option.id ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/10" : "border-slate-200 text-slate-700 hover:border-slate-300"}`} key={option.id} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} type="button">{option.label}</button>)}</div><div className="mt-6 grid grid-cols-2 gap-3"><button className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((value) => value - 1)} type="button"><ArrowLeft className="size-4" />Back</button><button className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-40" disabled={!answers[question.id]} onClick={() => setStep((value) => value + 1)} type="button">Next<ArrowRight className="size-4" /></button></div></div>}
  </div>;
}
