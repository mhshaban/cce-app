-- Compatibility rollback for v4.18.0 (booking delete RPC).
-- Drops cce_delete_booking_request. No columns, tables or data are
-- affected — this migration only added a new function. Emergency use only.

begin;

drop function if exists public.cce_delete_booking_request(bigint);

commit;
