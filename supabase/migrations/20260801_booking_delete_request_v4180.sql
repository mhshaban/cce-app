-- CCE StableOS v4.18.0 — Manager-only delete for booking requests
-- Duplicate/test booking requests submitted through the public forms had
-- no delete option in the Bookings dashboard — the row-actions Delete
-- button only ever appeared for legacy income-only rows with no linked
-- booking_requests record. cce_delete_booking_request atomically removes
-- both the booking_requests row (booking_private_details cascades) and
-- its linked income row, gated on the existing bookings.delete permission.

begin;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regprocedure('public.cce_update_booking_status(bigint,text)') is null then
    raise exception 'CCE v4.7.0 booking foundation must be applied before delete support';
  end if;
end $$;

create or replace function public.cce_delete_booking_request(p_booking_request_id bigint)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_before jsonb;
  v_income_deleted integer;
begin
  if not public.cce_has_permission('bookings.delete') then
    raise exception 'Permission denied' using errcode='42501';
  end if;

  select to_jsonb(br) into v_before
  from public.booking_requests br
  where br.id=p_booking_request_id
  for update;
  if v_before is null then
    raise exception 'Booking request not found' using errcode='P0002';
  end if;

  with removed as (
    delete from public.income where booking_request_id=p_booking_request_id returning id
  )
  select count(*) into v_income_deleted from removed;

  delete from public.booking_requests where id=p_booking_request_id;

  insert into public.audit_logs(actor,action,table_name,record_id,before_data)
  values(
    'User: '||coalesce(auth.uid()::text,'unknown'),
    'delete','booking_requests',p_booking_request_id::text,v_before
  );

  return jsonb_build_object(
    'booking_request_id',p_booking_request_id,
    'income_rows_deleted',v_income_deleted,
    'deleted',true
  );
end;
$$;

revoke all on function public.cce_delete_booking_request(bigint) from public,anon;
grant execute on function public.cce_delete_booking_request(bigint) to authenticated;

comment on function public.cce_delete_booking_request(bigint) is
  'Deletes a booking request and its linked income row together (booking_private_details cascades). Requires bookings.delete; logs a before-image to audit_logs.';

commit;
