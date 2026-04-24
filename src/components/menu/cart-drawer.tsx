"use client";

import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatTRY } from "@/lib/utils/format";
import { useCart } from "./cart-provider";
import { submitOrder } from "@/lib/modules/orders/submit";
import { CurrentOrders } from "./current-orders";
import type { OrderItemRow } from "@/lib/modules/orders/queries";
import type { ClientNameMap } from "@/lib/modules/sessions/queries";

type Props = {
  tableSessionId: string;
  clientSessionId: string;
  initialTableItems: OrderItemRow[];
  initialClientNames: ClientNameMap;
};

export function CartDrawer({
  tableSessionId,
  clientSessionId,
  initialTableItems,
  initialClientNames,
}: Props) {
  const { items, count, total, increment, decrement, remove, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ESC ile drawer'ı kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Drawer açıkken body scroll'unu kilitle
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmit = () => {
    if (items.length === 0 || pending) return;
    startTransition(async () => {
      const res = await submitOrder({
        tableSessionId,
        items: items.map((i) => ({ menu_item_id: i.menu_item_id, qty: i.qty })),
      });
      if (res.ok) {
        clear();
        setFeedback({ kind: "ok", text: "Sipariş mutfağa iletildi." });
        setTimeout(() => setFeedback(null), 1500);
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <>
      <footer className="fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold hover:opacity-95 active:scale-[0.99] transition"
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <ShoppingBag className="w-5 h-5" strokeWidth={2.25} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center tabular-nums">
                    {count}
                  </span>
                )}
              </span>
              <span className="text-sm">
                {count > 0
                  ? `Sepet · ${count} kalem`
                  : initialTableItems.length > 0
                  ? "Masanın Siparişi"
                  : "Sepet"}
              </span>
            </span>
            {count > 0 && (
              <span className="text-sm font-bold tabular-nums">{formatTRY(total)}</span>
            )}
          </button>
        </div>
      </footer>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-h-[92vh] flex flex-col bg-white dark:bg-black rounded-t-3xl border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-12px_40px_rgba(0,0,0,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2.5">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="px-5 pt-3 pb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Masa</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">
              <CurrentOrders
                tableSessionId={tableSessionId}
                clientSessionId={clientSessionId}
                initial={initialTableItems}
                initialNames={initialClientNames}
              />

              <section className="space-y-2.5">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold">
                  {items.length > 0 ? "Yeni Sipariş" : "Sepet"}
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 py-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    Menüden ürün seçmeye başlayın.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    {items.map((i) => (
                      <li key={i.menu_item_id} className="p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                            {i.name}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums mt-0.5">
                            {formatTRY(i.unit_price)} × {i.qty}
                            <span className="text-neutral-400 dark:text-neutral-500"> · </span>
                            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                              {formatTRY(i.unit_price * i.qty)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
                          <button
                            type="button"
                            onClick={() => decrement(i.menu_item_id)}
                            className="w-7 h-7 grid place-items-center rounded-full hover:bg-white dark:hover:bg-black active:scale-90 transition"
                            aria-label="Azalt"
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.75} />
                          </button>
                          <span className="min-w-5 text-center text-xs font-bold tabular-nums">
                            {i.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              increment({
                                id: i.menu_item_id,
                                name: i.name,
                                unit_price: i.unit_price,
                              })
                            }
                            className="w-7 h-7 grid place-items-center rounded-full hover:bg-white dark:hover:bg-black active:scale-90 transition"
                            aria-label="Arttır"
                          >
                            <Plus className="w-3 h-3" strokeWidth={2.75} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i.menu_item_id)}
                          className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          Sil
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="px-5 pt-3 pb-5 border-t border-neutral-200 dark:border-neutral-800 space-y-3 bg-white dark:bg-black">
              {feedback && (
                <p
                  className={`text-xs font-medium ${
                    feedback.kind === "ok" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {feedback.text}
                </p>
              )}
              {items.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Yeni sipariş toplamı</span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tabular-nums tracking-tight">
                      {formatTRY(total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleSubmit}
                    className="w-full py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold active:scale-[0.99] hover:opacity-95 disabled:opacity-50 transition"
                  >
                    {pending ? "Gönderiliyor…" : "Siparişi Gönder"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
