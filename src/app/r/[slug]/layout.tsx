import { DeveloperCredit } from "@/components/developer-credit";

export default function PublicReviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<DeveloperCredit /></>;
}
