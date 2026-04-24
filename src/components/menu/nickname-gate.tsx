"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reclaimClientSession,
  setClientDisplayName,
} from "@/lib/modules/sessions/actions";

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
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            Masa {tableLabel}
          </p>
          <h1 className="text-lg font-semibold text-neutral-900">Hoş geldin</h1>
          <p className="text-sm text-neutral-600">
            Masadakilerle siparişleri karıştırmamak için seni nasıl çağıralım?
          </p>
        </div>

        {reclaimable.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Daha önce buradaysan
            </p>
            <div className="flex flex-wrap gap-2">
              {reclaimable.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => reclaim(r.id)}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-full border border-neutral-300 text-sm text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {r.name}
                </button>
              ))}
            </div>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-[11px] uppercase tracking-wide text-neutral-400">
                  veya yeni
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
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:bg-neutral-400"
          >
            {pending ? "Kaydediliyor…" : "Devam"}
          </button>
        </form>
      </div>
    </main>
  );
}
