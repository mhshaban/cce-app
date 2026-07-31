-- CCE StableOS v4.17.0 — Booking payment deadline preflight

select
  to_regclass('public.booking_requests') is not null as booking_requests_ready,
  to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is not null
    as submit_booking_ready,
  to_regprocedure('public.cce_update_booking_status(bigint,text)') is not null as update_status_ready,
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='booking_requests' and column_name='payment_due_at'
  ) as payment_due_at_not_yet_added;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is null
     or to_regprocedure('public.cce_update_booking_status(bigint,text)') is null then
    raise exception 'CCE v4.7.0 booking foundation must be applied before the payment deadline';
  end if;
end $$;
