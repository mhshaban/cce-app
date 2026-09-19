-- CCE StableOS v4.26.1 — Full Livery price correction verification

select code, price_bd from public.public_booking_services where code='livery_full';
-- Expected: price_bd = 90.000
