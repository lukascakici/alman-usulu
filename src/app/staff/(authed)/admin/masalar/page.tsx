import { getCurrentStaff } from "@/lib/modules/staff/current";
import {
  getAreas,
  getTablesWithTokens,
} from "@/lib/modules/admin/tables-queries";
import { env } from "@/lib/env";
import { TablesManager } from "./tables-manager";

export const dynamic = "force-dynamic";

export default async function MasalarPage() {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  const branchId = staff.branchId ?? "00000000-0000-0000-0000-000000000011";
  const [areas, tables] = await Promise.all([
    getAreas(branchId),
    getTablesWithTokens(branchId),
  ]);
  return (
    <TablesManager areas={areas} tables={tables} baseUrl={env.APP_BASE_URL} />
  );
}
