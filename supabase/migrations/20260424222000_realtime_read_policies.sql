-- =====================================================================
-- Realtime için anon okuma politikaları
-- Faz A: müşteri tarayıcısı anon key ile order_items'ı dinler.
--   Supabase realtime payload'u RLS'e tabi; SELECT yoksa event gitmez.
-- Faz 2'de tighten: custom JWT ile table_session_id scope'u.
-- =====================================================================

create policy order_items_realtime_read on order_items
  for select to anon, authenticated
  using (true);

create policy orders_realtime_read on orders
  for select to anon, authenticated
  using (true);

create policy bill_claims_realtime_read on bill_claims
  for select to anon, authenticated
  using (true);

create policy payment_events_realtime_read on payment_events
  for select to anon, authenticated
  using (true);

notify pgrst, 'reload schema';
