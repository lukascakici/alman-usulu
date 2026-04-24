"use client";

import jsPDF from "jspdf";
import QRCode from "qrcode";

export type QrPdfEntry = {
  label: string;
  url: string;
  area?: string | null;
};

// Noto Sans (Türkçe + tüm Latin Extended desteği). Tarayıcıdan tek sefer
// indirilir, cache'lenir. Bundle'a girmez.
let fontCache: { regular: string; bold: string } | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font yüklenemedi: ${url}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // btoa kaldırabilir — 512KB dosyalar için chunk ile işle
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

async function ensureFonts() {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    toBase64("/fonts/NotoSans-Regular.ttf"),
    toBase64("/fonts/NotoSans-Bold.ttf"),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

/**
 * A4 sayfasına 2×3 grid'te QR kart yerleştirir, PDF indirir.
 * Noto Sans font'u embed edilerek Türkçe karakterler doğru basılır.
 */
export async function downloadQrPdf(
  entries: QrPdfEntry[],
  filename = `masa-qr-${Date.now()}.pdf`,
) {
  if (entries.length === 0) return;

  const fonts = await ensureFonts();

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Font embed
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFont("NotoSans-Regular.ttf", "Noto", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Bold.ttf", "Noto", "bold");
  doc.setFont("Noto", "normal");

  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const cols = 2;
  const rows = 3;
  const perPage = cols * rows;
  const cardW = (pageW - margin * 2) / cols;
  const cardH = (pageH - margin * 2) / rows;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const posOnPage = i % perPage;
    if (i > 0 && posOnPage === 0) doc.addPage();
    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);

    const x = margin + col * cardW;
    const y = margin + row * cardH;

    // Çerçeve
    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 2, y + 2, cardW - 4, cardH - 4, 3, 3);

    // Eyebrow: "MASA" + alan
    doc.setFont("Noto", "bold");
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text("MASA", x + 6, y + 9);
    if (entry.area) {
      doc.text(entry.area.toUpperCase(), x + cardW - 6, y + 9, {
        align: "right",
      });
    }

    // Etiket
    doc.setFont("Noto", "bold");
    doc.setFontSize(24);
    doc.setTextColor(20);
    doc.text(entry.label, x + cardW / 2, y + 20, { align: "center" });

    // QR
    const qrSize = Math.min(cardW - 24, cardH - 46);
    const qrDataUrl = await QRCode.toDataURL(entry.url, {
      margin: 0,
      width: 512,
      errorCorrectionLevel: "M",
    });
    const qrX = x + (cardW - qrSize) / 2;
    const qrY = y + 24;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Alt not
    doc.setFont("Noto", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.text("QR'ı okutun, sipariş verin", x + cardW / 2, qrY + qrSize + 6, {
      align: "center",
    });

    // URL (monospace yerine Noto regular kullanıyoruz; Türkçe karakter
    // gelmediği için yine de net okunur).
    doc.setFont("Noto", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    const urlLines = doc.splitTextToSize(entry.url, cardW - 10);
    doc.text(urlLines, x + cardW / 2, qrY + qrSize + 11, { align: "center" });
  }

  doc.save(filename);
}
