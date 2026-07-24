-- CCE StableOS v4.14.0 — fence-by-fence scoring preflight

select
  to_regclass('public.show_office_classes') is not null as classes_ready,
  to_regclass('public.show_office_entry_rounds') is not null as rounds_ready,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_ready,
  to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is not null as class_restore_ready,
  to_regclass('public.show_office_entry_fences') is not null as fences_table_already_exists;

do $$
begin
  if to_regclass('public.show_office_classes') is null
     or to_regclass('public.show_office_entry_rounds') is null
     or to_regprocedure('public.cce_show_office_judge_panel(bigint)') is null
     or to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is null then
    raise exception 'Show Office v4.13.0 must be applied before fence scoring preflight can pass';
  end if;
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='show_office_classes'
      and column_name in ('fence_count','knockdown_fault_value','refusal_fault_value','refusals_before_elimination')
  ) then
    raise notice 'Fence rule columns already exist on show_office_classes — the guard below validates existing data.';
  end if;
end $$;

do $$
declare v_invalid bigint;
begin
  if to_regclass('public.show_office_entry_fences') is null then
    return;
  end if;
  execute $check$
    select count(*)
    from public.show_office_entry_fences f
    left join public.show_office_entries e on e.id=f.entry_id
    where e.id is null
       or f.phase not in ('first_round','jump_off')
       or f.incident not in ('clear','knockdown','refusal')
       or f.fault_value<0 or f.fault_value>999.99
       or f.row_version<=0
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Fence scoring preflight found % invalid existing fence rows',v_invalid;
  end if;
end $$;
