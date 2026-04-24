import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ATTACH_HEADER, type AttachedSession } from "@/lib/modules/sessions/core";
import { getMenuByBranch } from "@/lib/modules/menu/queries";
import { getOrderItemsBySession } from "@/lib/modules/orders/queries";
import { getClientsBySession } from "@/lib/modules/sessions/queries";
import { CartProvider } from "@/components/menu/cart-provider";
import { CartDrawer } from "@/components/menu/cart-drawer";
import { CustomerMenu } from "@/components/menu/customer-menu";
import { NicknameGate } from "@/components/menu/nickname-gate";

export const dynamic = "force-dynamic";

export default async function CustomerTablePage() {
  const h = await headers();
  const raw = h.get(ATTACH_HEADER);
  if (!raw) notFound();

  let session: AttachedSession;
  try {
    session = JSON.parse(raw) as AttachedSession;
  } catch {
    notFound();
  }

  if (!session.clientDisplayName) {
    const existingClients = await getClientsBySession(session.tableSessionId);
    const reclaimable = Object.entries(existingClients)
      .filter(([id, name]) => id !== session.clientSessionId && !!name)
      .map(([id, name]) => ({ id, name: name as string }));

    return (
      <NicknameGate tableLabel={session.tableLabel} reclaimable={reclaimable} />
    );
  }

  const [menu, currentItems, clientNames] = await Promise.all([
    getMenuByBranch(session.branchId),
    getOrderItemsBySession(session.tableSessionId),
    getClientsBySession(session.tableSessionId),
  ]);

  return (
    <CartProvider tableSessionId={session.tableSessionId}>
      <main className="min-h-screen bg-neutral-50 pb-28">
        <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Masa</p>
              <h1 className="text-lg font-semibold text-neutral-900">{session.tableLabel}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">
                {session.clientDisplayName ?? "Sen"}
              </p>
              <p className="text-xs font-mono text-neutral-500">
                {session.tableSessionId.slice(0, 8)}
              </p>
            </div>
          </div>
        </header>

        {menu.length === 0 ? (
          <p className="max-w-2xl mx-auto px-4 pt-4 text-sm text-neutral-600">
            Bu şube için aktif menü bulunamadı.
          </p>
        ) : (
          <CustomerMenu categories={menu} />
        )}

        <CartDrawer
          tableSessionId={session.tableSessionId}
          clientSessionId={session.clientSessionId}
          initialTableItems={currentItems}
          initialClientNames={clientNames}
        />
      </main>
    </CartProvider>
  );
}
