-- =====================================================================
-- client_sessions'ı realtime'a dahil et + anon okuma politikası
-- Müşteriler masadaki nickname'leri birbirlerinin anında görsün diye.
-- =====================================================================

alter publication supabase_realtime add table client_sessions;

create policy client_sessions_public_read on client_sessions
  for select to anon, authenticated
  using (true);

notify pgrst, 'reload schema';
