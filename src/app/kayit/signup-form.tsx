"use client";

import { useRef, useState, useTransition } from "react";
import { signUpCafe } from "./actions";

export function SignupForm() {
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
          const res = await signUpCafe(fd);
          if (res && "error" in res) setError(res.error);
          // Başarı durumunda server action redirect fırlatır.
        });
      }}
      className="space-y-4"
    >
      <Field label="Kafe ismi" name="cafeName" placeholder="Örn. Demli Kafe" required maxLength={60} autoFocus />
      <Field
        label="Şube ismi"
        name="branchName"
        placeholder="Boş bırakırsan &ldquo;Merkez&rdquo;"
        maxLength={60}
      />
      <Field label="Adınız" name="ownerName" placeholder="Kafe sahibi olarak görünür" required maxLength={60} />
      <Field label="E-posta" name="email" type="email" required autoComplete="email" />
      <Field
        label="Şifre"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        hint="En az 8 karakter"
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
        {pending ? "Hesap oluşturuluyor…" : "Hesabı Oluştur"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.16em]"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
      />
      {hint && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 pl-1">{hint}</p>
      )}
    </div>
  );
}
