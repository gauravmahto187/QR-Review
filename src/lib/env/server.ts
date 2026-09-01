import "server-only";

import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_SECRET_KEY: optionalString,
  AI_PROVIDER: z.enum(["mock", "gemini", "openai"]).default("mock"),
  GEMINI_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
});

const result = serverEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

if (!result.success) {
  throw new Error(`Invalid server environment: ${z.prettifyError(result.error)}`);
}

export const serverEnv = result.data;

export function getSupabaseSecretConfig() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secretKey } =
    serverEnv;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase privileged configuration is unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  return { secretKey, url };
}
