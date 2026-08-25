-- CCE StableOS v4.21.0 — Sync edited customer name back to booking_requests
-- The Bookings dashboard and the Alerts panel both display and sort by
-- booking_requests.customer_name (preferred over the linked income row's
-- own customer_name), but the Edit Income modal only ever patched the
-- income row. Editing a booking-linked request's customer name therefore
-- had no visible effect anywhere — the old name kept showing. This RPC
-- lets the dashboard update booking_requests.customer_name directly,
-- gated on the existing bookings.update permission.

begin;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regprocedure('public.cce_update_booking_status(bigint,text)') is null then
    raise exception 'CCE v4.7.0 booking foundation must be applied before customer-name sync support';
  end if;
end $$;

create or replace function public.cce_update_booking_customer(
  p_booking_request_id bigint,
  p_customer_name text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_old_name text;
  v_new_name text:=nullif(trim(coalesce(p_customer_name,'')),'');
  v_result jsonb;
begin
  if not public.cce_has_permission('bookings.update') then
    raise exception 'Permission denied';
  end if;
  if v_new_name is null then
    raise exception 'Customer name is required';
  end if;

  select customer_name into v_old_name
  from public.booking_requests
  where id=p_booking_request_id
  for update;
  if not found then raise exception 'Booking request not found'; end if;

  update public.booking_requests
  set customer_name=v_new_name
  where id=p_booking_request_id
  returning jsonb_build_object('id',id,'customer_name',customer_name,'updated_at',updated_at) into v_result;

  if coalesce(v_old_name,'')<>v_new_name then
    insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
    values(
      'User: '||coalesce(auth.uid()::text,'unknown'),
      'update_customer_name','booking_requests',p_booking_request_id::text,
      jsonb_build_object('customer_name',v_old_name),jsonb_build_object('customer_name',v_new_name)
    );
  end if;
  return v_result;
end;
$$;

revoke all on function public.cce_update_booking_customer(bigint,text) from public,anon;
grant execute on function public.cce_update_booking_customer(bigint,text) to authenticated;

comment on function public.cce_update_booking_customer(bigint,text) is
  'Updates the customer name on a booking request. Requires bookings.update; logs before/after to audit_logs.';

commit;
