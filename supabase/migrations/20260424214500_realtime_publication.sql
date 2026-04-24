-- =====================================================================
-- Realtime publication — Supabase'in Postgres change stream'ine
-- hangi tabloların yayın yapacağını belirler.
-- =====================================================================
-- Not: sadece UI'da canlı izlenen tablolar; event_log gibi audit
-- tabloları realtime'a gerek duymaz.

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table bill_claims;
alter publication supabase_realtime add table payment_events;
alter publication supabase_realtime add table table_sessions;
