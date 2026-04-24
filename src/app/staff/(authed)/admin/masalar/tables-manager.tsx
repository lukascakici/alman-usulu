"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Printer, QrCode, RotateCw, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import {
  createArea,
  createTable,
  rotateTableToken,
  updateTable,
} from "@/lib/modules/admin/tables-actions";
import type {
  AdminArea,
  AdminTable,
} from "@/lib/modules/admin/tables-queries";

type Props = {
  areas: AdminArea[];
  tables: AdminTable[];
  baseUrl: string;
};

const ALL = "__all__";
const NONE = "__none__";

export function TablesManager({ areas, tables, baseUrl }: Props) {
  const [activeArea, setActiveArea] = useState<string>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrOpenFor, setQrOpenFor] = useState<AdminTable | null>(null);

  const visible = useMemo(() => {
    if (activeArea === ALL) return tables;
    if (activeArea === NONE) return tables.filter((t) => !t.area_id);
    return tables.filter((t) => t.area_id === activeArea);
  }, [tables, activeArea]);

  const urlFor = (token: string | null) =>
    token ? `${baseUrl}/t/${token}` : null;

  return (
    <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Masalar
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none mt-1">
            {tables.length} masa
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Müşteriler bu masalardaki QR kodları okutarak menüye ve siparişe ulaşır.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/admin/masalar/yazdir"
            target="_blank"
            className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm font-semibold text-neutral-900 dark:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" strokeWidth={2.25} />
            Tümünü yazdır
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-95 active:scale-95 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} />
            Yeni masa
          </button>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        <AreaTab
          label="Tümü"
          count={tables.length}
          active={activeArea === ALL}
          onClick={() => setActiveArea(ALL)}
        />
        {areas.map((a) => (
          <AreaTab
            key={a.id}
            label={a.name}
            count={tables.filter((t) => t.area_id === a.id).length}
            active={activeArea === a.id}
            onClick={() => setActiveArea(a.id)}
          />
        ))}
        <AreaTab
          label="Alansız"
          count={tables.filter((t) => !t.area_id).length}
          active={activeArea === NONE}
          onClick={() => setActiveArea(NONE)}
        />
      </nav>

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center py-12">
          Burada masa yok. Üstteki &ldquo;Yeni masa&rdquo; ile ekleyebilirsin.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((t) => (
            <TableRow
              key={t.id}
              table={t}
              url={urlFor(t.active_token)}
              onQr={() => setQrOpenFor(t)}
            />
          ))}
        </ul>
      )}

      {createOpen && (
        <CreateTableDialog
          areas={areas}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {qrOpenFor && qrOpenFor.active_token && (
        <QrDialog
          table={qrOpenFor}
          url={urlFor(qrOpenFor.active_token)!}
          onClose={() => setQrOpenFor(null)}
        />
      )}
    </div>
  );
}

// ---------- Row ---------------------------------------------------------

function TableRow({
  table,
  url,
  onQr,
}: {
  table: AdminTable;
  url: string | null;
  onQr: () => void;
}) {
  const [label, setLabel] = useState(table.label);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setLabel(table.label), [table.label]);

  const save = () => {
    if (label.trim() === table.label) {
      setEditing(false);
      return;
    }
    setErr(null);
    start(async () => {
      const r = await updateTable({ id: table.id, label: label.trim() });
      if (!r.ok) {
        setErr(r.error);
        setLabel(table.label);
      } else {
        setEditing(false);
      }
    });
  };

  const toggleActive = () => {
    setErr(null);
    start(async () => {
      const r = await updateTable({ id: table.id, active: !table.active });
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <li
      className={cn(
        "p-4 rounded-2xl border bg-neutral-50 dark:bg-neutral-900 space-y-3",
        table.active
          ? "border-neutral-200 dark:border-neutral-800"
          : "border-neutral-200 dark:border-neutral-800 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setLabel(table.label);
                  setEditing(false);
                }
              }}
              autoFocus
              className="w-full text-lg font-bold bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none text-neutral-900 dark:text-neutral-50"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight hover:opacity-70 text-left"
            >
              {table.label}
            </button>
          )}
          {table.area_name && (
            <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 font-semibold mt-0.5">
              {table.area_name}
            </p>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer select-none font-medium shrink-0">
          <input
            type="checkbox"
            checked={table.active}
            onChange={toggleActive}
            disabled={pending}
            className="w-3.5 h-3.5 accent-neutral-900 dark:accent-white"
          />
          Aktif
        </label>
      </div>

      {err && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{err}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onQr}
          disabled={!url}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition"
        >
          <QrCode className="w-3.5 h-3.5" strokeWidth={2.5} />
          QR kod
        </button>
        <Link
          href={url ?? "#"}
          target="_blank"
          className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition"
        >
          Aç
        </Link>
      </div>
    </li>
  );
}

// ---------- Create Dialog ----------------------------------------------

function CreateTableDialog({
  areas,
  onClose,
}: {
  areas: AdminArea[];
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [seats, setSeats] = useState<string>("");
  const [newAreaName, setNewAreaName] = useState("");
  const [showNewArea, setShowNewArea] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!label.trim()) {
      setErr("Etiket zorunlu.");
      return;
    }
    setErr(null);
    start(async () => {
      let selectedAreaId: string | null = areaId || null;

      if (showNewArea && newAreaName.trim()) {
        const a = await createArea({ name: newAreaName.trim() });
        if (!a.ok) {
          setErr(a.error);
          return;
        }
        selectedAreaId = a.id;
      }

      const seatsNum = seats ? parseInt(seats, 10) : null;
      const r = await createTable({
        label: label.trim(),
        area_id: selectedAreaId,
        seats: seatsNum && !Number.isNaN(seatsNum) ? seatsNum : null,
      });
      if (!r.ok) setErr(r.error);
      else onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-black rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            Yeni masa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="tblLabel"
              className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]"
            >
              Etiket
            </label>
            <input
              id="tblLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={30}
              autoFocus
              placeholder="Örn. M-01 veya Bahçe 3"
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="tblArea"
              className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]"
            >
              Alan (opsiyonel)
            </label>
            {showNewArea ? (
              <div className="flex gap-2">
                <input
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Yeni alan ismi"
                  className="flex-1 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewArea(false);
                    setNewAreaName("");
                  }}
                  className="px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold"
                >
                  İptal
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  id="tblArea"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                >
                  <option value="">— Seçilmedi —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewArea(true)}
                  className="px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  + Yeni
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="tblSeats"
              className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]"
            >
              Kişi kapasitesi (opsiyonel)
            </label>
            <input
              id="tblSeats"
              type="number"
              min={1}
              max={30}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus:border-neutral-900 dark:focus:border-white tabular-nums"
            />
          </div>

          {err && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {err}
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-sm font-semibold"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition"
          >
            {pending ? "Oluşturuluyor…" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- QR Dialog --------------------------------------------------

function QrDialog({
  table,
  url,
  onClose,
}: {
  table: AdminTable;
  url: string;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const rotate = () => {
    if (!confirm("Bu masanın QR kodu yenilenecek. Eski QR çalışmaz olur. Devam edilsin mi?"))
      return;
    setErr(null);
    start(async () => {
      const r = await rotateTableToken({ table_id: table.id });
      if (!r.ok) setErr(r.error);
      // revalidate ile parent yenilenir
    });
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-black rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-semibold">
              Masa
            </p>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {table.label}
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

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
          <QrSvg url={url} size={240} />
        </div>

        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono break-all text-center px-2">
          {url}
        </p>

        {err && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={rotate}
            disabled={pending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold hover:border-neutral-300 dark:hover:border-neutral-700 disabled:opacity-50 transition"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={2.5} />
            {pending ? "Yenileniyor…" : "QR'ı yenile"}
          </button>
          <Link
            href={`/staff/admin/masalar/yazdir?id=${table.id}`}
            target="_blank"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-95 active:scale-[0.98] transition"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={2.75} />
            Yazdır
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------- Small components ------------------------------------------

function AreaTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
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
      )}
    >
      {label}
      <span className={cn("ml-1.5 tabular-nums", active ? "opacity-60" : "text-neutral-400 dark:text-neutral-500")}>
        {count}
      </span>
    </button>
  );
}

export function QrSvg({ url, size = 200 }: { url: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    QRCode.toString(url, { type: "svg", margin: 1, width: size })
      .then((svg) => {
        if (!ignore && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [url, size]);

  return <div ref={containerRef} style={{ width: size, height: size }} />;
}
