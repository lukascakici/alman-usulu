import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function StaffLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            Alman Usulü — Personel
          </p>
          <h1 className="text-lg font-semibold text-neutral-900">Giriş</h1>
        </div>
        <Suspense fallback={<p className="text-xs text-neutral-500">Yükleniyor…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
