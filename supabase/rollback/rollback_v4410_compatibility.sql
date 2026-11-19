-- CCE StableOS v4.41.0 — non-destructive rollback
-- Removes only the staff booking RPC. Bookings and income rows created with it stay.
begin;
revoke all on function public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric) from public,anon,authenticated;
drop function if exists public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric);
commit;
