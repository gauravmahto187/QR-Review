"use client";

import { ArrowLeft, ArrowRight, Check, ExternalLink, Languages, LoaderCircle, Pencil, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Skeleton } from "@/components/loading";

import type { PublicGeneration, PublicQuestion, PublicReviewActionState, PublicSession } from "@/features/public-review/types";

async function requestReview(body: Record<string, string>): Promise<PublicReviewActionState> {
  try {
    const response = await fetch("/api/public/review/session", { body: JSON.stringify(body), headers: { "content-type": "application/json" }, method: "POST" });
    const result = await response.json() as PublicReviewActionState;
    if (!response.ok && !result.error) return { error: "We couldn’t save that change. Please try again." };
    return result;
  } catch {
    return { error: "Check your connection and try again." };
  }
}

export function PublicReviewFlow({ initialGeneration, initialSession, initialSessionExpired, questions, slug }: { initialGeneration: PublicGeneration | null; initialSession: PublicSession | null; initialSessionExpired: boolean; questions: PublicQuestion[]; slug: string }) {
  return <ActiveReviewFlow initialGeneration={initialGeneration} initialSession={initialSession} initialSessionExpired={initialSessionExpired} key={initialSession?.id ?? "new"} questions={questions} slug={slug} />;
}

function ActiveReviewFlow({ initialGeneration, initialSession, initialSessionExpired, questions, slug }: { initialGeneration: PublicGeneration | null; initialSession: PublicSession | null; initialSessionExpired: boolean; questions: PublicQuestion[]; slug: string }) {
  const firstUnanswered = questions.findIndex((question) => !initialSession?.answers[question.id]);
  const [step, setStep] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [session, setSession] = useState(initialSession);
  const [optimisticAnswers, setOptimisticAnswers] = useState(initialSession?.answers ?? {});
  const [generation, setGeneration] = useState(initialGeneration);
  const [language, setLanguage] = useState<"en" | "ne">(initialSession?.language ?? "en");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [completing, setCompleting] = useState(false);

  function runGeneration() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await requestReview({ action: "GENERATE", slug });
      if (result.generation) setGeneration(result.generation);
      else setError(result.error ?? "We couldn’t generate your review.");
    });
  }

  if (generation) return <GeneratedReviewResult error={error} generation={generation} key={generation.generationNumber} onRegenerate={runGeneration} pending={pending} slug={slug} />;
  if (completing && pending) return <GenerationState error={null} onGenerate={runGeneration} pending />;
  if (session?.completed) return <GenerationState error={error} onGenerate={runGeneration} pending={pending} />;

  const onQuestion = step < questions.length;
  const question = onQuestion ? questions[step] : null;
  const selected = question ? optimisticAnswers[question.id] : null;
  const progress = onQuestion ? ((step + 1) / (questions.length + 1)) * 100 : 100;

  function chooseAnswer(questionId: string, optionId: string) {
    setError(null);
    const previousOptionId = optimisticAnswers[questionId];
    const questionStep = step;
    setOptimisticAnswers((answers) => ({ ...answers, [questionId]: optionId }));
    startTransition(async () => {
      // Start only on the first answer, retaining meaningful review-start analytics.
      // Await the response so its HTTP-only session cookie exists before saving.
      const started = session ? { session } : await requestReview({ action: "START", slug });
      if (started.session) setSession(started.session);
      const result = started.session
        ? await requestReview({ action: "ANSWER", optionId, questionId, slug })
        : started;
      if (result.session) {
        setSession(result.session);
        setOptimisticAnswers(result.session.answers);
      } else {
        setOptimisticAnswers((answers) => {
          const next = { ...answers };
          if (previousOptionId) next[questionId] = previousOptionId;
          else delete next[questionId];
          return next;
        });
        setStep(questionStep);
        setError(result.error ?? "That answer could not be saved.");
      }
    });
  }

  function completeAndGenerate() {
    if (pending) return;
    setCompleting(true);
    setError(null);
    startTransition(async () => {
      const completed = await requestReview({ action: "COMPLETE", language, slug });
      if (!completed.session) { setCompleting(false); setError(completed.error ?? "Please try again."); return; }
      setSession(completed.session);
      const result = await requestReview({ action: "GENERATE", slug });
      if (result.generation) setGeneration(result.generation);
      else setError(result.error ?? "We couldn’t generate your review.");
      setCompleting(false);
    });
  }

  return <div className="mt-7">
    {initialSessionExpired && !session ? <p className="mb-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800"><TriangleAlert className="mt-1 size-4 shrink-0" />Your previous session expired. Answer below to begin again.</p> : null}
    <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>{onQuestion ? `Question ${step + 1} of ${questions.length}` : "Review language"}</span><span>{Math.round(progress)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
    {error ? <ErrorMessage message={error} /> : null}
    {question ? <section className="mt-7"><h2 className="text-2xl font-semibold leading-8 tracking-tight text-slate-950">{question.question}</h2><div className="mt-6 grid gap-3" role="radiogroup" aria-label={question.question}>{question.options.map((option) => <button aria-checked={selected === option.id} className={`flex min-h-14 items-center justify-between rounded-2xl border px-5 text-left text-base font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${selected === option.id ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/10" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`} disabled={pending} key={option.id} onClick={() => chooseAnswer(question.id, option.id)} role="radio" type="button"><span>{option.label}</span>{selected === option.id ? <Check className="size-5 text-emerald-700" /> : null}</button>)}</div></section> : <section className="mt-7"><span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Languages className="size-5" /></span><h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Choose review language</h2><p className="mt-2 text-sm leading-6 text-slate-500">Only the generated review will use this language. The app remains in English.</p><div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Review language">{([["en", "English"], ["ne", "Nepali"]] as const).map(([value, label]) => <button aria-checked={language === value} className={`min-h-14 rounded-2xl border px-4 text-base font-semibold ${language === value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`} key={value} onClick={() => setLanguage(value)} role="radio" type="button">{label}</button>)}</div></section>}
    <div className="mt-8 grid grid-cols-2 gap-3"><button className="flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button"><ArrowLeft className="size-4" />Back</button>{question ? <button className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-40" disabled={!selected} onClick={() => setStep((value) => value + 1)} type="button">Continue<ArrowRight className="size-4" /></button> : <button className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={completeAndGenerate} type="button">{pending ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}{pending ? "Generating…" : "Generate Review"}</button>}</div>
  </div>;
}

function GenerationState({ error, onGenerate, pending }: { error: string | null; onGenerate: () => void; pending: boolean }) {
  if (pending) return <section className="mt-8 min-h-80 space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6" aria-busy="true"><h2 role="status" className="text-xl font-semibold text-slate-950">Generating your review…</h2><div aria-hidden="true" className="space-y-4"><Skeleton /><Skeleton /><Skeleton className="h-4 w-5/6" /><Skeleton /><Skeleton className="h-4 w-2/3" /></div></section>;
  return <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-center"><Sparkles className="mx-auto size-7 text-emerald-700" /><h2 className="mt-4 text-xl font-semibold text-slate-950">Your answers are ready</h2><p className="mt-2 text-sm leading-6 text-slate-600">Generate your review when you’re ready.</p>{error ? <ErrorMessage message={error} /> : null}<button className="mt-5 min-h-13 w-full rounded-2xl bg-emerald-700 px-5 text-sm font-semibold text-white" onClick={onGenerate} type="button">Try generating again</button></div>;
}

function GeneratedReviewResult({ error, generation, onRegenerate, pending, slug }: { error: string | null; generation: PublicGeneration; onRegenerate: () => void; pending: boolean; slug: string }) {
  const [text, setText] = useState(generation.text);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [handoffPending, startHandoffTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  async function copyReviewText() {
    if (!text.trim()) return false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = textareaRef.current;
      if (!textarea) return false;
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try { return document.execCommand("copy"); } catch { return false; }
    }
  }

  function openGoogleMaps() {
    if (handoffPending || pending) return;
    setHandoffError(null);
    setFallbackUrl(null);
    if (!text.trim()) { setHandoffError("Write at least one character before continuing."); return; }
    const copyAttempt = copyReviewText();
    startHandoffTransition(async () => {
      const [copied, result] = await Promise.all([copyAttempt, requestReview({ action: "HANDOFF", finalText: text, slug })]);
      if (!result.googleUrl) { setHandoffError(result.error ?? "We couldn’t open Google Maps. Your review is still available above."); return; }
      if (copied) {
        window.location.assign(result.googleUrl);
      } else {
        setFallbackUrl(result.googleUrl);
        setHandoffError("Copy the selected review manually, then open Google Maps.");
      }
    });
  }

  return <div className="mt-7"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Check className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Your review is ready</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Make it sound like you</h2></div></div><p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500"><Languages className="size-4" />{generation.language === "ne" ? "Nepali" : "English"} · Version {generation.generationNumber} of 2</p>
    <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="generated-review"><span className="inline-flex items-center gap-2"><Pencil className="size-4" />Edit your review</span></label><textarea className="mt-2 min-h-52 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-800 shadow-inner outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" id="generated-review" maxLength={1200} onChange={(event) => { setText(event.target.value); setFallbackUrl(null); }} ref={textareaRef} value={text} /><p className="mt-2 text-xs leading-5 text-slate-400">Edit freely. We’ll copy this text before opening Google Maps.</p>{error ? <ErrorMessage message={error} /> : null}
    {generation.canRegenerate ? <button className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={handoffPending || pending} onClick={onRegenerate} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> : <RefreshCw className="size-4" />}{pending ? "Generating another version…" : "Regenerate another version"}</button> : <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">You’ve used the available regeneration. You can still edit this version.</p>}
    <div className="sticky -bottom-5 z-10 mt-5 border-t border-slate-100 bg-white/95 py-4 backdrop-blur"><button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-base font-semibold text-white shadow-lg shadow-emerald-900/10 disabled:opacity-60" disabled={handoffPending || pending} onClick={openGoogleMaps} type="button">{handoffPending ? <LoaderCircle className="size-5 animate-spin" /> : <ExternalLink className="size-5" />}{handoffPending ? "Opening…" : "Open Google Maps"}</button></div>
    {handoffError ? <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800" role="alert">{handoffError}</p> : null}
    {fallbackUrl ? <a className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-900" href={fallbackUrl}><ExternalLink className="size-4" />Open Google Maps</a> : null}
  </div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700" role="alert">{message}</p>;
}
