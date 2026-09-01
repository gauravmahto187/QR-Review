import { NextResponse } from "next/server";
import { z } from "zod";

import { completePublicReviewAction, generatePublicReviewAction, savePublicAnswerAction, startPublicReviewAction } from "@/features/public-review/actions";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START"), slug: z.string().min(1).max(80) }),
  z.object({ action: z.literal("ANSWER"), slug: z.string().min(1).max(80), questionId: z.uuid(), optionId: z.uuid() }),
  z.object({ action: z.literal("COMPLETE"), slug: z.string().min(1).max(80), language: z.enum(["en", "ne"]) }),
  z.object({ action: z.literal("GENERATE"), slug: z.string().min(1).max(80) }),
]);

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return NextResponse.json({ error: "Invalid review request." }, { status: 413 });
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    const data = parsed.data;
    const result = data.action === "START"
      ? await startPublicReviewAction(data.slug, {})
      : data.action === "ANSWER"
        ? await savePublicAnswerAction(data.slug, data.questionId, data.optionId)
        : data.action === "COMPLETE"
          ? await completePublicReviewAction(data.slug, data.language)
          : await generatePublicReviewAction(data.slug);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  } catch {
    return NextResponse.json({ error: "Unable to process this review request." }, { status: 500 });
  }
}
