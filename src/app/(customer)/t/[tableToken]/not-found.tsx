import { ThemeToggle } from "@/components/theme-toggle";

export default function TableNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-neutral-50 px-6">
      <div className="fixed top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="text-center space-y-3 max-w-sm">
        <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500 font-semibold">
          404
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
          QR kodu tanınmadı
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Bu masa için aktif bir oturum bulamadık. Lütfen kasadan yardım isteyin veya
          QR kodu tekrar okutun.
        </p>
      </div>
    </main>
  );
}
