"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "./actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOutAction();
          router.replace("/staff/login");
          router.refresh();
        })
      }
      className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
    >
      {pending ? "Çıkılıyor…" : "Çıkış"}
    </button>
  );
}
