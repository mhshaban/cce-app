-- CCE StableOS v4.17.0 — Booking payment deadline verification

select
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='booking_requests' and column_name='payment_due_at'
      and data_type='timestamp with time zone'
  ) as payment_due_at_column_ready,
  to_regprocedure('public.cce_expire_stale_booking_requests()') is not null as expire_rpc_exists,
  to_regprocedure('public.cce_list_booking_requests()') is not null as list_rpc_exists,
  has_function_privilege('authenticated','public.cce_expire_stale_booking_requests()','EXECUTE')
    as authenticated_can_expire,
  not has_function_privilege('anon','public.cce_expire_stale_booking_requests()','EXECUTE')
    as anon_cannot_expire,
  has_function_privilege('authenticated','public.cce_list_booking_requests()','EXECUTE')
    as authenticated_can_list,
  not has_function_privilege('anon','public.cce_list_booking_requests()','EXECUTE')
    as anon_cannot_list;

select obj_description('public.cce_expire_stale_booking_requests()'::regprocedure) ilike '%payment_due_at%'
  as expire_comment_present;
select obj_description('public.cce_list_booking_requests()'::regprocedure) ilike '%Expires%'
  as list_comment_present;

-- No columns or tables were dropped.
select
  count(*)>0 as booking_requests_columns_intact
from information_schema.columns
where table_schema='public' and table_name='booking_requests' and column_name='status';
