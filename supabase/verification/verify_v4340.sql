-- CCE StableOS v4.34.0 — Daily paddock schedule verification
-- Expected: 46 slots (27 morning, 19 evening), 21 with a horse, 3 reserved
-- CCE sessions, RLS on, and both permissions present.

select
  (select count(*) from public.paddock_slots) as slots,
  (select count(*) from public.paddock_slots where period='morning') as morning,
  (select count(*) from public.paddock_slots where period='evening') as evening,
  (select count(*) from public.paddock_slots where horse_id is not null) as with_horse,
  (select count(*) from public.paddock_slots where slot_type='stable') as cce_sessions,
  (select relrowsecurity from pg_class where oid='public.paddock_slots'::regclass) as rls_on,
  (select count(*) from public.app_permissions where code in ('paddocks.view','paddocks.manage')) as permissions;
