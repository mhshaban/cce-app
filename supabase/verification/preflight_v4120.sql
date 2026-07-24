-- CCE StableOS v4.12.0 — Show Office Sprint 4 preflight

select
  to_regclass('public.show_office_entries') is not null as entries_ready,
  to_regclass('public.show_office_classes') is not null as classes_ready,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as v411_restore_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permissions_ready;

select
  to_regclass('public.show_office_class_judging') is not null as judging_table_already_exists,
  to_regclass('public.show_office_entry_rounds') is not null as score_table_already_exists,
  to_regclass('public.show_office_score_revisions') is not null as audit_table_already_exists,
  case when to_regclass('public.show_office_entry_rounds') is null
    then 'Ready for first Sprint 4 application'
    else 'Existing Sprint 4 tables detected — data guard will validate them before reapplying'
  end as note;

do $$
declare v_invalid bigint;
begin
  if to_regclass('public.show_office_class_judging') is null
     and to_regclass('public.show_office_entry_rounds') is null
     and to_regclass('public.show_office_score_revisions') is null then
    return;
  end if;
  if to_regclass('public.show_office_class_judging') is null
     or to_regclass('public.show_office_entry_rounds') is null
     or to_regclass('public.show_office_score_revisions') is null then
    raise exception 'Sprint 4 preflight found an incomplete set of existing judging tables';
  end if;

  execute $check$
    select count(*)
    from public.show_office_class_judging j
    left join public.show_office_classes cl on cl.id=j.class_id
    where cl.id is null
       or j.status not in ('Not Started','Running','Finalized')
       or j.scoring_profile<>'faults_then_time'
       or length(trim(j.ruleset_version))=0
       or char_length(trim(j.ruleset_version))>80
       or (j.status='Finalized' and j.finalized_at is null)
       or (j.status<>'Finalized' and (j.finalized_at is not null or j.finalized_by is not null))
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 4 preflight found % invalid existing class judging rows',v_invalid;
  end if;

  execute $check$
    select count(*)
    from public.show_office_entry_rounds r
    left join public.show_office_entries e on e.id=r.entry_id
    where e.id is null
       or r.phase not in ('first_round','jump_off')
       or r.row_version<=0
       or r.refusals not between 0 and 9
       or (r.time_ms is not null and (r.time_ms<=0 or r.time_ms>86400000))
       or (r.faults is not null and (r.faults<0 or r.faults>999999.99))
       or (case when r.eliminated then 1 else 0 end)
          +(case when r.retired then 1 else 0 end)
          +(case when r.did_not_start then 1 else 0 end)>1
       or (not r.eliminated and not r.retired and not r.did_not_start
           and (r.time_ms is null or r.faults is null))
       or (r.did_not_start and (r.time_ms is not null or r.faults is not null or r.refusals<>0))
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 4 preflight found % invalid existing score rows',v_invalid;
  end if;

  execute $check$
    select count(*) from (
      select entry_id,phase
      from public.show_office_entry_rounds
      group by entry_id,phase
      having count(*)>1
    ) duplicate_scores
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 4 preflight found % duplicated entry/phase scores',v_invalid;
  end if;
end $$;
