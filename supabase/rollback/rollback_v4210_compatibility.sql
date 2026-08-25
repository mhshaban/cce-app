-- Compatibility rollback for v4.21.0 (booking customer-name sync RPC).
-- Drops cce_update_booking_customer. No columns, tables or data are
-- affected — this migration only added a new function. Emergency use only.

begin;

drop function if exists public.cce_update_booking_customer(bigint,text);

commit;
