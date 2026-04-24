"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reclaimClientSession,
  setClientDisplayName,
} from "@/lib/modules/sessions/actions";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  tableLabel: string;
  reclaimable: { id: string; name: string }[];
};

export function NicknameGate({ tableLabel, reclaimable }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value ?? "";
    setError(null);
    start(async () => {
      const res = await setClientDisplayName(value);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  const reclaim = (id: string) => {
    setError(null);
    start(async () => {
      const res = await reclaimClientSession({ reclaimClientSessionId: id });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-neutral-900 dark:text-neutral-50 px-6 py-10">
      <div className="fixed top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500 font-semibold">
            Masa {tableLabel}
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">
            Hoş geldin
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 pt-1">
            Masadaki siparişleri karıştırmamak için kendini nasıl tanıtırsın?
          </p>
        </div>

        {reclaimable.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold text-center">
              Daha önce buradaysan
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {reclaimable.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => reclaim(r.id)}
                  disabled={pending}
                  className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm font-semibold text-neutral-900 dark:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700 active:scale-95 disabled:opacity-50 transition"
                >
                  {r.name}
                </button>
              ))}
            </div>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-black px-3 text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500 font-semibold">
                  veya yeni isim
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submitNew} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            name="nickname"
            required
            maxLength={24}
            autoFocus
            placeholder="Örn. Ali"
            className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
          />

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold active:scale-[0.99] hover:opacity-95 disabled:opacity-50 transition"
          >
            {pending ? "Kaydediliyor…" : "Devam"}
          </button>
        </form>
      </div>
    </main>
  );
}
