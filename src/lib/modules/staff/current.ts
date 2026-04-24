import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type StaffRole = "owner" | "admin" | "cashier" | "kitchen" | "waiter";

export type CurrentStaff = {
  userId: string;
  email: string;
  profileId: string;
  fullName: string;
  role: StaffRole;
  tenantId: string;
  branchId: string | null;
};

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("staff_profiles")
    .select("id, tenant_id, branch_id, full_name, role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    profileId: profile.id as string,
    fullName: profile.full_name as string,
    role: profile.role as StaffRole,
    tenantId: profile.tenant_id as string,
    branchId: (profile.branch_id as string | null) ?? null,
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
