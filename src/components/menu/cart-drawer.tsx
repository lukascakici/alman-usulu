"use client";

import { useState, useTransition } from "react";
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

  const buttonLabel =
    count > 0
      ? `Sepet (${count}) · ${formatTRY(total)}`
      : initialTableItems.length > 0
      ? "Masanın Siparişi"
      : "Sepet";

  return (
    <>
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full text-sm font-medium bg-neutral-900 text-white px-4 py-3 rounded-lg active:scale-[0.99] transition"
          >
            {buttonLabel}
          </button>
        </div>
      </footer>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full bg-white rounded-t-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-base font-semibold">Masa</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-neutral-500"
              >
                Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <CurrentOrders
                tableSessionId={tableSessionId}
                clientSessionId={clientSessionId}
                initial={initialTableItems}
                initialNames={initialClientNames}
              />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-900">
                  {items.length > 0 ? "Yeni Sipariş" : "Yeni sipariş yok"}
                </h3>
                {items.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    Menüden ürün seçmeye başlayın, kalemler burada toplanır.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-200 bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    {items.map((i) => (
                      <li key={i.menu_item_id} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{i.name}</p>
                          <p className="text-xs text-neutral-500">
                            {formatTRY(i.unit_price)} × {i.qty} ={" "}
                            <span className="font-medium text-neutral-700">
                              {formatTRY(i.unit_price * i.qty)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 bg-neutral-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => decrement(i.menu_item_id)}
                            className="w-8 h-8 grid place-items-center text-lg leading-none"
                            aria-label="Azalt"
                          >
                            −
                          </button>
                          <span className="min-w-[1.5ch] text-center text-sm tabular-nums">
                            {i.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              increment({ id: i.menu_item_id, name: i.name, unit_price: i.unit_price })
                            }
                            className="w-8 h-8 grid place-items-center text-lg leading-none"
                            aria-label="Arttır"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i.menu_item_id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                          aria-label="Kaldır"
                        >
                          Sil
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="px-4 py-3 border-t border-neutral-200 space-y-3">
              {feedback && (
                <p
                  className={`text-xs ${feedback.kind === "ok" ? "text-green-700" : "text-red-700"}`}
                >
                  {feedback.text}
                </p>
              )}
              {items.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Yeni sipariş toplamı</span>
                    <span className="text-base font-semibold text-neutral-900">
                      {formatTRY(total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleSubmit}
                    className="w-full py-3 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:bg-neutral-300"
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
