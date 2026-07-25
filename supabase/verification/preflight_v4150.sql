-- CCE StableOS v4.15.0 — Accumulator with Joker preflight

select
  to_regclass('public.show_office_classes') is not null as classes_ready,
  to_regclass('public.show_office_entry_rounds') is not null as rounds_ready,
  to_regclass('public.show_office_entry_fences') is not null as fences_ready,
  to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null
    as toggle_rpc_ready,
  to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is not null
    as confirm_rpc_ready,
  to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is not null as class_restore_ready;

do $$
begin
  if to_regclass('public.show_office_classes') is null
     or to_regclass('public.show_office_entry_fences') is null
     or to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is null
     or to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is null then
    raise exception 'Show Office v4.14.0 must be applied before Accumulator with Joker preflight can pass';
  end if;
end $$;
