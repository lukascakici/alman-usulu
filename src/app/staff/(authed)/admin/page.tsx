import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/modules/staff/current";
import { getFullMenuForBranch } from "@/lib/modules/admin/queries";
import { AdminMenu } from "./admin-menu";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["owner", "admin"]);

export default async function AdminPage() {
  const staff = await getCurrentStaff();
  if (!staff) return null; // layout redirected
  if (!ALLOWED.has(staff.role)) {
    redirect("/staff/mutfak");
  }

  const branchId = staff.branchId ?? "00000000-0000-0000-0000-000000000011";
  const categories = await getFullMenuForBranch(branchId);

  return <AdminMenu categories={categories} />;
}
