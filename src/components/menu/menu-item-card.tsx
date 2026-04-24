"use client";

import { Minus, Plus } from "lucide-react";
import { formatTRY } from "@/lib/utils/format";
import { useCart } from "./cart-provider";

type Props = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  tags: string[];
};

export function MenuItemCard({ id, name, description, base_price, tags }: Props) {
  const { increment, decrement, getQty } = useCart();
  const qty = getQty(id);

  return (
    <li className="p-4 flex gap-3 items-center">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50 truncate tracking-tight">
            {name}
          </h3>
          <span className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums shrink-0">
            {formatTRY(base_price)}
          </span>
        </div>
        {description && (
          <p className="text-[13px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-snug">
            {description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-0.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {qty === 0 ? (
          <button
            type="button"
            onClick={() => increment({ id, name, unit_price: base_price })}
            className="w-10 h-10 grid place-items-center rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 active:scale-90 transition"
            aria-label="Ekle"
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full pl-1 pr-1">
            <button
              type="button"
              onClick={() => decrement(id)}
              className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-black/10 active:scale-90 transition"
              aria-label="Azalt"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={2.75} />
            </button>
            <span className="min-w-[1.25rem] text-center text-[13px] font-bold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => increment({ id, name, unit_price: base_price })}
              className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10 dark:hover:bg-black/10 active:scale-90 transition"
              aria-label="Arttır"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.75} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
