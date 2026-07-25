-- CCE StableOS v4.15.1 — Joker doubling fix preflight

select
  to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is not null
    as confirm_rpc_ready,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='show_office_classes' and column_name='joker_fence_number'
  ) as joker_column_ready;

do $$
begin
  if to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is null
     or not exists(
       select 1 from information_schema.columns
       where table_schema='public' and table_name='show_office_classes' and column_name='joker_fence_number'
     ) then
    raise exception 'Show Office v4.15.0 must be applied before the Joker doubling fix';
  end if;
end $$;
