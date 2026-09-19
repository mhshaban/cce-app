-- CCE StableOS v4.29.0 — Breeding boarding total preflight

select
  to_regclass('public.breeding') is not null as breeding_ready,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='breeding' and column_name='boarding_plan'
  ) as v4280_ready,
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='breeding' and column_name='boarding_days'
  ) as column_not_yet_added;

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
