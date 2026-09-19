-- CCE StableOS v4.26.1 — Full Livery price correction preflight

select
  to_regclass('public.public_booking_services') is not null as table_ready,
  (select price_bd from public.public_booking_services where code='livery_full') as current_livery_full_price;
-- Expected: current_livery_full_price = 80.000 before this migration is applied.

do $$
begin
  if to_regclass('public.public_booking_services') is null then
    raise exception 'public_booking_services table must exist before this migration';
  end if;
  if not exists (select 1 from public.public_booking_services where code='livery_full') then
    raise exception 'livery_full service code must exist before this migration';
  end if;
end $$;
