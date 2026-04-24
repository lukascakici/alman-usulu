"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { AdminMenuCategory, AdminMenuItem } from "@/lib/modules/admin/queries";
import { updateMenuItem } from "@/lib/modules/admin/menu-actions";
import { formatTRY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Props = { categories: AdminMenuCategory[] };

const ALL = "__all__";

export function AdminMenu({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(ALL);

  const trimmed = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let cats = categories;
    if (activeCat !== ALL) {
      cats = cats.filter((c) => c.id === activeCat);
    }
    if (trimmed) {
      cats = cats
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (i) =>
              i.name.toLowerCase().includes(trimmed) ||
              (i.description?.toLowerCase() ?? "").includes(trimmed),
          ),
        }))
        .filter((c) => c.items.length > 0);
    }
    return cats;
  }, [categories, activeCat, trimmed]);

  const totalItems = useMemo(
    () => visible.reduce((n, c) => n + c.items.length, 0),
    [visible],
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Menü Yönetimi
        </p>
        <h1 className="text-lg font-semibold text-neutral-900">Ürünler</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Fiyat / isim / açıklama değişikliği anında uygulanır. Pasif ürünler müşteri
          menüsünde gözükmez.
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ürün ara (isim veya açıklama)…"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <nav className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
          <CatTab
            label="Tümü"
            active={activeCat === ALL}
            onClick={() => setActiveCat(ALL)}
          />
          {categories.map((c) => (
            <CatTab
              key={c.id}
              label={c.name}
              count={c.items.length}
              muted={!c.active}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </nav>
        <p className="text-[11px] text-neutral-500 tabular-nums">
          {totalItems} ürün gösteriliyor
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-8">Eşleşen ürün yok.</p>
      ) : (
        visible.map((cat) => (
          <section key={cat.id} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">{cat.name}</h2>
              {!cat.active && (
                <span className="text-[10px] uppercase text-red-600">pasif</span>
              )}
            </div>
            <ul className="divide-y divide-neutral-200 bg-white rounded-xl border border-neutral-200 overflow-hidden">
              {cat.items.length === 0 && (
                <li className="p-4 text-xs text-neutral-400 italic">
                  Bu kategoride ürün yok.
                </li>
              )}
              {cat.items.map((item) => (
                <EditableRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function CatTab({
  label,
  count,
  active,
  muted,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
        active
          ? "bg-neutral-900 text-white"
          : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100",
        muted && !active && "text-neutral-400",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className={cn("ml-1.5", active ? "text-neutral-300" : "text-neutral-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

function EditableRow({ item }: { item: AdminMenuItem }) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.base_price));
  const [active, setActive] = useState(item.active);
  const [feedback, setFeedback] = useState<
    { kind: "ok"; text: string } | { kind: "err"; text: string } | null
  >(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.base_price));
    setActive(item.active);
  }, [item.id, item.name, item.description, item.base_price, item.active]);

  const dirty =
    name.trim() !== item.name ||
    (description.trim() || null) !== (item.description ?? null) ||
    parseFloat(price) !== Number(item.base_price) ||
    active !== item.active;

  const save = () => {
    if (!dirty) return;
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFeedback({ kind: "err", text: "Geçerli bir fiyat girin." });
      return;
    }
    setFeedback(null);
    start(async () => {
      const r = await updateMenuItem({
        id: item.id,
        name: name.trim(),
        description: description.trim() || null,
        base_price: priceNum,
        active,
      });
      if (!r.ok) {
        setFeedback({ kind: "err", text: r.error });
      } else {
        setFeedback({ kind: "ok", text: "Kaydedildi." });
        setTimeout(() => setFeedback(null), 1500);
      }
    });
  };

  return (
    <li className={cn("p-3 space-y-2", !active && "bg-neutral-50")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm font-medium text-neutral-900 px-2 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 bg-transparent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            placeholder="Açıklama (opsiyonel)"
            className="w-full text-xs text-neutral-600 px-2 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 bg-transparent resize-none"
          />
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 rounded-md px-2 py-1">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step={0.5}
              className="w-20 text-right text-sm font-semibold text-neutral-900 bg-transparent focus:outline-none tabular-nums"
            />
            <span className="text-xs text-neutral-500">₺</span>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-neutral-900"
            />
            Aktif
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pl-2">
        <p className="text-[11px] text-neutral-400 tabular-nums">
          KDV %{item.vat_rate} · güncel: {formatTRY(Number(item.base_price))}
        </p>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={cn(
                "text-[11px]",
                feedback.kind === "ok" ? "text-green-700" : "text-red-700",
              )}
            >
              {feedback.text}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5 disabled:bg-neutral-300"
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </li>
  );
}
