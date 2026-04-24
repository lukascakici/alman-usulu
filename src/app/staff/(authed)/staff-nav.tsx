"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Tab = { href: string; label: string; roles?: string[] };

const tabs: Tab[] = [
  { href: "/staff/mutfak", label: "Mutfak" },
  { href: "/staff/kasa", label: "Kasa" },
  { href: "/staff/admin", label: "Yönetim", roles: ["owner", "admin"] },
];

export function StaffNav({ role }: { role: string }) {
  const pathname = usePathname();
  const visible = tabs.filter((t) => !t.roles || t.roles.includes(role));
  return (
    <nav className="flex gap-1">
      {visible.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-semibold transition",
              active
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
