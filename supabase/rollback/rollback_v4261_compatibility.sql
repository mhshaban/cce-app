-- Compatibility rollback for v4.26.1 (Full Livery price correction).
-- Restores the pre-v4.24.4 price of 80 BD. Emergency use only — this
-- reintroduces the mismatch between the advertised price (90 BD, shown
-- on the homepage and booking form since v4.24.4) and the price actually
-- charged, so only use this if v4.24.4's price change itself needs to be
-- reverted at the same time.

begin;

update public.public_booking_services
set price_bd=80.000, updated_at=now()
where code='livery_full' and request_type='livery';

commit;
