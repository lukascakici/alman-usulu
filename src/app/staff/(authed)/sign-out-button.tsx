"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
      aria-label="Çıkış"
      className="w-9 h-9 grid place-items-center rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" strokeWidth={2.25} />
    </button>
  );
}
