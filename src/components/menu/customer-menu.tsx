"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuCategory } from "@/lib/modules/menu/queries";
import { MenuItemCard } from "./menu-item-card";
import { cn } from "@/lib/utils/cn";

const SCROLL_OFFSET = 120; // sticky header (~56) + category nav (~48) + pay

export function CustomerMenu({ categories }: { categories: MenuCategory[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(categories[0]?.id ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();

  // Arama filtresi — boş ise tüm kategoriler; aksi halde kategori içi item filtrele
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

  // IntersectionObserver ile aktif kategoriyi takip et (arama yoksa)
  useEffect(() => {
    if (trimmed) return; // arama aktifken tab highlight'a karışma
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Ekranın üst yarısında olan ilk section'ı aktif kabul et
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
      <div className="sticky top-[56px] z-10 bg-neutral-50/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/80 border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 py-2 space-y-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Menüde ara…"
            className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          {!trimmed && categories.length > 1 && (
            <nav className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => scrollToCat(c.id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
                    activeCat === c.id
                      ? "bg-neutral-900 text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {trimmed && filteredCategories.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-8">
            Aramanızla eşleşen ürün yok.
          </p>
        )}

        {filteredCategories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="space-y-2 scroll-mt-32">
            <h2 className="text-base font-semibold text-neutral-900">{category.name}</h2>
            {category.description && (
              <p className="text-xs text-neutral-500">{category.description}</p>
            )}
            <ul className="divide-y divide-neutral-200 bg-white rounded-xl border border-neutral-200 overflow-hidden">
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
                <li className="p-4 text-xs text-neutral-400 italic">Bu kategoride ürün yok.</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
