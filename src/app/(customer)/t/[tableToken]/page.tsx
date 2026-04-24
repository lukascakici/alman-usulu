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
import { ThemeToggle } from "@/components/theme-toggle";

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
      <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-50 pb-32">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:bg-black/75 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-medium">
                Masa
              </p>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none mt-1">
                {session.tableLabel}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 text-xs font-medium">
                {session.clientDisplayName}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {menu.length === 0 ? (
          <p className="max-w-2xl mx-auto px-5 pt-8 text-sm text-neutral-600 dark:text-neutral-400">
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
