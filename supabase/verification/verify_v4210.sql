-- CCE StableOS v4.21.0 — Booking customer-name sync RPC verification

select
  to_regprocedure('public.cce_update_booking_customer(bigint,text)') is not null as sync_rpc_exists,
  has_function_privilege('authenticated','public.cce_update_booking_customer(bigint,text)','EXECUTE')
    as authenticated_can_sync,
  not has_function_privilege('anon','public.cce_update_booking_customer(bigint,text)','EXECUTE')
    as anon_cannot_sync;

select obj_description('public.cce_update_booking_customer(bigint,text)'::regprocedure) ilike '%bookings.update%'
  as sync_comment_present;

-- No columns or tables were dropped.
select
  count(*)>0 as booking_requests_columns_intact
from information_schema.columns
where table_schema='public' and table_name='booking_requests' and column_name='customer_name';
