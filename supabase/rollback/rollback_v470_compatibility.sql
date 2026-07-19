-- CCE StableOS v4.7.0 — emergency compatibility rollback
--
-- Use only if the v4.7.0 database migration has been applied but the website
-- must temporarily return to v4.6.5. This does not delete new tables or booking
-- data. It reopens the legacy anonymous income insert path, so it weakens the
-- v4.7.0 security model and must be removed again as soon as the new UI works.

begin;

do $$
declare v_income_seq text;
begin
  if to_regclass('public.income') is null then
    raise exception 'public.income is missing';
  end if;
  grant insert on public.income to anon;
  v_income_seq:=pg_get_serial_sequence('public.income','id');
  if v_income_seq is not null then
    execute format('grant usage on sequence %s to anon',v_income_seq);
  end if;
end $$;

drop policy if exists cce_income_public_insert on public.income;
create policy cce_income_public_insert on public.income for insert to anon
with check (
  coalesce(status,'Pending')='Pending'
  and coalesce(paid_bd,0)=0
  and public.cce_is_booking_record(notes)
);

comment on policy cce_income_public_insert on public.income is
  'TEMPORARY v4.6.5 compatibility policy. Remove after restoring the v4.7.0 website.';

commit;
