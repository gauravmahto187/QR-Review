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

const appUrlSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash;
  }, "NEXT_PUBLIC_APP_URL cannot contain credentials, a query, or a fragment.");

const deploymentEnvironment =
  process.env.VERCEL_ENV ?? process.env.APP_ENV ?? "development";
const isProductionDeployment = deploymentEnvironment === "production";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: appUrlSchema.default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_SECRET_KEY: optionalString,
  AI_PROVIDER: z.enum(["mock", "gemini", "openai"]).default("mock"),
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().trim().min(1).max(120).default("gemini-2.5-flash-lite"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(3_000).max(30_000).default(15_000),
  OPENAI_API_KEY: optionalString,
  RATE_LIMIT_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  READINESS_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  LOG_LEVEL: z.enum(["error", "warn", "info"]).default("info"),
}).superRefine((env, context) => {
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    context.addIssue({ code: "custom", message: "GEMINI_API_KEY is required when AI_PROVIDER=gemini.", path: ["GEMINI_API_KEY"] });
  }
  if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    context.addIssue({ code: "custom", message: "OPENAI_API_KEY is required when AI_PROVIDER=openai.", path: ["OPENAI_API_KEY"] });
  }
  if (!isProductionDeployment) return;
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "RATE_LIMIT_SECRET"] as const) {
    if (!env[key]) context.addIssue({ code: "custom", message: `${key} is required for production.`, path: [key] });
  }
  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
  if (appUrl.protocol !== "https:" || ["localhost", "127.0.0.1", "0.0.0.0"].includes(appUrl.hostname)) {
    context.addIssue({ code: "custom", message: "NEXT_PUBLIC_APP_URL must be the final HTTPS production origin.", path: ["NEXT_PUBLIC_APP_URL"] });
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL && new URL(env.NEXT_PUBLIC_SUPABASE_URL).protocol !== "https:") {
    context.addIssue({ code: "custom", message: "NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production.", path: ["NEXT_PUBLIC_SUPABASE_URL"] });
  }
  if (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
    context.addIssue({ code: "custom", message: "Use the current Supabase publishable key in production.", path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] });
  }
  if (env.SUPABASE_SECRET_KEY && !env.SUPABASE_SECRET_KEY.startsWith("sb_secret_")) {
    context.addIssue({ code: "custom", message: "Use the current server-only Supabase secret key in production.", path: ["SUPABASE_SECRET_KEY"] });
  }
  if (env.AI_PROVIDER !== "gemini") {
    context.addIssue({ code: "custom", message: "AI_PROVIDER must be gemini in production.", path: ["AI_PROVIDER"] });
  }
});

const result = serverEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
  READINESS_TOKEN: process.env.READINESS_TOKEN,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

if (!result.success) {
  throw new Error(`Invalid server environment: ${z.prettifyError(result.error)}`);
}

export const serverEnv = result.data;
export const runtimeEnvironment = {
  deployment: deploymentEnvironment,
  isProduction: isProductionDeployment,
} as const;

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
