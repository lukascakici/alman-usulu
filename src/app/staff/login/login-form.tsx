"use client";

import { useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "./actions";

export function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "/staff/mutfak";

  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (!formRef.current) return;
        const fd = new FormData(formRef.current);
        setError(null);
        start(async () => {
          const res = await signInAction(fd);
          // Başarı durumunda signInAction redirect fırlatır; buraya dönmez.
          if (res?.error) setError(res.error);
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1">
        <label htmlFor="email" className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

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
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
