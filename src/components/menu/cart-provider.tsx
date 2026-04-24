"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  menu_item_id: string;
  name: string;
  unit_price: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  increment: (item: { id: string; name: string; unit_price: number }) => void;
  decrement: (menu_item_id: string) => void;
  remove: (menu_item_id: string) => void;
  clear: () => void;
  getQty: (menu_item_id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(tableSessionId: string) {
  return `au_cart:${tableSessionId}`;
}

type StoredCart = {
  tableSessionId: string;
  items: CartItem[];
};

export function CartProvider({
  tableSessionId,
  children,
}: {
  tableSessionId: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Masa değişirse hydrate et
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(storageKey(tableSessionId));
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw) as StoredCart;
      if (parsed.tableSessionId === tableSessionId && Array.isArray(parsed.items)) {
        setItems(parsed.items);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, [tableSessionId]);

  // Her değişimde persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      storageKey(tableSessionId),
      JSON.stringify({ tableSessionId, items } satisfies StoredCart),
    );
  }, [tableSessionId, items]);

  const increment: CartContextValue["increment"] = useCallback((item) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.id ? { ...i, qty: Math.min(i.qty + 1, 20) } : i,
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, unit_price: item.unit_price, qty: 1 },
      ];
    });
  }, []);

  const decrement: CartContextValue["decrement"] = useCallback((menu_item_id) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menu_item_id === menu_item_id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((i) => i.menu_item_id !== menu_item_id);
      return prev.map((i) =>
        i.menu_item_id === menu_item_id ? { ...i, qty: i.qty - 1 } : i,
      );
    });
  }, []);

  const remove: CartContextValue["remove"] = useCallback((menu_item_id) => {
    setItems((prev) => prev.filter((i) => i.menu_item_id !== menu_item_id));
  }, []);

  const clear: CartContextValue["clear"] = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const total = items.reduce((n, i) => n + i.unit_price * i.qty, 0);
    const qtyMap = new Map(items.map((i) => [i.menu_item_id, i.qty]));
    return {
      items,
      count,
      total,
      increment,
      decrement,
      remove,
      clear,
      getQty: (id) => qtyMap.get(id) ?? 0,
    };
  }, [items, increment, decrement, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
