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
              "px-3 py-1.5 rounded-lg text-sm font-medium transition",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
