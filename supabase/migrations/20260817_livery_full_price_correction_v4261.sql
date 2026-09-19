-- CCE StableOS v4.26.1 — Correct the Full Livery backend price to 90 BD
-- v4.24.4 raised the advertised Full Livery price from 80 to 90 BD across
-- the public homepage and the Livery booking form, but never updated the
-- actual price stored in public_booking_services.price_bd — the value
-- cce_public_submit_booking() actually charges. Every Full Livery request
-- submitted since v4.24.4 was recorded at 80 BD instead of 90 BD. This
-- migration corrects the stored price to match what has been advertised.

begin;

do $$
begin
  if to_regclass('public.public_booking_services') is null then
    raise exception 'public_booking_services table must exist before this migration';
  end if;
  if not exists (select 1 from public.public_booking_services where code='livery_full') then
    raise exception 'livery_full service code must exist before this migration';
  end if;
end $$;

update public.public_booking_services
set price_bd=90.000, updated_at=now()
where code='livery_full' and request_type='livery';

commit;
