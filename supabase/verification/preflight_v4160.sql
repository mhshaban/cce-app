-- CCE StableOS v4.16.0 — Joker alternate fence choice preflight

select
  to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null
    as toggle_fence_v4140_signature_ready,
  exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='cce_save_show_office_fence_score'
      and obj_description(p.oid,'pg_proc') ilike '%only the Joker fence%'
  ) as v4151_fix_applied,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='show_office_classes' and column_name='joker_fence_number'
  ) as joker_column_ready;

do $$
begin
  if to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is null
     or not exists(
       select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='cce_save_show_office_fence_score'
         and obj_description(p.oid,'pg_proc') ilike '%only the Joker fence%'
     )
     or not exists(
       select 1 from information_schema.columns
       where table_schema='public' and table_name='show_office_classes' and column_name='joker_fence_number'
     ) then
    raise exception 'Show Office v4.15.1 must be applied before the Joker alternate-fence choice';
  end if;
end $$;
