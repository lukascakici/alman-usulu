"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/staff/admin/menu", label: "Menü" },
  { href: "/staff/admin/masalar", label: "Masalar" },
];

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition border",
              active
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                : "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
