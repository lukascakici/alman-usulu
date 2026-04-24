-- =====================================================================
-- Schema cache reload + safety grants
-- PostgREST yeni tabloları bazen geç cache'ler; notify reload bunu zorlar.
-- Grant'ler zaten default'ta var ama idempotent olarak tekrar verilir.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Gelecekte eklenecek tablolar için varsayılan yetkiler
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

notify pgrst, 'reload schema';
