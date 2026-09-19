-- CCE StableOS v4.27.0 — Horse Lease booking type verification

select code,request_type,price_bd,active from public.public_booking_services where code='lease_request';
-- Expected: one row, request_type='lease', price_bd=0.000, active=true.

select pg_get_constraintdef(oid) from pg_constraint where conname='public_booking_services_request_type_check';
select pg_get_constraintdef(oid) from pg_constraint where conname='booking_requests_request_type_check';
-- Expected: both include 'lease' in the allowed list.

select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='horses'
  and column_name in (
    'lease_active','lease_customer_name','lease_cpr','lease_address','lease_mobile',
    'lease_monthly_price','lease_farrier_share','lease_farrier_weeks','lease_farrier_name',
    'lease_trainer_name','lease_start_date'
  )
order by column_name;
-- Expected: 11 rows. lease_active default false, lease_monthly_price default 0, rest nullable with no default.
