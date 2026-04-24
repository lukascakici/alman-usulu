"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { KitchenItem, KitchenTable } from "@/lib/modules/kitchen/queries";
import type { OrderItemStatus } from "@/lib/modules/orders/queries";
import { updateOrderItemStatus } from "@/lib/modules/kitchen/actions";

type Props = {
  branchId: string;
  initialItems: KitchenItem[];
  initialNames: Record<string, string | null>;
  sessionLabels: Record<string, string>;
};

export function KitchenBoard({
  branchId,
  initialItems,
  initialNames,
  sessionLabels: initialLabels,
}: Props) {
  const [items, setItems] = useState<KitchenItem[]>(initialItems);
  const [names, setNames] = useState<Record<string, string | null>>(initialNames);
  const [labels, setLabels] = useState<Record<string, string>>(initialLabels);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(initialItems), [initialItems]);
  useEffect(() => setNames(initialNames), [initialNames]);
  useEffect(() => setLabels(initialLabels), [initialLabels]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const itemsChannel = supabase
      .channel(`kitchen_items:${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as unknown as KitchenItem;
              if (!isActive(row.status)) return prev;
              if (prev.some((i) => i.id === row.id)) return prev;
              const withLabel: KitchenItem = {
                ...row,
                table_label: labels[row.table_session_id] ?? "?",
              };
              return [...prev, withLabel].sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              );
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as unknown as KitchenItem;
              if (!isActive(row.status)) {
                return prev.filter((i) => i.id !== row.id);
              }
              return prev.map((i) =>
                i.id === row.id ? { ...i, ...row, table_label: i.table_label } : i,
              );
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
      .channel(`kitchen_clients:${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_sessions",
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
      void supabase.removeChannel(itemsChannel);
      void supabase.removeChannel(clientsChannel);
    };
  }, [branchId, labels]);

  const groupedTables = useMemo<KitchenTable[]>(() => {
    const map = new Map<string, KitchenTable>();
    for (const it of items) {
      const entry = map.get(it.table_session_id);
      if (entry) {
        entry.items.push(it);
      } else {
        map.set(it.table_session_id, {
          tableSessionId: it.table_session_id,
          tableLabel: it.table_label,
          items: [it],
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      (a.items[0]?.created_at ?? "").localeCompare(b.items[0]?.created_at ?? ""),
    );
  }, [items]);

  const act = (itemId: string, to: "served" | "cancelled") => {
    setError(null);
    start(async () => {
      const r = await updateOrderItemStatus({ itemId, to });
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {groupedTables.length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-16">
          Aktif sipariş yok.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {groupedTables.map((tbl) => (
          <TableCard
            key={tbl.tableSessionId}
            table={tbl}
            names={names}
            disabled={pending}
            onAct={act}
          />
        ))}
      </div>
    </div>
  );
}

function TableCard({
  table,
  names,
  disabled,
  onAct,
}: {
  table: KitchenTable;
  names: Record<string, string | null>;
  disabled: boolean;
  onAct: (itemId: string, to: "served" | "cancelled") => void;
}) {
  const oldestMs = table.items.reduce(
    (max, i) => Math.max(max, Date.now() - new Date(i.created_at).getTime()),
    0,
  );
  const oldestMin = Math.max(0, Math.floor(oldestMs / 60000));
  const urgent = oldestMin >= 10;

  return (
    <section
      className={`bg-white rounded-xl border ${urgent ? "border-red-200" : "border-neutral-200"} overflow-hidden`}
    >
      <header
        className={`px-3 py-2 flex items-baseline justify-between ${urgent ? "bg-red-50" : "bg-neutral-50"} border-b ${urgent ? "border-red-200" : "border-neutral-200"}`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">
            Masa
          </span>
          <span className="text-sm font-semibold text-neutral-900">
            {table.tableLabel}
          </span>
        </div>
        <span
          className={`text-[11px] tabular-nums ${urgent ? "text-red-700 font-medium" : "text-neutral-500"}`}
        >
          {oldestMin}dk
        </span>
      </header>
      <ul className="divide-y divide-neutral-100">
        {table.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            displayName={
              item.created_by_client ? names[item.created_by_client] ?? null : null
            }
            disabled={disabled}
            onAct={onAct}
          />
        ))}
      </ul>
    </section>
  );
}

function ItemRow({
  item,
  displayName,
  disabled,
  onAct,
}: {
  item: KitchenItem;
  displayName: string | null;
  disabled: boolean;
  onAct: (itemId: string, to: "served" | "cancelled") => void;
}) {
  return (
    <li className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-neutral-500">
            {displayName ?? "bilinmeyen"}
          </p>
          <p className="text-sm font-medium text-neutral-900">
            {item.qty}× {item.name_snapshot}
          </p>
          {item.notes && (
            <p className="text-xs text-neutral-600 mt-0.5 italic">“{item.notes}”</p>
          )}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAct(item.id, "served")}
          className="flex-1 text-xs font-medium bg-neutral-900 text-white rounded-md py-1.5 disabled:bg-neutral-400"
        >
          Verildi
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAct(item.id, "cancelled")}
          className="text-xs text-red-600 border border-red-200 rounded-md px-2 py-1.5 disabled:opacity-50"
        >
          İptal
        </button>
      </div>
    </li>
  );
}

function isActive(s: OrderItemStatus) {
  return s === "pending" || s === "preparing" || s === "ready";
}
