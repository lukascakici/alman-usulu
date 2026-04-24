"use client";

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
    <li className="p-4 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-900 truncate">{name}</h3>
          <span className="text-sm font-semibold text-neutral-900 shrink-0">
            {formatTRY(base_price)}
          </span>
        </div>
        {description && (
          <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-0.5">
        {qty === 0 ? (
          <button
            type="button"
            onClick={() => increment({ id, name, unit_price: base_price })}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-700 active:scale-95 transition"
          >
            Ekle
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-neutral-900 text-white rounded-lg">
            <button
              type="button"
              onClick={() => decrement(id)}
              className="w-8 h-8 grid place-items-center text-lg leading-none active:scale-90"
              aria-label="Azalt"
            >
              −
            </button>
            <span className="min-w-[1.5ch] text-center text-sm tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => increment({ id, name, unit_price: base_price })}
              className="w-8 h-8 grid place-items-center text-lg leading-none active:scale-90"
              aria-label="Arttır"
            >
              +
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
