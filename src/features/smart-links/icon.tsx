import { Users, Camera, Video, Music2, Globe } from "lucide-react";
import type { SmartLinkType } from "./config";
const icons = { FACEBOOK: Users, INSTAGRAM: Camera, TIKTOK: Music2, YOUTUBE: Video, WEBSITE: Globe };
export function SmartLinkIcon({ type }: { type: SmartLinkType }) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" className="size-5 shrink-0" />;
}
