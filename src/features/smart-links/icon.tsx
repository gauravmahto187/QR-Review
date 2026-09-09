import { Globe } from "lucide-react";
import type { SmartLinkType } from "./config";
export function SmartLinkIcon({ type }: { type: SmartLinkType }) {
  if (type === "WEBSITE") return <Globe aria-hidden="true" className="size-5 shrink-0" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brands/${type.toLowerCase()}.svg`} alt="" aria-hidden="true" className="size-5 shrink-0 object-contain" />;
}
