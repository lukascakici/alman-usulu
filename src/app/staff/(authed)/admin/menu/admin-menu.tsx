"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import type { AdminMenuCategory, AdminMenuItem } from "@/lib/modules/admin/queries";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
} from "@/lib/modules/admin/menu-actions";
import { formatTRY } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Props = { categories: AdminMenuCategory[] };

const ALL = "__all__";

export function AdminMenu({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(ALL);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newItemForCat, setNewItemForCat] = useState<AdminMenuCategory | null>(null);

  const trimmed = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let cats = categories;
    if (activeCat !== ALL) cats = cats.filter((c) => c.id === activeCat);
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
    <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Menü Yönetimi
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none mt-1">
            Ürünler
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Değişiklikler anında yayınlanır. Pasif ürünler müşteri menüsünde gözükmez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewCategoryOpen(true)}
          className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm font-semibold text-neutral-900 dark:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Yeni kategori
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none"
            strokeWidth={2.25}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün ara (isim veya açıklama)"
            className="w-full pl-10 pr-10 py-2.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
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

        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
          {totalItems} ürün
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-12">
          Eşleşen ürün yok.
        </p>
      ) : (
        visible.map((cat) => (
          <section key={cat.id} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                  {cat.name}
                </h2>
                {!cat.active && (
                  <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-red-600 dark:text-red-400">
                    pasif
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNewItemForCat(cat)}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Ürün ekle
              </button>
            </div>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {cat.items.length === 0 && (
                <li className="p-5 text-xs text-neutral-400 dark:text-neutral-500 italic">
                  Bu kategoride henüz ürün yok.
                </li>
              )}
              {cat.items.map((item) => (
                <EditableRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}

      {newItemForCat && (
        <NewItemDialog
          category={newItemForCat}
          onClose={() => setNewItemForCat(null)}
        />
      )}
      {newCategoryOpen && (
        <NewCategoryDialog onClose={() => setNewCategoryOpen(false)} />
      )}
    </div>
  );
}

// ---------- CatTab ----------------------------------------------------

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
        "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border",
        active
          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
          : "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700",
        muted && !active && "text-neutral-400 dark:text-neutral-500",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "ml-1.5 tabular-nums",
            active ? "opacity-60" : "text-neutral-400 dark:text-neutral-500",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------- Editable row ---------------------------------------------

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
      if (!r.ok) setFeedback({ kind: "err", text: r.error });
      else {
        setFeedback({ kind: "ok", text: "Kaydedildi" });
        setTimeout(() => setFeedback(null), 1500);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`"${item.name}" ürününü silmek istediğinize emin misiniz?`)) return;
    setFeedback(null);
    start(async () => {
      const r = await deleteMenuItem({ id: item.id });
      if (!r.ok) setFeedback({ kind: "err", text: r.error });
    });
  };

  return (
    <li
      className={cn(
        "p-4 space-y-2.5",
        !active && "bg-neutral-100 dark:bg-neutral-800/60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm font-semibold text-neutral-900 dark:text-neutral-50 px-2 py-1 -mx-2 rounded-md border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 focus:border-neutral-900 dark:focus:border-white focus:outline-none bg-transparent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            placeholder="Açıklama (opsiyonel)"
            className="w-full text-xs text-neutral-600 dark:text-neutral-400 px-2 py-1 -mx-2 rounded-md border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 focus:border-neutral-900 dark:focus:border-white focus:outline-none bg-transparent resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-1.5 border border-neutral-200 dark:border-neutral-800">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step={0.5}
              className="w-20 text-right text-base font-bold text-neutral-900 dark:text-neutral-50 bg-transparent focus:outline-none tabular-nums"
            />
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              ₺
            </span>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-neutral-900 dark:accent-white"
            />
            Aktif
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pl-0">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
          KDV %{item.vat_rate} · güncel: {formatTRY(Number(item.base_price))}
        </p>
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={cn(
                "text-[11px] flex items-center gap-1 font-medium",
                feedback.kind === "ok"
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {feedback.kind === "ok" && (
                <Check className="w-3 h-3" strokeWidth={3} />
              )}
              {feedback.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Sil"
            className="w-8 h-8 grid place-items-center rounded-full text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className={cn(
              "text-xs font-bold rounded-full px-4 py-1.5 transition active:scale-95",
              dirty && !pending
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-95"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed",
            )}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------- New item dialog ------------------------------------------

function NewItemDialog({
  category,
  onClose,
}: {
  category: AdminMenuCategory;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [prep, setPrep] = useState("");
  const [tags, setTags] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!name.trim()) {
      setErr("İsim zorunlu.");
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setErr("Geçerli bir fiyat girin.");
      return;
    }
    const prepNum = prep ? parseInt(prep, 10) : null;
    setErr(null);
    start(async () => {
      const r = await createMenuItem({
        category_id: category.id,
        name: name.trim(),
        description: description.trim() || null,
        base_price: priceNum,
        preparation_minutes:
          prepNum && !Number.isNaN(prepNum) ? prepNum : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (!r.ok) setErr(r.error);
      else onClose();
    });
  };

  return (
    <DialogShell onClose={onClose} title="Yeni ürün" subtitle={category.name}>
      <div className="space-y-3">
        <Field label="İsim">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Örn. Limonata"
            className={inputCls}
          />
        </Field>
        <Field label="Açıklama (opsiyonel)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
            className={`${inputCls} resize-none`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fiyat (₺)">
            <input
              type="number"
              min={0}
              step={0.5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputCls} tabular-nums`}
            />
          </Field>
          <Field label="Hazırlık süresi (dk)">
            <input
              type="number"
              min={1}
              max={120}
              value={prep}
              onChange={(e) => setPrep(e.target.value)}
              placeholder="Opsiyonel"
              className={`${inputCls} tabular-nums`}
            />
          </Field>
        </div>
        <Field label="Etiketler (virgülle ayır)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Örn. vegan, soğuk"
            className={inputCls}
          />
        </Field>
        {err && <ErrorBox text={err} />}
      </div>
      <DialogActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel="Oluştur"
        pending={pending}
      />
    </DialogShell>
  );
}

// ---------- New category dialog --------------------------------------

function NewCategoryDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!name.trim()) {
      setErr("İsim zorunlu.");
      return;
    }
    setErr(null);
    start(async () => {
      const r = await createMenuCategory({
        name: name.trim(),
        description: description.trim() || null,
      });
      if (!r.ok) setErr(r.error);
      else onClose();
    });
  };

  return (
    <DialogShell onClose={onClose} title="Yeni kategori">
      <div className="space-y-3">
        <Field label="İsim">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Örn. Kahvaltı"
            className={inputCls}
          />
        </Field>
        <Field label="Açıklama (opsiyonel)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={200}
            className={`${inputCls} resize-none`}
          />
        </Field>
        {err && <ErrorBox text={err} />}
      </div>
      <DialogActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel="Oluştur"
        pending={pending}
      />
    </DialogShell>
  );
}

// ---------- Small primitives ----------------------------------------

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white";

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-black rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800">
          <div>
            {subtitle && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold">
                {subtitle}
              </p>
            )}
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onConfirm,
  confirmLabel,
  pending,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  pending: boolean;
}) {
  return (
    <div className="flex gap-2 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-sm font-semibold"
      >
        Vazgeç
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="flex-1 py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition"
      >
        {pending ? "Kaydediliyor…" : confirmLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
      {text}
    </p>
  );
}
