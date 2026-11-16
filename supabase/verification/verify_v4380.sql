-- CCE StableOS v4.38.0 — Movement & lameness log verification
-- Expected: both tables with RLS on, 4 policies each, the private
-- horse-media bucket (50 MB, images and videos) and its 3 storage policies.

select
  (select count(*) from pg_class where relname in ('horse_movement_logs','horse_ride_checks') and relrowsecurity) as tables_with_rls,
  (select count(*) from pg_policies where schemaname='public' and tablename='horse_movement_logs') as log_policies,
  (select count(*) from pg_policies where schemaname='public' and tablename='horse_ride_checks') as check_policies,
  (select row(public,file_size_limit,allowed_mime_types)::text from storage.buckets where id='horse-media') as bucket,
  (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'cce_horse_media_%') as media_policies,
  to_regprocedure('public.cce_movement_horses()') is not null as horse_picker_ready;
