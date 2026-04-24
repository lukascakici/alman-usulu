"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { MenuCategory } from "@/lib/modules/menu/queries";
import { MenuItemCard } from "./menu-item-card";
import { cn } from "@/lib/utils/cn";

const SCROLL_OFFSET = 150;

export function CustomerMenu({ categories }: { categories: MenuCategory[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(categories[0]?.id ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!trimmed) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            i.name.toLowerCase().includes(trimmed) ||
            (i.description?.toLowerCase() ?? "").includes(trimmed),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, trimmed]);

  useEffect(() => {
    if (trimmed) return;
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActiveCat(visible.target.id.replace("cat-", ""));
        }
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -60% 0px`, threshold: 0 },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [categories, trimmed]);

  const scrollToCat = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET + 20;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div ref={containerRef}>
      <div className="sticky top-[73px] z-10 bg-white/90 dark:bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:bg-black/75 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-5 py-3 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none"
              strokeWidth={2.25}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Menüde ara"
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Temizle"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {!trimmed && categories.length > 1 && (
            <nav className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => scrollToCat(c.id)}
                  className={cn(
                    "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border",
                    activeCat === c.id
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                      : "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50 hover:border-neutral-300 dark:hover:border-neutral-700",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8">
        {trimmed && filteredCategories.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-neutral-50">&ldquo;{query}&rdquo;</span> ile
              eşleşen ürün yok.
            </p>
          </div>
        )}

        {filteredCategories.map((category) => (
          <section
            key={category.id}
            id={`cat-${category.id}`}
            className="space-y-3 scroll-mt-36"
          >
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                {category.name}
              </h2>
              {category.description && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{category.description}</p>
              )}
            </div>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  base_price={Number(item.base_price)}
                  tags={item.tags}
                />
              ))}
              {category.items.length === 0 && (
                <li className="p-5 text-xs text-neutral-400 dark:text-neutral-500 italic">
                  Bu kategoride ürün yok.
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
