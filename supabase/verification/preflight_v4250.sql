-- CCE StableOS v4.25.0 — Per-horse livery add-ons preflight

select
  to_regclass('public.horses') is not null as horses_ready,
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='horses' and column_name='extra_shower'
  ) as columns_not_yet_added;

do $$
begin
  if to_regclass('public.horses') is null then
    raise exception 'horses table must exist before this migration';
  end if;
end $$;
