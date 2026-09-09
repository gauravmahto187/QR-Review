import { DeveloperCredit } from "@/components/developer-credit";

export default function PublicSmartLinksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<DeveloperCredit /></>;
}
