-- CCE StableOS v4.39.0 — Video movement analysis verification
-- Expected: table with RLS on and 4 policies.

select
  (select relrowsecurity from pg_class where oid='public.horse_gait_analyses'::regclass) as rls_on,
  (select count(*) from pg_policies where schemaname='public' and tablename='horse_gait_analyses') as policies;
