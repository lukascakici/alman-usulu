"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OrderItemRow, OrderItemStatus } from "@/lib/modules/orders/queries";
import type { ClientNameMap } from "@/lib/modules/sessions/queries";
import { cancelOwnOrderItem } from "@/lib/modules/sessions/actions";
import { formatTRY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUS_LABEL: Record<OrderItemStatus, { text: string; tone: string }> = {
  pending: {
    text: "Bekliyor",
    tone: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
  },
  preparing: {
    text: "Hazırlanıyor",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  ready: {
    text: "Hazır",
    tone: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  served: {
    text: "Verildi",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  cancelled: {
    text: "İptal",
    tone: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
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

    const ordersChannel = supabase
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
      void supabase.removeChannel(ordersChannel);
      void supabase.removeChannel(clientsChannel);
    };
  }, [tableSessionId]);

  const nameFor = (id: string | null): string => {
    if (!id) return "Bilinmeyen";
    if (id === clientSessionId) return "Ben";
    return names[id] ?? "…";
  };

  const tableTotal = useMemo(() => {
    return items
      .filter((i) => i.status !== "cancelled")
      .reduce((s, i) => s + Number(i.line_total), 0);
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
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold">
          Masanın Siparişi
        </h3>
        <span className="text-base font-bold text-neutral-900 dark:text-neutral-50 tabular-nums tracking-tight">
          {formatTRY(tableTotal)}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {items.map((item) => {
          const label = STATUS_LABEL[item.status];
          const mine = item.created_by_client === clientSessionId;
          const canCancel = mine && item.status === "pending";
          const nm = nameFor(item.created_by_client);
          const muted = item.status === "cancelled";
          return (
            <li
              key={item.id}
              className={cn(
                "p-4 flex items-center gap-3",
                muted && "opacity-50",
              )}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[11px] uppercase tracking-[0.12em]",
                    mine ? "text-neutral-900 dark:text-neutral-50 font-semibold" : "text-neutral-400 dark:text-neutral-500",
                  )}
                >
                  {nm}
                </p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mt-0.5">
                  <span className="tabular-nums">{item.qty}×</span> {item.name_snapshot}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 tabular-nums mt-0.5">
                  {formatTRY(Number(item.line_total))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full",
                    label.tone,
                  )}
                >
                  {label.text}
                </span>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(item.id)}
                    disabled={pending}
                    className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    İptal et
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
