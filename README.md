# Alman Usulü

QR menü, masadan sipariş ve kalem bazlı split ödeme sistemi.
Faz A: dijital sipariş takibi + mevcut POS ile ödeme.
Faz B: iyzico ile online self-servis ödeme.

## Stack

- **Next.js 15** (App Router, TS, Tailwind) — müşteri, kasa, mutfak, admin tek uygulama
- **Supabase** — Postgres + Realtime + Auth + Storage (cloud)
- **Zod** — runtime şema doğrulama
- **Vercel** — deploy

## Klasör yapısı

```
src/
  app/
    (customer)/t/[tableToken]/  Masa/menü/sipariş (müşteri)
    (staff)/kasa/               Kasa paneli
    (staff)/mutfak/             Mutfak ekranı (KDS)
    (admin)/admin/              Menü/rapor yönetimi
    api/                        Route handlers
  lib/
    supabase/                   Browser/server/service clients
    modules/                    Domain kapsüllü iş mantığı
      menu/  sessions/  orders/  payments/
    schemas/                    Zod şemalar
    utils/                      cn, formatters
  components/ui/                shadcn primitives
supabase/
  migrations/                   Şema migration'ları (SQL)
  seed.sql                      Dev için örnek kafe
docs/adr/                       Architecture Decision Records
```

## İlk kurulum

```bash
# 1. Bağımlılıklar
npm install

# 2. Env
cp .env.example .env.local
# .env.local'i doldur (Supabase dashboard'dan URL + keys)

# 3. Supabase CLI ile projeye bağlan
npx supabase login
npx supabase link --project-ref <proje-ref>

# 4. Migration'ları uygula
npx supabase db push

# 5. Dev için seed (OPSİYONEL — yerel Supabase kullanıyorsanız)
# Cloud'da manuel test datası ekleyin veya seed.sql'i SQL editor'de çalıştırın.

# 6. Dev server
npm run dev
```

## Geliştirme akışı

### Yeni migration ekle

```bash
npx supabase migration new isim_olsun
# supabase/migrations/<timestamp>_isim_olsun.sql
npx supabase db push
```

### TypeScript tiplerini yenile

```bash
npm run db:types
```

## Karar kayıtları

Mimari kararlar `docs/adr/` altındadır. Değişiklik öneren bir karar
verildiğinde yeni ADR yazılır, eski ADR "superseded" işaretlenir.
