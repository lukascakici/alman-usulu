-- =====================================================================
-- Alman Usulü — Initial Schema (Faz A)
-- QR menü, sipariş ve POS-tabanlı split ödeme çekirdeği
-- =====================================================================
-- Tasarım notları:
--  * Multi-tenant'a hazır (tenant_id her tabloda), bugün 1 tenant.
--  * Online ödeme (iyzico/PayTR) için alan bırakıldı, Faz B'de açılacak.
--  * RLS her tabloda ENABLED; varsayılan deny.
--  * Mutasyonlar server-side service_role ile yapılır; menü okuması public.
-- =====================================================================

-- --- Extensions -------------------------------------------------------
create extension if not exists "pgcrypto";

-- --- Enums ------------------------------------------------------------
create type staff_role as enum ('owner', 'admin', 'cashier', 'kitchen', 'waiter');
create type table_session_state as enum ('open', 'closing', 'closed');
create type order_status as enum ('draft', 'submitted', 'preparing', 'ready', 'served', 'cancelled');
create type order_item_status as enum ('pending', 'preparing', 'ready', 'served', 'cancelled');
create type bill_claim_state as enum ('held', 'paid', 'released');
create type payment_event_type as enum ('pos_card', 'pos_cash', 'online_card', 'refund', 'adjustment');

-- --- Utility: updated_at tetikleyici ----------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- CORE: tenants, branches, areas
-- =====================================================================

create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create trigger tenants_updated_at before update on tenants
  for each row execute function set_updated_at();

create table branches (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  name          text not null,
  slug          text not null,
  timezone      text not null default 'Europe/Istanbul',
  currency      text not null default 'TRY',
  vat_inclusive boolean not null default true,  -- TR'de fiyatlar KDV dahil gösterilir
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (tenant_id, slug)
);

create index branches_tenant_idx on branches(tenant_id);
create trigger branches_updated_at before update on branches
  for each row execute function set_updated_at();

create table areas (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  branch_id     uuid not null references branches(id) on delete restrict,
  name          text not null,       -- 'Salon', 'Bahçe', 'Teras'
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index areas_branch_idx on areas(branch_id);

-- =====================================================================
-- TABLES + QR TOKENS
-- =====================================================================

create table tables (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  branch_id     uuid not null references branches(id) on delete restrict,
  area_id       uuid references areas(id) on delete set null,
  label         text not null,        -- "M-12", "Bahçe 3"
  seats         int,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (branch_id, label)
);

create index tables_branch_idx on tables(branch_id);
create trigger tables_updated_at before update on tables
  for each row execute function set_updated_at();

-- QR tokenları rotasyonlu; eski tokenlar invalide edilir.
create table table_qr_tokens (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references tables(id) on delete cascade,
  token         text not null unique,          -- QR URL'inde taşınan opak string
  active        boolean not null default true,
  issued_at     timestamptz not null default now(),
  revoked_at    timestamptz,
  notes         text
);

create index table_qr_tokens_table_idx on table_qr_tokens(table_id) where active;

-- =====================================================================
-- MENU
-- =====================================================================

create table menu_categories (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  branch_id     uuid not null references branches(id) on delete restrict,
  name          text not null,
  description   text,
  display_order int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index menu_categories_branch_idx on menu_categories(branch_id) where active;
create trigger menu_categories_updated_at before update on menu_categories
  for each row execute function set_updated_at();

create table menu_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  branch_id     uuid not null references branches(id) on delete restrict,
  category_id   uuid not null references menu_categories(id) on delete restrict,
  name          text not null,
  description   text,
  image_url     text,
  base_price    numeric(12,2) not null check (base_price >= 0),
  vat_rate      numeric(4,2) not null default 10.00,  -- TR 2026: yiyecek %10, içecek %20
  allergens     text[] not null default '{}',
  tags          text[] not null default '{}',         -- 'vegan', 'glutensiz', 'yeni' vb.
  preparation_minutes int,
  display_order int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index menu_items_category_idx on menu_items(category_id) where active;
create index menu_items_branch_idx on menu_items(branch_id) where active;
create trigger menu_items_updated_at before update on menu_items
  for each row execute function set_updated_at();

create table menu_modifier_groups (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete restrict,
  branch_id     uuid not null references branches(id) on delete restrict,
  name          text not null,                -- 'Boyut', 'Sos', 'Ekstralar'
  min_select    int not null default 0,
  max_select    int not null default 1,
  required      boolean not null default false,
  display_order int not null default 0,
  check (min_select >= 0 and max_select >= min_select)
);

create table menu_modifiers (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references menu_modifier_groups(id) on delete cascade,
  name          text not null,
  price_delta   numeric(12,2) not null default 0,
  active        boolean not null default true,
  display_order int not null default 0
);

create index menu_modifiers_group_idx on menu_modifiers(group_id) where active;

create table menu_item_modifier_groups (
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  group_id      uuid not null references menu_modifier_groups(id) on delete cascade,
  display_order int not null default 0,
  primary key (menu_item_id, group_id)
);

-- =====================================================================
-- STAFF (Supabase Auth user'larına bağlı profiller)
-- =====================================================================

create table staff_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  branch_id     uuid references branches(id) on delete set null,  -- null = tüm şubeler
  full_name     text not null,
  role          staff_role not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, tenant_id)
);

create index staff_profiles_user_idx on staff_profiles(user_id);
create index staff_profiles_tenant_idx on staff_profiles(tenant_id);
create trigger staff_profiles_updated_at before update on staff_profiles
  for each row execute function set_updated_at();

-- Helper: oturum açmış kullanıcının tenant'ı var mı, hangi rol?
create or replace function auth_staff_has_role(_tenant_id uuid, _roles staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff_profiles sp
    where sp.user_id = auth.uid()
      and sp.tenant_id = _tenant_id
      and sp.active
      and sp.role = any(_roles)
  );
$$;

-- =====================================================================
-- SESSIONS: table_sessions + client_sessions
-- =====================================================================

create table table_sessions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete restrict,
  branch_id         uuid not null references branches(id) on delete restrict,
  table_id          uuid not null references tables(id) on delete restrict,
  state             table_session_state not null default 'open',
  opened_at         timestamptz not null default now(),
  closing_started_at timestamptz,
  closed_at         timestamptz,
  opened_by_staff   uuid references staff_profiles(id),
  closed_by_staff   uuid references staff_profiles(id),
  guest_count_hint  int,
  notes             text,
  updated_at        timestamptz not null default now()
);

-- Bir masada aynı anda yalnızca bir 'open' / 'closing' oturum olabilir.
create unique index table_sessions_single_active
  on table_sessions(table_id)
  where state in ('open', 'closing');

create index table_sessions_branch_state_idx on table_sessions(branch_id, state);
create trigger table_sessions_updated_at before update on table_sessions
  for each row execute function set_updated_at();

create table client_sessions (
  id                uuid primary key default gen_random_uuid(),
  table_session_id  uuid not null references table_sessions(id) on delete cascade,
  display_name      text,                          -- 'Masadaki 2', 'Ayşe'
  color_hex         text,                          -- UI'da kim-kim ayrımı için
  device_fingerprint text,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now()
);

create index client_sessions_table_idx on client_sessions(table_session_id);

-- =====================================================================
-- ORDERS
-- =====================================================================

create table orders (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete restrict,
  branch_id         uuid not null references branches(id) on delete restrict,
  table_session_id  uuid not null references table_sessions(id) on delete restrict,
  status            order_status not null default 'draft',
  submitted_at      timestamptz,
  notes             text,
  created_by_client uuid references client_sessions(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_session_idx on orders(table_session_id);
create index orders_branch_status_idx on orders(branch_id, status);
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  tenant_id           uuid not null,
  branch_id           uuid not null,
  table_session_id    uuid not null,
  menu_item_id        uuid not null references menu_items(id) on delete restrict,
  created_by_client   uuid references client_sessions(id),
  qty                 int not null check (qty > 0),
  unit_price_snapshot numeric(12,2) not null,   -- sipariş anındaki fiyat kilitli
  vat_rate_snapshot   numeric(4,2) not null,
  name_snapshot       text not null,            -- "Margherita Pizza" gibi anlık görünüm
  modifiers_total     numeric(12,2) not null default 0,
  line_total          numeric(12,2) generated always as
                        ((unit_price_snapshot + modifiers_total) * qty) stored,
  status              order_item_status not null default 'pending',
  notes               text,
  cancelled_reason    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index order_items_order_idx on order_items(order_id);
create index order_items_session_idx on order_items(table_session_id);
create index order_items_branch_status_idx on order_items(branch_id, status);
create trigger order_items_updated_at before update on order_items
  for each row execute function set_updated_at();

create table order_item_modifiers (
  id              uuid primary key default gen_random_uuid(),
  order_item_id   uuid not null references order_items(id) on delete cascade,
  modifier_id     uuid not null references menu_modifiers(id) on delete restrict,
  name_snapshot   text not null,
  price_delta_snapshot numeric(12,2) not null
);

create index order_item_modifiers_item_idx on order_item_modifiers(order_item_id);

-- =====================================================================
-- BILL CLAIMS — "Bu kalemi ben ödüyorum" kilitleri
-- =====================================================================

create table bill_claims (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null,
  branch_id           uuid not null,
  table_session_id    uuid not null references table_sessions(id) on delete cascade,
  order_item_id       uuid not null references order_items(id) on delete cascade,
  client_session_id   uuid not null references client_sessions(id) on delete restrict,
  share_ratio         numeric(5,4) not null check (share_ratio > 0 and share_ratio <= 1),
  amount_snapshot     numeric(12,2) not null,  -- claim edildiği andaki pay
  state               bill_claim_state not null default 'held',
  payment_event_id    uuid,                    -- ödendiğinde bağlandığı event
  held_at             timestamptz not null default now(),
  paid_at             timestamptz,
  released_at         timestamptz,
  updated_at          timestamptz not null default now(),
  unique (order_item_id, client_session_id)
);

create index bill_claims_session_idx on bill_claims(table_session_id);
create index bill_claims_order_item_idx on bill_claims(order_item_id);
create index bill_claims_state_idx on bill_claims(state);
create trigger bill_claims_updated_at before update on bill_claims
  for each row execute function set_updated_at();

-- Bir kalemdeki toplam "aktif" (held+paid) share_ratio 1'i geçemez.
-- Bu kontrol yalnızca satır-kilitli RPC içinde güvence altına alınır.

-- =====================================================================
-- PAYMENT EVENTS
-- =====================================================================

create table payment_events (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete restrict,
  branch_id           uuid not null references branches(id) on delete restrict,
  table_session_id    uuid not null references table_sessions(id) on delete restrict,
  type                payment_event_type not null,
  amount              numeric(12,2) not null,
  currency            text not null default 'TRY',
  idempotency_key     text not null,
  pos_reference       text,        -- POS slip no / kasa fişi no
  staff_id            uuid references staff_profiles(id),  -- Faz A'da kasiyer işaretler
  provider            text,        -- Faz B: 'iyzico' | 'paytr'
  provider_ref        text,        -- Faz B: iyzico paymentId
  metadata            jsonb not null default '{}',
  occurred_at         timestamptz not null default now(),
  reversed_by_id      uuid references payment_events(id),  -- iade/düzeltme zinciri
  unique (tenant_id, idempotency_key)
);

create index payment_events_session_idx on payment_events(table_session_id);
create index payment_events_branch_idx on payment_events(branch_id, occurred_at);

alter table bill_claims
  add constraint bill_claims_payment_event_fk
  foreign key (payment_event_id) references payment_events(id) on delete set null;

-- =====================================================================
-- EVENT LOG — kritik mutasyonların audit trail'i
-- =====================================================================

create table event_log (
  id              bigserial primary key,
  tenant_id       uuid,
  branch_id       uuid,
  actor_type      text not null,      -- 'staff' | 'client' | 'system'
  actor_id        uuid,
  action          text not null,      -- 'order.submitted', 'bill_claim.held', ...
  subject_type    text not null,
  subject_id      uuid,
  payload         jsonb not null default '{}',
  occurred_at     timestamptz not null default now()
);

create index event_log_tenant_time_idx on event_log(tenant_id, occurred_at desc);
create index event_log_subject_idx on event_log(subject_type, subject_id);

-- =====================================================================
-- RLS — HEPSİ ENABLED, VARSAYILAN DENY
-- =====================================================================

alter table tenants                    enable row level security;
alter table branches                   enable row level security;
alter table areas                      enable row level security;
alter table tables                     enable row level security;
alter table table_qr_tokens            enable row level security;
alter table menu_categories            enable row level security;
alter table menu_items                 enable row level security;
alter table menu_modifier_groups       enable row level security;
alter table menu_modifiers             enable row level security;
alter table menu_item_modifier_groups  enable row level security;
alter table staff_profiles             enable row level security;
alter table table_sessions             enable row level security;
alter table client_sessions            enable row level security;
alter table orders                     enable row level security;
alter table order_items                enable row level security;
alter table order_item_modifiers       enable row level security;
alter table bill_claims                enable row level security;
alter table payment_events             enable row level security;
alter table event_log                  enable row level security;

-- --- PUBLIC READ: menü (anon key ile) --------------------------------
create policy menu_categories_public_read on menu_categories
  for select to anon, authenticated
  using (active = true);

create policy menu_items_public_read on menu_items
  for select to anon, authenticated
  using (active = true);

create policy menu_modifier_groups_public_read on menu_modifier_groups
  for select to anon, authenticated
  using (true);

create policy menu_modifiers_public_read on menu_modifiers
  for select to anon, authenticated
  using (active = true);

create policy menu_item_modifier_groups_public_read on menu_item_modifier_groups
  for select to anon, authenticated
  using (true);

create policy branches_public_read on branches
  for select to anon, authenticated
  using (deleted_at is null);

-- --- STAFF tablolarına erişim: rol kontrolü --------------------------
-- Şimdilik staff tabloları yalnızca authenticated user'lar içindir.
-- Müşteri akışı server-side (service_role) üzerinden işler; RLS
-- service_role'u bypass eder, güvenlik katmanı server kodundadır.

create policy staff_profiles_self_read on staff_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy tenants_staff_read on tenants
  for select to authenticated
  using (
    exists (
      select 1 from staff_profiles sp
      where sp.user_id = auth.uid() and sp.tenant_id = tenants.id and sp.active
    )
  );

-- Diğer tüm tablolarda authenticated kullanıcılar için okuma yetkisi
-- kendi tenant'ları içinde serbest; yazma yalnızca owner/admin/cashier/kitchen.
-- (Rol bazlı politikalar Faz 1b'de detaylanacak; bugün service_role kullanıyoruz.)

-- --- Sıkı kapalı tablolar: politika yok = default deny ---------------
-- payment_events, bill_claims, order_items, order_item_modifiers, orders,
-- table_sessions, client_sessions, event_log, table_qr_tokens
-- → yalnızca server-side service_role erişir.

-- =====================================================================
-- RPC: bill_claim_hold — kalem bazlı iddia (split payment'ın kalbi)
-- =====================================================================
-- Bu fonksiyon TRANSACTION + ROW LOCK ile yarış koşulunu keser.
-- Çağrısı server-side (service_role) yapılır; authz orada enforce edilir.

create or replace function bill_claim_hold(
  _table_session_id uuid,
  _order_item_id    uuid,
  _client_session_id uuid,
  _share_ratio      numeric
)
returns bill_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item  order_items%rowtype;
  v_used  numeric(6,4);
  v_claim bill_claims%rowtype;
begin
  if _share_ratio <= 0 or _share_ratio > 1 then
    raise exception 'invalid share_ratio: %', _share_ratio using errcode = '22023';
  end if;

  -- Aynı kalemdeki claim'leri LOCK ederek oku; paralel çağrılar sıraya girer.
  select * into v_item
  from order_items
  where id = _order_item_id
    and table_session_id = _table_session_id
  for update;

  if not found then
    raise exception 'order_item not found in session' using errcode = 'P0002';
  end if;

  if v_item.status = 'cancelled' then
    raise exception 'order_item cancelled' using errcode = 'P0001';
  end if;

  select coalesce(sum(share_ratio), 0) into v_used
  from bill_claims
  where order_item_id = _order_item_id
    and state in ('held', 'paid');

  if v_used + _share_ratio > 1.0001 then  -- küçük toleransla
    raise exception 'share exceeds 1 (used=%)', v_used using errcode = 'P0001';
  end if;

  insert into bill_claims (
    tenant_id, branch_id, table_session_id, order_item_id,
    client_session_id, share_ratio, amount_snapshot, state
  )
  values (
    v_item.tenant_id, v_item.branch_id, v_item.table_session_id, v_item.id,
    _client_session_id, _share_ratio,
    round(v_item.line_total * _share_ratio, 2), 'held'
  )
  on conflict (order_item_id, client_session_id) do update
    set share_ratio = excluded.share_ratio,
        amount_snapshot = excluded.amount_snapshot,
        state = 'held',
        released_at = null,
        updated_at = now()
  returning * into v_claim;

  insert into event_log (tenant_id, branch_id, actor_type, actor_id, action, subject_type, subject_id, payload)
  values (v_item.tenant_id, v_item.branch_id, 'client', _client_session_id,
          'bill_claim.held', 'bill_claim', v_claim.id,
          jsonb_build_object('share_ratio', _share_ratio, 'amount', v_claim.amount_snapshot));

  return v_claim;
end;
$$;

-- =====================================================================
-- RPC: bill_claim_release — iddiadan vazgeç
-- =====================================================================
create or replace function bill_claim_release(_claim_id uuid)
returns bill_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim bill_claims%rowtype;
begin
  update bill_claims
     set state = 'released', released_at = now(), updated_at = now()
   where id = _claim_id
     and state = 'held'
   returning * into v_claim;

  if not found then
    raise exception 'claim not releasable' using errcode = 'P0001';
  end if;

  insert into event_log (tenant_id, branch_id, actor_type, action, subject_type, subject_id)
  values (v_claim.tenant_id, v_claim.branch_id, 'client',
          'bill_claim.released', 'bill_claim', v_claim.id);

  return v_claim;
end;
$$;

-- RPC'leri dışa açmıyoruz; service_role zaten her şeyi çağırır.
revoke execute on function bill_claim_hold(uuid, uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function bill_claim_release(uuid) from public, anon, authenticated;
