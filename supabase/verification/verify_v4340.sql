-- CCE StableOS v4.34.0 — Paddock board verification
-- Expected: functions_ready=true, permissions=2, rls_enabled=true,
-- paddock_overlaps=0 and horse_overlaps=0. seeded_slots is 24 on a stable
-- whose 21 seed horses all match (21 horse slots + 3 stable sessions).

select
  to_regprocedure('public.cce_paddock_board()') is not null
  and to_regprocedure('public.cce_paddock_save_slot(bigint,text,time,time,text,bigint,text)') is not null
  and to_regprocedure('public.cce_paddock_delete_slot(bigint)') is not null as functions_ready,
  (select count(*) from public.app_permissions where code in ('paddocks.view','paddocks.manage')) as permissions,
  (select relrowsecurity from pg_class where oid='public.paddock_slots'::regclass) as rls_enabled,
  (select count(*) from public.paddock_slots) as seeded_slots,
  (select count(*) from public.paddock_slots a join public.paddock_slots b
     on a.id<b.id and a.paddock=b.paddock and a.start_time<b.end_time and a.end_time>b.start_time) as paddock_overlaps,
  (select count(*) from public.paddock_slots a join public.paddock_slots b
     on a.id<b.id and a.horse_id=b.horse_id and a.start_time<b.end_time and a.end_time>b.start_time) as horse_overlaps;
