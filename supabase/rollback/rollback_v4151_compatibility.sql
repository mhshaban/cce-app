-- CCE StableOS v4.15.1 compatibility rollback — emergency use only.
-- Restores the v4.15.0 cce_save_show_office_fence_score body, which doubled
-- the entire Accumulator total instead of only the Joker fence's own value.
-- Only use this if v4.15.1 itself causes an unrelated regression; it
-- reintroduces the original doubling bug.

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
  v_scoring_format text;
  v_joker_fence_number smallint;
  v_competition_status text;
  v_judging_status text;
  v_existing_id bigint;
  v_existing_version integer;
  v_flags integer;
  v_fence_faults numeric(10,2);
  v_fence_refusals integer;
  v_base_points numeric(10,2);
  v_joker_cleared boolean;
  v_points numeric(10,2);
  v_eliminated boolean;
  v_result jsonb;
begin
  if not public.cce_has_permission('show_office.judging.score') then
    raise exception 'Permission denied: Show Office judging score permission is required'
      using errcode='42501';
  end if;
  select cl.id,cl.jump_off,cl.fence_count,cl.refusals_before_elimination,
    cl.scoring_format,cl.joker_fence_number,c.status
    into v_class_id,v_jump_off,v_fence_count,v_refusal_threshold,
    v_scoring_format,v_joker_fence_number,v_competition_status
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

  select count(*) filter(where incident='refusal')
    into v_fence_refusals
  from public.show_office_entry_fences
  where entry_id=p_entry_id and phase=v_phase;

  if v_scoring_format='accumulator_joker' then
    select
      coalesce(sum(case when coalesce(ef.incident,'clear')='clear' then gs.fence_number else 0 end),0),
      bool_or(coalesce(ef.incident,'clear')='clear' and gs.fence_number=v_joker_fence_number)
      into v_base_points,v_joker_cleared
    from generate_series(1,v_fence_count) as gs(fence_number)
    left join public.show_office_entry_fences ef
      on ef.entry_id=p_entry_id and ef.phase=v_phase and ef.fence_number=gs.fence_number;
    v_points:=v_base_points*(case when coalesce(v_joker_cleared,false) then 2 else 1 end);
  else
    select coalesce(sum(fault_value),0) into v_fence_faults
    from public.show_office_entry_fences
    where entry_id=p_entry_id and phase=v_phase;
  end if;

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
      entry_id,phase,time_ms,faults,points,refusals,eliminated,retired,did_not_start
    ) values(
      p_entry_id,v_phase,
      case when v_flags=0 then p_time_ms else null end,
      case when v_flags=0 and v_scoring_format<>'accumulator_joker' then v_fence_faults else null end,
      case when v_flags=0 and v_scoring_format='accumulator_joker' then v_points else null end,
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
      faults=case when v_flags=0 and v_scoring_format<>'accumulator_joker' then v_fence_faults else null end,
      points=case when v_flags=0 and v_scoring_format='accumulator_joker' then v_points else null end,
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

revoke all on function public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)
  to authenticated;

commit;
