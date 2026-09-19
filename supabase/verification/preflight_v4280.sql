-- CCE StableOS v4.28.0 — Breeding agreement preflight

select
  to_regclass('public.breeding') is not null as breeding_ready,
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='breeding' and column_name='stallion_name'
  ) as columns_not_yet_added;

do $$
begin
  if to_regclass('public.breeding') is null then
    raise exception 'breeding table must exist before this migration';
  end if;
end $$;
