-- CCE StableOS v4.27.0 — Horse Lease booking type preflight

select
  to_regclass('public.public_booking_services') is not null as services_ready,
  to_regclass('public.booking_requests') is not null as booking_requests_ready,
  to_regclass('public.horses') is not null as horses_ready,
  not exists(select 1 from public.public_booking_services where code='lease_request') as lease_service_not_yet_added,
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='horses' and column_name='lease_active'
  ) as lease_columns_not_yet_added;

do $$
begin
  if to_regclass('public.public_booking_services') is null
     or to_regclass('public.booking_requests') is null
     or to_regclass('public.horses') is null
     or to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is null then
    raise exception 'CCE public booking foundation must be applied before this migration';
  end if;
end $$;
