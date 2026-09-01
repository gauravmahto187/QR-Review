import { ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/features/auth/logout-button";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata = {
  title: "More | Smart Review QR",
};

export default async function MorePage() {
  const admin = await requireAdmin();

  return (
    <div>
      <p className="text-sm font-semibold text-emerald-700">More</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Account and settings
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Account access is available now. Additional settings will arrive later.
      </p>

      <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">
              {admin.display_name ?? "Administrator"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Central administrator</p>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
