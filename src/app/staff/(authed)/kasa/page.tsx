export const dynamic = "force-dynamic";

export default function KasaPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-neutral-400">Yakında</p>
        <h1 className="text-base font-semibold text-neutral-900">Kasa Paneli</h1>
        <p className="text-sm text-neutral-600">
          Split ödeme, POS eşleştirme ve masa kapatma bir sonraki turda.
        </p>
      </div>
    </div>
  );
}
