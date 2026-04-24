import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-50 flex items-center justify-center px-6 py-10">
      <div className="fixed top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="max-w-md text-center space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Alman Usulü
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
            QR menü · sipariş · bölüşülen hesap
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 pt-1">
            Masalardaki QR kodla müşterilerin sipariş verdiği, tek kalemden bile pay
            edilebilen kafe sistemi.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/kayit"
            className="px-6 py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-95 active:scale-95 transition"
          >
            Kafe hesabı oluştur
          </Link>
          <Link
            href="/staff/login"
            className="px-6 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-sm font-semibold text-neutral-900 dark:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
          >
            Giriş yap
          </Link>
        </div>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 pt-4">
          Müşteriyseniz masanızdaki QR kodu okutun.
        </p>
      </div>
    </main>
  );
}
