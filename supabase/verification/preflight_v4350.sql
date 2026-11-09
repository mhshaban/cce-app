-- CCE StableOS v4.35.0 — Bran stock preflight
-- Every *_ready column must be true; account_horses should be 5
-- (Abdulla Al Zarqi and Hashem's Available horses).

select
  to_regclass('public.app_permissions') is not null as permissions_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as has_permission_ready,
  to_regprocedure('public.cce_touch_updated_at()') is not null as touch_ready,
  (select count(*) from public.horses where status='Available' and lower(trim(owner)) in ('abdulla al zarqi','hashem')) as account_horses,
  (select count(*) from public.horses where status='Available') as available_horses;
