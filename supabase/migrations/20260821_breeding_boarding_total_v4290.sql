-- CCE StableOS v4.29.0 — Breeding agreement: boarding days + computed total
-- The breeding agreement (v4.28.0) records which boarding plan a client
-- chose during the covering cycles (without/with feed), but not how many
-- days of boarding are expected, so the printed agreement could not show
-- a combined total (package price + boarding cost). This adds the day
-- count so the agreement can display: package price, boarding cost
-- (rate x days), and the grand total.

begin;

do $$
begin
  if to_regclass('public.breeding') is null
     or not exists(
       select 1 from information_schema.columns
       where table_schema='public' and table_name='breeding' and column_name='boarding_plan'
     ) then
    raise exception 'v4.28.0 breeding agreement fields must be applied before this migration';
  end if;
end $$;

alter table public.breeding
  add column if not exists boarding_days integer not null default 0;

commit;
