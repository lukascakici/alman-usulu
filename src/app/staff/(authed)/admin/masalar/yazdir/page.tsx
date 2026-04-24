import { getCurrentStaff } from "@/lib/modules/staff/current";
import { getTablesWithTokens } from "@/lib/modules/admin/tables-queries";
import { env } from "@/lib/env";
import { PrintView } from "./print-view";

export const dynamic = "force-dynamic";

export default async function QrPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  const { id } = await searchParams;

  const branchId = staff.branchId ?? "00000000-0000-0000-0000-000000000011";
  const all = await getTablesWithTokens(branchId);

  const list = id
    ? all.filter((t) => t.id === id && t.active_token)
    : all.filter((t) => t.active && t.active_token);

  return <PrintView tables={list} baseUrl={env.APP_BASE_URL} />;
}
