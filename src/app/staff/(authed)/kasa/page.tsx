export const dynamic = "force-dynamic";

export default function KasaPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500 font-semibold">
          Yakında
        </p>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Kasa Paneli</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          Split ödeme, POS eşleştirme ve masa kapatma bir sonraki turda gelecek.
        </p>
      </div>
    </div>
  );
}
