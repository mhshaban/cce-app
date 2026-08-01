-- CCE StableOS v4.18.0 — Booking delete RPC preflight

select
  to_regclass('public.booking_requests') is not null as booking_requests_ready,
  to_regprocedure('public.cce_update_booking_status(bigint,text)') is not null as update_status_ready,
  to_regprocedure('public.cce_delete_booking_request(bigint)') is null as delete_rpc_not_yet_added;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regprocedure('public.cce_update_booking_status(bigint,text)') is null then
    raise exception 'CCE v4.7.0 booking foundation must be applied before delete support';
  end if;
end $$;
