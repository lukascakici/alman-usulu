"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { KitchenItem, KitchenTable } from "@/lib/modules/kitchen/queries";
import type { OrderItemStatus } from "@/lib/modules/orders/queries";
import { updateOrderItemStatus } from "@/lib/modules/kitchen/actions";
import { cn } from "@/lib/utils/cn";

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
    <div className="max-w-6xl mx-auto px-5 py-5 space-y-4">
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {groupedTables.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Aktif sipariş yok.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
      className={cn(
        "bg-neutral-50 dark:bg-neutral-900 rounded-2xl border overflow-hidden",
        urgent ? "border-red-500/40" : "border-neutral-200 dark:border-neutral-800",
      )}
    >
      <header
        className={cn(
          "px-4 py-3 flex items-center justify-between border-b",
          urgent
            ? "bg-red-500/10 border-red-500/20"
            : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800",
        )}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Masa
          </span>
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            {table.tableLabel}
          </span>
        </div>
        <span
          className={cn(
            "text-xs tabular-nums font-semibold",
            urgent ? "text-red-600 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400",
          )}
        >
          {oldestMin} dk
        </span>
      </header>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
    <li className="p-4 space-y-2.5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 font-semibold">
          {displayName ?? "bilinmeyen"}
        </p>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mt-0.5">
          <span className="tabular-nums">{item.qty}×</span> {item.name_snapshot}
        </p>
        {item.notes && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 italic">“{item.notes}”</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAct(item.id, "served")}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl py-2.5 active:scale-[0.98] hover:opacity-95 disabled:opacity-50 transition"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2.75} />
          Verildi
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAct(item.id, "cancelled")}
          className="px-3 grid place-items-center text-red-600 dark:text-red-400 border border-neutral-200 dark:border-neutral-800 hover:border-red-500/50 rounded-xl active:scale-95 disabled:opacity-50 transition"
          aria-label="İptal"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </li>
  );
}

function isActive(s: OrderItemStatus) {
  return s === "pending" || s === "preparing" || s === "ready";
}
