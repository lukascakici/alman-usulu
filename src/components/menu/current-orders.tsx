"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OrderItemRow, OrderItemStatus } from "@/lib/modules/orders/queries";
import type { ClientNameMap } from "@/lib/modules/sessions/queries";
import { cancelOwnOrderItem } from "@/lib/modules/sessions/actions";
import { formatTRY } from "@/lib/utils/format";

const STATUS_LABEL: Record<OrderItemStatus, { text: string; tone: string }> = {
  pending: { text: "Bekliyor", tone: "bg-neutral-100 text-neutral-700" },
  preparing: { text: "Hazırlanıyor", tone: "bg-amber-100 text-amber-800" },
  ready: { text: "Hazır", tone: "bg-emerald-100 text-emerald-800" },
  served: { text: "Servis edildi", tone: "bg-sky-100 text-sky-800" },
  cancelled: { text: "İptal", tone: "bg-red-100 text-red-700" },
};

type Props = {
  tableSessionId: string;
  clientSessionId: string;
  initial: OrderItemRow[];
  initialNames: ClientNameMap;
};

export function CurrentOrders({
  tableSessionId,
  clientSessionId,
  initial,
  initialNames,
}: Props) {
  const [items, setItems] = useState<OrderItemRow[]>(initial);
  const [names, setNames] = useState<ClientNameMap>(initialNames);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(initial), [initial]);
  useEffect(() => setNames(initialNames), [initialNames]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const orderItemsChannel = supabase
      .channel(`order_items:${tableSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `table_session_id=eq.${tableSessionId}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as OrderItemRow;
              if (prev.some((i) => i.id === row.id)) return prev;
              return [...prev, row].sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              );
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as OrderItemRow;
              return prev.map((i) => (i.id === row.id ? row : i));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as { id: string };
              return prev.filter((i) => i.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    const clientsChannel = supabase
      .channel(`client_sessions:${tableSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_sessions",
          filter: `table_session_id=eq.${tableSessionId}`,
        },
        (payload) => {
          setNames((prev) => {
            if (payload.eventType === "DELETE") {
              const row = payload.old as { id: string };
              const next = { ...prev };
              delete next[row.id];
              return next;
            }
            const row = payload.new as { id: string; display_name: string | null };
            return { ...prev, [row.id]: row.display_name };
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(orderItemsChannel);
      void supabase.removeChannel(clientsChannel);
    };
  }, [tableSessionId]);

  const nameFor = (id: string | null): string => {
    if (!id) return "Bilinmeyen";
    if (id === clientSessionId) return "Ben";
    return names[id] ?? "…";
  };

  const { visible, tableTotal } = useMemo(() => {
    const active = items.filter((i) => i.status !== "cancelled");
    const tableTotal = active.reduce((s, i) => s + Number(i.line_total), 0);
    return { visible: [...items], tableTotal };
  }, [items]);

  const handleCancel = (id: string) => {
    setError(null);
    start(async () => {
      const r = await cancelOwnOrderItem({ orderItemId: id });
      if (!r.ok) setError(r.error);
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Masanın Siparişi</h3>
        <span className="text-sm text-neutral-700 font-medium">
          {formatTRY(tableTotal)}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <ul className="divide-y divide-neutral-200 bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {visible.map((item) => {
          const label = STATUS_LABEL[item.status];
          const mine = item.created_by_client === clientSessionId;
          const canCancel = mine && item.status === "pending";
          const nm = nameFor(item.created_by_client);
          const muted = item.status === "cancelled";
          return (
            <li key={item.id} className={`p-3 flex items-center gap-3 ${muted ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[11px] uppercase tracking-wide ${mine ? "text-neutral-900 font-medium" : "text-neutral-500"}`}>
                    {nm}
                  </span>
                </div>
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {item.qty}× {item.name_snapshot}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatTRY(Number(item.line_total))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${label.tone}`}
                >
                  {label.text}
                </span>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(item.id)}
                    disabled={pending}
                    className="text-[11px] text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    İptal
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
