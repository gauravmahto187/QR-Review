import "server-only";

import { runtimeEnvironment, serverEnv } from "@/lib/env/server";

export function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const suppliedOrigin = new URL(origin).origin;
    if (suppliedOrigin === new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin) return true;
    return !runtimeEnvironment.isProduction && suppliedOrigin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
