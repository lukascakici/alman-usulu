import { getCurrentStaff } from "@/lib/modules/staff/current";
import {
  getActiveKitchenItems,
  getClientNamesForSessions,
} from "@/lib/modules/kitchen/queries";
import { KitchenBoard } from "./kitchen-board";

export const dynamic = "force-dynamic";

export default async function MutfakPage() {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  const branchId = staff.branchId ?? "00000000-0000-0000-0000-000000000011";

  const items = await getActiveKitchenItems(branchId);
  const sessionIds = [...new Set(items.map((i) => i.table_session_id))];
  const names = await getClientNamesForSessions(sessionIds);

  const sessionLabels: Record<string, string> = {};
  for (const it of items) {
    sessionLabels[it.table_session_id] = it.table_label;
  }

  return (
    <KitchenBoard
      branchId={branchId}
      initialItems={items}
      initialNames={names}
      sessionLabels={sessionLabels}
    />
  );
}
