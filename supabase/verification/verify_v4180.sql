-- CCE StableOS v4.18.0 — Booking delete RPC verification

select
  to_regprocedure('public.cce_delete_booking_request(bigint)') is not null as delete_rpc_exists,
  has_function_privilege('authenticated','public.cce_delete_booking_request(bigint)','EXECUTE')
    as authenticated_can_delete,
  not has_function_privilege('anon','public.cce_delete_booking_request(bigint)','EXECUTE')
    as anon_cannot_delete;

select obj_description('public.cce_delete_booking_request(bigint)'::regprocedure) ilike '%bookings.delete%'
  as delete_comment_present;

-- No columns or tables were dropped.
select
  count(*)>0 as booking_requests_columns_intact
from information_schema.columns
where table_schema='public' and table_name='booking_requests' and column_name='status';
