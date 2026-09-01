import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAuthState } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { admin, authUserId } = await getAdminAuthState();

  if (!authUserId) {
    redirect("/login");
  }

  if (!admin) {
    redirect("/login?error=unauthorized");
  }

  return (
    <AdminShell displayName={admin.display_name ?? "Administrator"}>
      {children}
    </AdminShell>
  );
}
