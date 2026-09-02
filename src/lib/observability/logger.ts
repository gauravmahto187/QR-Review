import "server-only";

import { serverEnv } from "@/lib/env/server";

type LogLevel = "error" | "warn" | "info";
type SafeContext = Record<string, boolean | number | string | null | undefined>;

const levelWeight: Record<LogLevel, number> = { error: 0, warn: 1, info: 2 };
const prohibitedKey = /(cookie|token|secret|password|reviewText|sessionId|apiKey|authorization)/i;

function sanitize(context: SafeContext) {
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key, value]) => !prohibitedKey.test(key) && value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
  );
}

function write(level: LogLevel, event: string, context: SafeContext = {}) {
  if (levelWeight[level] > levelWeight[serverEnv.LOG_LEVEL]) return;
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitize(context),
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  error(event: string, context?: SafeContext) { write("error", event, context); },
  info(event: string, context?: SafeContext) { write("info", event, context); },
  warn(event: string, context?: SafeContext) { write("warn", event, context); },
};
