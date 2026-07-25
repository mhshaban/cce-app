-- CCE StableOS v4.15.0 compatibility rollback
-- Restores the v4.14.0 fence-scoring, Judge Panel and class-restore contracts
-- (table_a only, no points/Joker). The new scoring_format, joker_fence_number
-- and points columns and any data already entered are kept untouched so
-- v4.15.0 can be re-applied safely.

begin;

create or replace function public.cce_save_show_office_fence_score(
  p_entry_id bigint,p_phase text,p_time_ms integer,
  p_eliminated boolean default false,p_retired boolean default false,p_did_not_start boolean default false,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_phase text:=lower(trim(coalesce(p_phase,'')));
  v_class_id bigint;
  v_jump_off boolean;
  v_fence_count smallint;
  v_refusal_threshold smallint;
  v_competition_status text;
  v_judging_status text;
  v_existing_id bigint;
  v_existing_version integer;
  v_flags integer;
  v_fence_faults numeric(10,2);
  v_fence_refusals integer;
  v_eliminated boolean;
  v_result jsonb;
begin
  if not public.cce_has_permission('show_office.judging.score') then
    raise exception 'Permission denied: Show Office judging score permission is required'
      using errcode='42501';
  end if;
  select cl.id,cl.jump_off,cl.fence_count,cl.refusals_before_elimination,c.status
    into v_class_id,v_jump_off,v_fence_count,v_refusal_threshold,v_competition_status
  from public.show_office_entries e
  join public.show_office_classes cl on cl.id=e.class_id
  join public.show_office_competitions c on c.id=cl.competition_id
  where e.id=p_entry_id;
  if v_class_id is null then raise exception 'Show Office entry was not found' using errcode='P0002'; end if;
  if v_fence_count is null then
    raise exception 'This class does not use fence-by-fence scoring' using errcode='22023';
  end if;
  if v_competition_status<>'Running' then
    raise exception 'Competition must be Running before scores can be recorded' using errcode='22023';
  end if;
  if v_phase not in ('first_round','jump_off') then
    raise exception 'Score phase must be first_round or jump_off' using errcode='22023';
  end if;
  if v_phase='jump_off' and not v_jump_off then
    raise exception 'This class does not allow a Jump-Off' using errcode='22023';
  end if;
  v_flags:=(case when coalesce(p_eliminated,false) then 1 else 0 end)
    +(case when coalesce(p_retired,false) then 1 else 0 end)
    +(case when coalesce(p_did_not_start,false) then 1 else 0 end);
  if v_flags>1 then
    raise exception 'Eliminated, Retired and DNS are mutually exclusive' using errcode='22023';
  end if;
  if v_phase='jump_off' and not exists(
    select 1 from public.show_office_entry_rounds
    where entry_id=p_entry_id and phase='first_round'
      and not eliminated and not retired and not did_not_start
  ) then
    raise exception 'A valid first-round score is required before the Jump-Off' using errcode='22023';
  end if;

  select coalesce(sum(fault_value),0),count(*) filter(where incident='refusal')
    into v_fence_faults,v_fence_refusals
  from public.show_office_entry_fences
  where entry_id=p_entry_id and phase=v_phase;

  v_eliminated:=coalesce(p_eliminated,false) or (v_flags=0 and v_fence_refusals>=v_refusal_threshold);
  if v_eliminated and v_flags=0 then v_flags:=1; end if;

  if v_flags=0 and (p_time_ms is null or p_time_ms<=0 or p_time_ms>86400000) then
    raise exception 'A completed score requires a valid time' using errcode='22023';
  end if;

  insert into public.show_office_class_judging(class_id,status)
  values(v_class_id,'Running') on conflict(class_id) do nothing;
  select status into v_judging_status
  from public.show_office_class_judging where class_id=v_class_id for update;
  if v_judging_status='Finalized' then
    raise exception 'Class results are finalized and locked' using errcode='55000';
  end if;
  if v_judging_status='Not Started' then
    update public.show_office_class_judging set status='Running' where class_id=v_class_id;
  end if;

  select id,row_version into v_existing_id,v_existing_version
  from public.show_office_entry_rounds
  where entry_id=p_entry_id and phase=v_phase
  for update;
  if v_existing_id is null then
    if coalesce(p_expected_version,0)<>0 then
      raise exception 'Score changed on another device; reload before saving'
        using errcode='40001';
    end if;
    insert into public.show_office_entry_rounds(
      entry_id,phase,time_ms,faults,refusals,eliminated,retired,did_not_start
    ) values(
      p_entry_id,v_phase,
      case when v_flags=0 then p_time_ms else null end,
      case when v_flags=0 then v_fence_faults else null end,
      case when coalesce(p_did_not_start,false) then 0 else v_fence_refusals end,
      v_eliminated,coalesce(p_retired,false),coalesce(p_did_not_start,false)
    ) returning id into v_existing_id;
  else
    if p_expected_version is null or p_expected_version<>v_existing_version then
      raise exception 'Score changed on another device; reload before saving'
        using errcode='40001';
    end if;
    update public.show_office_entry_rounds set
      time_ms=case when v_flags=0 then p_time_ms else null end,
      faults=case when v_flags=0 then v_fence_faults else null end,
      refusals=case when coalesce(p_did_not_start,false) then 0 else v_fence_refusals end,
      eliminated=v_eliminated,
      retired=coalesce(p_retired,false),
      did_not_start=coalesce(p_did_not_start,false)
    where id=v_existing_id and row_version=p_expected_version;
    if not found then
      raise exception 'Score changed on another device; reload before saving'
        using errcode='40001';
    end if;
  end if;
  select to_jsonb(r) into strict v_result
  from public.show_office_entry_rounds r where r.id=v_existing_id;
  return v_result;
end;
$$;

create or replace function public.cce_show_office_judge_panel(p_class_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_class jsonb;
  v_rows jsonb;
  v_jump_off boolean;
  v_fence_count smallint;
begin
  if not (
    public.cce_has_permission('show_office.view')
    or public.cce_has_permission('show_office.results.view')
    or public.cce_has_permission('show_office.judging.view')
    or public.cce_has_permission('show_office.judging.score')
    or public.cce_has_permission('show_office.judging.finalize')
    or public.cce_has_permission('show_office.judging.reopen')
  ) then
    raise exception 'Permission denied: Show Office judging view permission is required'
      using errcode='42501';
  end if;
  select cl.jump_off,cl.fence_count,jsonb_build_object(
    'competition_id',c.id,'competition_name',c.competition_name,
    'competition_date',c.competition_date,'competition_status',c.status,
    'class_id',cl.id,'class_number',cl.class_number,'class_name',cl.class_name,
    'height_cm',cl.height_cm,'competition_type',cl.competition_type,
    'allowed_time_seconds',cl.allowed_time_seconds,
    'time_limit_seconds',cl.time_limit_seconds,'jump_off',cl.jump_off,
    'fence_count',cl.fence_count,'knockdown_fault_value',cl.knockdown_fault_value,
    'refusal_fault_value',cl.refusal_fault_value,
    'refusals_before_elimination',cl.refusals_before_elimination,
    'judging_status',coalesce(j.status,'Not Started'),
    'scoring_profile',coalesce(j.scoring_profile,'faults_then_time'),
    'ruleset_version',coalesce(j.ruleset_version,'CCE 2026'),
    'finalized_at',j.finalized_at
  ) into v_jump_off,v_fence_count,v_class
  from public.show_office_classes cl
  join public.show_office_competitions c on c.id=cl.competition_id
  left join public.show_office_class_judging j on j.class_id=cl.id
  where cl.id=p_class_id;
  if v_class is null then
    raise exception 'Show Office class was not found' using errcode='P0002';
  end if;

  with base as (
    select
      e.id as entry_id,e.entry_ref,e.start_number,
      r.rider_name,h.horse_name,s.stable_name,
      fr.id as fr_id,fr.result_ref as fr_ref,fr.time_ms as fr_time,fr.faults as fr_faults,
      fr.refusals as fr_refusals,fr.eliminated as fr_eliminated,
      fr.retired as fr_retired,fr.did_not_start as fr_dns,fr.row_version as fr_version,
      jo.id as jo_id,jo.result_ref as jo_ref,jo.time_ms as jo_time,jo.faults as jo_faults,
      jo.refusals as jo_refusals,jo.eliminated as jo_eliminated,
      jo.retired as jo_retired,jo.did_not_start as jo_dns,jo.row_version as jo_version,
      fr_fences.fences as fr_fences,jo_fences.fences as jo_fences,
      (
        fr.id is not null
        and not fr.eliminated and not fr.retired and not fr.did_not_start
        and (jo.id is null or (not jo.eliminated and not jo.retired and not jo.did_not_start))
      ) as rankable
    from public.show_office_entries e
    join public.show_office_riders r on r.id=e.rider_id
    join public.show_office_horses h on h.id=e.horse_id
    left join public.show_office_stables s on s.id=e.stable_id
    left join public.show_office_entry_rounds fr
      on fr.entry_id=e.id and fr.phase='first_round'
    left join public.show_office_entry_rounds jo
      on jo.entry_id=e.id and jo.phase='jump_off'
    left join lateral (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fence_number',gs.fence_number,'incident',coalesce(ef.incident,'clear'),
        'row_version',coalesce(ef.row_version,0)
      ) order by gs.fence_number),'[]'::jsonb) as fences
      from generate_series(1,coalesce(v_fence_count,0)) as gs(fence_number)
      left join public.show_office_entry_fences ef
        on ef.entry_id=e.id and ef.phase='first_round' and ef.fence_number=gs.fence_number
    ) fr_fences on true
    left join lateral (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fence_number',gs.fence_number,'incident',coalesce(ef.incident,'clear'),
        'row_version',coalesce(ef.row_version,0)
      ) order by gs.fence_number),'[]'::jsonb) as fences
      from generate_series(1,coalesce(v_fence_count,0)) as gs(fence_number)
      left join public.show_office_entry_fences ef
        on ef.entry_id=e.id and ef.phase='jump_off' and ef.fence_number=gs.fence_number
    ) jo_fences on true
    where e.class_id=p_class_id
  ), ranked as (
    select base.*,
      case when rankable then rank() over(order by
        case
          when rankable and v_jump_off and jo_id is not null then 0
          when rankable then 1 else 9
        end,
        case when v_jump_off and jo_id is not null then jo_faults else fr_faults end,
        case when v_jump_off and jo_id is not null then jo_time else fr_time end
      ) end as place_number
    from base
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'entry_id',entry_id,'entry_ref',entry_ref,'start_number',start_number,
    'rider_name',rider_name,'horse_name',horse_name,'stable_name',stable_name,
    'placing',place_number,
    'first_round',case when fr_id is null then null else jsonb_build_object(
      'id',fr_id,'result_ref',fr_ref,'phase','first_round','time_ms',fr_time,
      'faults',fr_faults,'refusals',fr_refusals,'eliminated',fr_eliminated,
      'retired',fr_retired,'did_not_start',fr_dns,'row_version',fr_version
    ) end,
    'jump_off',case when jo_id is null then null else jsonb_build_object(
      'id',jo_id,'result_ref',jo_ref,'phase','jump_off','time_ms',jo_time,
      'faults',jo_faults,'refusals',jo_refusals,'eliminated',jo_eliminated,
      'retired',jo_retired,'did_not_start',jo_dns,'row_version',jo_version
    ) end,
    'first_round_fences',fr_fences,'jump_off_fences',jo_fences
  ) order by start_number,entry_id),'[]'::jsonb) into v_rows
  from ranked;
  return jsonb_build_object('class',v_class,'rows',v_rows);
end;
$$;

create or replace function public.cce_restore_show_office_competitions_classes(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_competitions jsonb;
  v_classes jsonb;
  v_row jsonb;
  v_index integer:=0;
  v_field text;
  v_date_text text;
  v_date date;
  v_allowed integer;
  v_limit integer;
  v_competition_id bigint;
  v_inserted_id bigint;
  v_competition_summary jsonb;
  v_class_total integer:=0;
  v_class_imported integer:=0;
  v_class_duplicates integer:=0;
begin
  if not public.cce_has_permission('show_office.competitions.create')
     or not public.cce_has_permission('show_office.classes.create') then
    raise exception 'Permission denied: Show Office competition and class create permissions are required'
      using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Show Office restore payload must be a JSON object' using errcode='22023';
  end if;

  v_competitions:=p_payload->'competitions';
  v_classes:=coalesce(p_payload->'classes','[]'::jsonb);
  if v_competitions is null or jsonb_typeof(v_competitions)<>'array' then
    raise exception 'Show Office restore competitions must be a JSON array' using errcode='22023';
  end if;
  if jsonb_typeof(v_classes)<>'array' then
    raise exception 'Show Office restore classes must be a JSON array' using errcode='22023';
  end if;

  v_class_total:=jsonb_array_length(v_classes);
  for v_row in select value from jsonb_array_elements(v_classes)
  loop
    v_index:=v_index+1;
    if jsonb_typeof(v_row)<>'object' then
      raise exception 'Show Office backup class % must be an object',v_index using errcode='22023';
    end if;
    foreach v_field in array array[
      'competition_name','competition_date','class_number','class_name','competition_type','notes'
    ]
    loop
      if v_row?v_field and jsonb_typeof(v_row->v_field) not in ('string','null') then
        raise exception 'Show Office backup class % field % must be text',v_index,v_field using errcode='22023';
      end if;
    end loop;
    foreach v_field in array array[
      'sort_order','height_cm','allowed_time_seconds','time_limit_seconds','entry_fee_bd',
      'fence_count','knockdown_fault_value','refusal_fault_value','refusals_before_elimination'
    ]
    loop
      if v_row?v_field and jsonb_typeof(v_row->v_field) not in ('number','null') then
        raise exception 'Show Office backup class % field % must be numeric',v_index,v_field using errcode='22023';
      end if;
    end loop;
    if v_row?'jump_off' and jsonb_typeof(v_row->'jump_off') not in ('boolean','null') then
      raise exception 'Show Office backup class % field jump_off must be boolean',v_index using errcode='22023';
    end if;

    if btrim(coalesce(v_row->>'competition_name',''))='' then
      raise exception 'Show Office backup class % requires competition_name',v_index using errcode='22023';
    end if;
    if char_length(btrim(v_row->>'competition_name'))>180 then
      raise exception 'Show Office backup class % competition name exceeds 180 characters',v_index using errcode='22023';
    end if;
    v_date_text:=v_row->>'competition_date';
    if v_date_text is null or v_date_text!~'^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Show Office backup class % has invalid competition_date',v_index using errcode='22023';
    end if;
    begin
      v_date:=v_date_text::date;
    exception when others then
      raise exception 'Show Office backup class % has invalid competition_date',v_index using errcode='22023';
    end;
    if to_char(v_date,'YYYY-MM-DD')<>v_date_text then
      raise exception 'Show Office backup class % has invalid competition_date',v_index using errcode='22023';
    end if;
    if not exists(
      select 1 from public.show_office_competitions c
      where lower(trim(c.competition_name))=lower(btrim(v_row->>'competition_name'))
        and c.competition_date=v_date
    ) and not exists(
      select 1 from jsonb_array_elements(v_competitions) c(value)
      where lower(btrim(c.value->>'competition_name'))=lower(btrim(v_row->>'competition_name'))
        and c.value->>'competition_date'=v_date_text
    ) then
      raise exception 'Show Office backup class % references an unavailable competition',v_index using errcode='23503';
    end if;

    if btrim(coalesce(v_row->>'class_number',''))='' then
      raise exception 'Show Office backup class % requires class_number',v_index using errcode='22023';
    end if;
    if char_length(btrim(v_row->>'class_number'))>30 then
      raise exception 'Show Office backup class % number exceeds 30 characters',v_index using errcode='22023';
    end if;
    if btrim(coalesce(v_row->>'class_name',''))='' or char_length(btrim(v_row->>'class_name'))>180 then
      raise exception 'Show Office backup class % has an invalid class_name',v_index using errcode='22023';
    end if;
    if btrim(coalesce(v_row->>'competition_type',''))='' or char_length(btrim(v_row->>'competition_type'))>120 then
      raise exception 'Show Office backup class % has an invalid competition_type',v_index using errcode='22023';
    end if;
    if char_length(btrim(coalesce(v_row->>'notes','')))>4000 then
      raise exception 'Show Office backup class % notes exceed 4000 characters',v_index using errcode='22023';
    end if;

    if not (v_row?'sort_order') or jsonb_typeof(v_row->'sort_order')<>'number'
       or (v_row->>'sort_order')::numeric<>trunc((v_row->>'sort_order')::numeric)
       or (v_row->>'sort_order')::numeric<=0
       or (v_row->>'sort_order')::numeric>2147483647 then
      raise exception 'Show Office backup class % has invalid sort_order',v_index using errcode='22023';
    end if;
    if v_row->'height_cm' is not null and jsonb_typeof(v_row->'height_cm')<>'null' and (
      (v_row->>'height_cm')::numeric<>trunc((v_row->>'height_cm')::numeric)
      or (v_row->>'height_cm')::numeric<=0 or (v_row->>'height_cm')::numeric>32767
    ) then
      raise exception 'Show Office backup class % has invalid height_cm',v_index using errcode='22023';
    end if;
    if v_row->'allowed_time_seconds' is not null and jsonb_typeof(v_row->'allowed_time_seconds')<>'null' and (
      (v_row->>'allowed_time_seconds')::numeric<>trunc((v_row->>'allowed_time_seconds')::numeric)
      or (v_row->>'allowed_time_seconds')::numeric<=0 or (v_row->>'allowed_time_seconds')::numeric>2147483647
    ) then
      raise exception 'Show Office backup class % has invalid allowed_time_seconds',v_index using errcode='22023';
    end if;
    if v_row->'time_limit_seconds' is not null and jsonb_typeof(v_row->'time_limit_seconds')<>'null' and (
      (v_row->>'time_limit_seconds')::numeric<>trunc((v_row->>'time_limit_seconds')::numeric)
      or (v_row->>'time_limit_seconds')::numeric<=0 or (v_row->>'time_limit_seconds')::numeric>2147483647
    ) then
      raise exception 'Show Office backup class % has invalid time_limit_seconds',v_index using errcode='22023';
    end if;
    v_allowed:=nullif(v_row->>'allowed_time_seconds','')::integer;
    v_limit:=nullif(v_row->>'time_limit_seconds','')::integer;
    if v_allowed is not null and v_limit is not null and v_limit<v_allowed then
      raise exception 'Show Office backup class % time limit is below allowed time',v_index using errcode='22023';
    end if;
    if v_row->'entry_fee_bd' is not null and jsonb_typeof(v_row->'entry_fee_bd')<>'null' and (
      (v_row->>'entry_fee_bd')::numeric<0 or (v_row->>'entry_fee_bd')::numeric>9999999.999
      or scale((v_row->>'entry_fee_bd')::numeric)>3
    ) then
      raise exception 'Show Office backup class % has invalid entry_fee_bd',v_index using errcode='22023';
    end if;
    if v_row->'fence_count' is not null and jsonb_typeof(v_row->'fence_count')<>'null' and (
      (v_row->>'fence_count')::numeric<>trunc((v_row->>'fence_count')::numeric)
      or (v_row->>'fence_count')::numeric<1 or (v_row->>'fence_count')::numeric>50
    ) then
      raise exception 'Show Office backup class % has invalid fence_count',v_index using errcode='22023';
    end if;
    if v_row?'knockdown_fault_value' and jsonb_typeof(v_row->'knockdown_fault_value')<>'null' and (
      (v_row->>'knockdown_fault_value')::numeric<0 or (v_row->>'knockdown_fault_value')::numeric>999.99
    ) then
      raise exception 'Show Office backup class % has invalid knockdown_fault_value',v_index using errcode='22023';
    end if;
    if v_row?'refusal_fault_value' and jsonb_typeof(v_row->'refusal_fault_value')<>'null' and (
      (v_row->>'refusal_fault_value')::numeric<0 or (v_row->>'refusal_fault_value')::numeric>999.99
    ) then
      raise exception 'Show Office backup class % has invalid refusal_fault_value',v_index using errcode='22023';
    end if;
    if v_row?'refusals_before_elimination' and jsonb_typeof(v_row->'refusals_before_elimination')<>'null' and (
      (v_row->>'refusals_before_elimination')::numeric<>trunc((v_row->>'refusals_before_elimination')::numeric)
      or (v_row->>'refusals_before_elimination')::numeric<1 or (v_row->>'refusals_before_elimination')::numeric>9
    ) then
      raise exception 'Show Office backup class % has invalid refusals_before_elimination',v_index using errcode='22023';
    end if;
  end loop;

  select public.cce_restore_show_office_competitions(v_competitions)
  into v_competition_summary;

  for v_row in select value from jsonb_array_elements(v_classes)
  loop
    v_date:=(v_row->>'competition_date')::date;
    select c.id into strict v_competition_id
    from public.show_office_competitions c
    where lower(trim(c.competition_name))=lower(btrim(v_row->>'competition_name'))
      and c.competition_date=v_date;

    v_inserted_id:=null;
    insert into public.show_office_classes(
      competition_id,class_number,sort_order,class_name,height_cm,competition_type,
      allowed_time_seconds,time_limit_seconds,jump_off,entry_fee_bd,notes,
      fence_count,knockdown_fault_value,refusal_fault_value,refusals_before_elimination
    ) values(
      v_competition_id,
      btrim(v_row->>'class_number'),
      (v_row->>'sort_order')::integer,
      btrim(v_row->>'class_name'),
      nullif(v_row->>'height_cm','')::smallint,
      btrim(v_row->>'competition_type'),
      nullif(v_row->>'allowed_time_seconds','')::integer,
      nullif(v_row->>'time_limit_seconds','')::integer,
      coalesce((v_row->>'jump_off')::boolean,false),
      coalesce((v_row->>'entry_fee_bd')::numeric,0),
      nullif(btrim(coalesce(v_row->>'notes','')),''),
      nullif(v_row->>'fence_count','')::smallint,
      coalesce((v_row->>'knockdown_fault_value')::numeric,4),
      coalesce((v_row->>'refusal_fault_value')::numeric,4),
      coalesce((v_row->>'refusals_before_elimination')::smallint,3)
    )
    on conflict do nothing
    returning id into v_inserted_id;
    if v_inserted_id is null then
      v_class_duplicates:=v_class_duplicates+1;
    else
      v_class_imported:=v_class_imported+1;
    end if;
  end loop;

  return jsonb_build_object(
    'module','showOffice',
    'total',(v_competition_summary->>'total')::integer+v_class_total,
    'imported',(v_competition_summary->>'imported')::integer+v_class_imported,
    'duplicates',(v_competition_summary->>'duplicates')::integer+v_class_duplicates,
    'invalid',0,
    'entities',jsonb_build_object(
      'competitions',v_competition_summary-'module',
      'classes',jsonb_build_object(
        'total',v_class_total,'imported',v_class_imported,
        'duplicates',v_class_duplicates,'invalid',0
      )
    )
  );
end;
$$;

revoke all on function public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)
  to authenticated;
revoke all on function public.cce_show_office_judge_panel(bigint) from public,anon,authenticated;
grant execute on function public.cce_show_office_judge_panel(bigint) to authenticated;
revoke all on function public.cce_restore_show_office_competitions_classes(jsonb) from public,anon,authenticated;
grant execute on function public.cce_restore_show_office_competitions_classes(jsonb) to authenticated;

commit;
