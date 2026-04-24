-- =====================================================================
-- order_submit RPC — cart → DB atomik sipariş yazımı
-- =====================================================================
-- Kritik özellikler:
--  * Fiyat + ad + KDV sipariş anında snapshot'a alınır (menü sonradan değişse
--    bile adisyon değişmez).
--  * Her kalem için modifier'lar da snapshot'a yazılır, modifiers_total
--    hesaplanır.
--  * Aktif olmayan / başka şubedeki ürünler reddedilir.
--  * client_session gerçekten bu table_session'a ait olmalı.
--  * event_log'a 'order.submitted' kaydı atılır.
-- =====================================================================

create or replace function order_submit(
  p_table_session_id uuid,
  p_client_session_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session         table_sessions%rowtype;
  v_order_id        uuid;
  v_order_item_id   uuid;
  v_item            jsonb;
  v_menu            menu_items%rowtype;
  v_mod_total       numeric(12,2);
  v_mod_id          uuid;
  v_mod             menu_modifiers%rowtype;
  v_item_count      int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'too many items in one order' using errcode = '22023';
  end if;

  -- 1) Oturum geçerli mi?
  select * into v_session
    from table_sessions
   where id = p_table_session_id
     and state = 'open';
  if not found then
    raise exception 'table session is not open' using errcode = 'P0001';
  end if;

  -- 2) Client oturumu gerçekten bu masanın mı?
  if not exists (
    select 1 from client_sessions
     where id = p_client_session_id
       and table_session_id = p_table_session_id
  ) then
    raise exception 'client session mismatch' using errcode = 'P0001';
  end if;

  -- 3) Order shell
  insert into orders (tenant_id, branch_id, table_session_id, status, submitted_at, created_by_client)
  values (v_session.tenant_id, v_session.branch_id, v_session.id, 'submitted', now(), p_client_session_id)
  returning id into v_order_id;

  -- 4) Kalemler
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_item_count := v_item_count + 1;

    if (v_item->>'menu_item_id') is null then
      raise exception 'menu_item_id missing on item %', v_item_count using errcode = '22023';
    end if;

    select * into v_menu
      from menu_items
     where id = (v_item->>'menu_item_id')::uuid
       and active
       and branch_id = v_session.branch_id;

    if not found then
      raise exception 'menu item not available (index %)', v_item_count using errcode = 'P0002';
    end if;

    v_mod_total := 0;

    -- Modifier toplamını topla
    if v_item ? 'modifier_ids' and jsonb_typeof(v_item->'modifier_ids') = 'array' then
      for v_mod_id in
        select (value::text)::uuid
          from jsonb_array_elements_text(v_item->'modifier_ids')
      loop
        select * into v_mod
          from menu_modifiers
         where id = v_mod_id and active;
        if not found then
          raise exception 'modifier not available' using errcode = 'P0002';
        end if;
        v_mod_total := v_mod_total + v_mod.price_delta;
      end loop;
    end if;

    insert into order_items (
      order_id, tenant_id, branch_id, table_session_id,
      menu_item_id, created_by_client, qty,
      unit_price_snapshot, vat_rate_snapshot, name_snapshot,
      modifiers_total, notes
    ) values (
      v_order_id, v_menu.tenant_id, v_menu.branch_id, v_session.id,
      v_menu.id, p_client_session_id,
      greatest(1, coalesce((v_item->>'qty')::int, 1)),
      v_menu.base_price, v_menu.vat_rate, v_menu.name,
      v_mod_total,
      nullif(v_item->>'notes', '')
    )
    returning id into v_order_item_id;

    -- Seçilen modifier'ları snapshot'la
    if v_item ? 'modifier_ids' and jsonb_typeof(v_item->'modifier_ids') = 'array' then
      for v_mod_id in
        select (value::text)::uuid
          from jsonb_array_elements_text(v_item->'modifier_ids')
      loop
        select * into v_mod from menu_modifiers where id = v_mod_id;
        insert into order_item_modifiers (order_item_id, modifier_id, name_snapshot, price_delta_snapshot)
        values (v_order_item_id, v_mod.id, v_mod.name, v_mod.price_delta);
      end loop;
    end if;
  end loop;

  -- 5) Audit
  insert into event_log (tenant_id, branch_id, actor_type, actor_id, action, subject_type, subject_id, payload)
  values (v_session.tenant_id, v_session.branch_id, 'client', p_client_session_id,
          'order.submitted', 'order', v_order_id,
          jsonb_build_object('item_count', v_item_count));

  return v_order_id;
end;
$$;

revoke execute on function order_submit(uuid, uuid, jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
