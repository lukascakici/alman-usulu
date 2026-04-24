"use client";

import { useState, useTransition } from "react";
import { Download, Printer } from "lucide-react";
import type { AdminTable } from "@/lib/modules/admin/tables-queries";
import { QrSvg } from "../tables-manager";
import { downloadQrPdf } from "@/lib/utils/qr-pdf";

type Props = {
  tables: AdminTable[];
  baseUrl: string;
};

export function PrintView({ tables, baseUrl }: Props) {
  const urlFor = (token: string | null) =>
    token ? `${baseUrl}/t/${token}` : "";

  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const handlePdf = () => {
    setErr(null);
    start(async () => {
      try {
        await downloadQrPdf(
          tables
            .filter((t) => t.active_token)
            .map((t) => ({
              label: t.label,
              url: urlFor(t.active_token),
              area: t.area_name,
            })),
          tables.length === 1
            ? `masa-${tables[0].label}-qr.pdf`
            : `masa-qr-kodlari.pdf`,
        );
      } catch (e) {
        setErr((e as Error).message ?? "PDF oluşturulamadı.");
      }
    });
  };

  return (
    <div className="bg-white text-black">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: white !important; }
          .print-hide { display: none !important; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="print-hide max-w-4xl mx-auto px-5 py-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
            Yazdırma Görünümü
          </p>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            {tables.length} masa QR kodu
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Yazdır ya da doğrudan PDF olarak indir.
          </p>
          {err && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{err}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePdf}
            disabled={pending || tables.length === 0}
            className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm font-semibold text-neutral-900 dark:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 disabled:opacity-50 transition inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" strokeWidth={2.5} />
            {pending ? "Hazırlanıyor…" : "PDF indir"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={tables.length === 0}
            className="px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-95 active:scale-95 disabled:opacity-50 transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" strokeWidth={2.5} />
            Yazdır
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <p className="text-center py-20 text-neutral-500 print-hide">
          Yazdırılacak aktif masa yok.
        </p>
      ) : (
        <div className="max-w-4xl mx-auto px-5 pb-10 grid grid-cols-2 gap-4">
          {tables.map((t) => (
            <article
              key={t.id}
              className="qr-card bg-white border border-neutral-300 rounded-xl p-5 flex flex-col items-center gap-3 text-black"
            >
              <div className="w-full flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 font-semibold">
                  Masa
                </p>
                {t.area_name && (
                  <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 font-medium">
                    {t.area_name}
                  </p>
                )}
              </div>
              <h2 className="text-3xl font-bold tracking-tight leading-none">
                {t.label}
              </h2>
              <div className="bg-white p-2">
                <QrSvg url={urlFor(t.active_token)} size={220} />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-[11px] font-semibold">
                  QR&apos;ı okutun, sipariş verin
                </p>
                <p className="text-[10px] text-neutral-500 font-mono break-all">
                  {urlFor(t.active_token)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
