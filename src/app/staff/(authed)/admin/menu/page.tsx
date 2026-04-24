import { getCurrentStaff } from "@/lib/modules/staff/current";
import { getFullMenuForBranch } from "@/lib/modules/admin/queries";
import { AdminMenu } from "./admin-menu";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  const branchId = staff.branchId ?? "00000000-0000-0000-0000-000000000011";
  const categories = await getFullMenuForBranch(branchId);
  return <AdminMenu categories={categories} />;
}
