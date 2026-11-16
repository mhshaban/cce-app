-- CCE StableOS v4.38.0 — Movement & lameness log preflight
-- Every *_ready column must be true. existing_tables should be 0 on a first run.

select
  to_regclass('public.horse_health_events') is not null as health_events_ready,
  to_regclass('public.schedule') is not null as schedule_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as has_permission_ready,
  to_regprocedure('public.cce_touch_updated_at()') is not null as touch_ready,
  to_regclass('storage.buckets') is not null as storage_ready,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('horse_movement_logs','horse_ride_checks')) as existing_tables,
  (select string_agg(r.code,',' order by r.code) from public.app_roles r
    join public.role_permissions rp on rp.role_id=r.id and rp.allowed
    where rp.permission_code='horse_care.manage') as roles_that_can_record;
