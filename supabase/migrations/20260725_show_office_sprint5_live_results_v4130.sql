-- CCE StableOS v4.13.0 — Show Office Sprint 5
-- Live Results board: broader read-only access to provisional rankings while judging is in progress.

begin;

do $$
begin
  if to_regclass('public.show_office_class_judging') is null
     or to_regclass('public.show_office_entry_rounds') is null
     or to_regprocedure('public.cce_show_office_judging_context()') is null
     or to_regprocedure('public.cce_show_office_judge_panel(bigint)') is null then
    raise exception 'Show Office v4.12.0 must be applied before Sprint 5';
  end if;
end $$;

insert into public.app_permissions(code,category,name_en,name_ar) values
('show_office.results.view','Show Office','View the live results board','عرض لوحة النتائج المباشرة')
on conflict(code) do update set
  category=excluded.category,
  name_en=excluded.name_en,
  name_ar=excluded.name_ar;

insert into public.role_permissions(role_id,permission_code,allowed)
select r.id,'show_office.results.view',true
from public.app_roles r
where r.code in ('super_admin','manager','judge','reception','staff')
on conflict(role_id,permission_code) do update set allowed=true;

-- Widen the Sprint 4 read RPCs so results.view holders (front desk, general staff)
-- can display live standings without gaining Judge Panel scoring access.
create or replace function public.cce_show_office_judging_context()
returns table(
  competition_id bigint,competition_name text,competition_date date,competition_status text,
  class_id bigint,class_number text,class_name text,sort_order integer,height_cm smallint,
  competition_type text,allowed_time_seconds integer,time_limit_seconds integer,jump_off boolean,
  judging_status text,scoring_profile text,ruleset_version text,finalized_at timestamptz,
  entry_count bigint,scored_count bigint
)
language plpgsql
stable
security definer
set search_path=public
as $$
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
  return query
  select
    c.id,c.competition_name,c.competition_date,c.status,
    cl.id,cl.class_number,cl.class_name,cl.sort_order,cl.height_cm,
    cl.competition_type,cl.allowed_time_seconds,cl.time_limit_seconds,cl.jump_off,
    coalesce(j.status,'Not Started'),coalesce(j.scoring_profile,'faults_then_time'),
    coalesce(j.ruleset_version,'CCE 2026'),j.finalized_at,
    count(distinct e.id),
    count(distinct r.entry_id) filter(where r.phase='first_round')
  from public.show_office_classes cl
  join public.show_office_competitions c on c.id=cl.competition_id
  left join public.show_office_class_judging j on j.class_id=cl.id
  left join public.show_office_entries e on e.class_id=cl.id
  left join public.show_office_entry_rounds r on r.entry_id=e.id
  group by c.id,c.competition_name,c.competition_date,c.status,
    cl.id,cl.class_number,cl.class_name,cl.sort_order,cl.height_cm,
    cl.competition_type,cl.allowed_time_seconds,cl.time_limit_seconds,cl.jump_off,
    j.status,j.scoring_profile,j.ruleset_version,j.finalized_at
  order by c.competition_date desc,c.id desc,cl.sort_order,cl.id;
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
  select cl.jump_off,jsonb_build_object(
    'competition_id',c.id,'competition_name',c.competition_name,
    'competition_date',c.competition_date,'competition_status',c.status,
    'class_id',cl.id,'class_number',cl.class_number,'class_name',cl.class_name,
    'height_cm',cl.height_cm,'competition_type',cl.competition_type,
    'allowed_time_seconds',cl.allowed_time_seconds,
    'time_limit_seconds',cl.time_limit_seconds,'jump_off',cl.jump_off,
    'judging_status',coalesce(j.status,'Not Started'),
    'scoring_profile',coalesce(j.scoring_profile,'faults_then_time'),
    'ruleset_version',coalesce(j.ruleset_version,'CCE 2026'),
    'finalized_at',j.finalized_at
  ) into v_jump_off,v_class
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
    ) end
  ) order by start_number,entry_id),'[]'::jsonb) into v_rows
  from ranked;
  return jsonb_build_object('class',v_class,'rows',v_rows);
end;
$$;

revoke all on function public.cce_show_office_judging_context() from public,anon,authenticated;
revoke all on function public.cce_show_office_judge_panel(bigint) from public,anon,authenticated;
grant execute on function public.cce_show_office_judging_context() to authenticated;
grant execute on function public.cce_show_office_judge_panel(bigint) to authenticated;

comment on function public.cce_show_office_judge_panel(bigint) is
  'Returns a permission-filtered Judge Panel/Live Results board and provisional faults-then-time ranking.';

commit;
