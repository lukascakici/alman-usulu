import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-50 flex items-center justify-center px-6 py-10">
      <div className="fixed top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Alman Usulü
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">
            Kafeni kur
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 pt-1">
            2 dakikada hesap oluştur. Menüyü yükle, masalarını tanımla, QR kodlarını
            bas.
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
          Zaten hesabın var mı?{" "}
          <Link
            href="/staff/login"
            className="font-semibold text-neutral-900 dark:text-neutral-50 underline underline-offset-4"
          >
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
