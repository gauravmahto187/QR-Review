import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AdminProfile = Tables<"admin_profiles">;

export type AdminAuthState = {
  admin: AdminProfile | null;
  authUserId: string | null;
};

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const authUserId = claimsData?.claims?.sub ?? null;

  if (claimsError || !authUserId) {
    return { admin: null, authUserId: null };
  }

  const { data: admin, error: profileError } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to verify administrator authorization.");
  }

  return { admin, authUserId };
}

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  return (await getAdminAuthState()).admin;
}

export async function requireAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Administrator authorization required.");
  }

  return admin;
}

export async function requireAdminPage(): Promise<AdminProfile> {
  const { admin, authUserId } = await getAdminAuthState();

  if (!authUserId) redirect("/login");
  if (!admin) redirect("/login?error=unauthorized");

  return admin;
}
