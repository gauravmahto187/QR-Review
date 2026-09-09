import type { Tables } from "@/types/database";

// Deliberately independent of the Review subscription policy.
export function evaluateSmartLinksAvailability(business: Pick<Tables<"businesses">, "status"> | null) {
  return { valid: business?.status === "ACTIVE" };
}
