-- Compatibility rollback for v4.23.4 (remove Feeding from staff care board).
-- Restores cce_mark_horse_fed and the feeding-aware cce_staff_care_board()
-- exactly as they were in v4.22.0. No columns, tables or data are affected.
-- Emergency use only.

begin;

create or replace function public.cce_staff_care_board()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_today date:=timezone('Asia/Bahrain',now())::date;
  v_feeding jsonb;
  v_farrier jsonb;
begin
  if not public.cce_has_permission('horse_care.view') then
    raise exception 'Permission denied';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'horse_id',h.id,'horse_name',h.horse_name,'stable_no',h.stable_no
  ) order by h.horse_name),'[]'::jsonb)
  into v_feeding
  from public.horses h
  where h.status='Available'
    and not exists (
      select 1 from public.horse_health_events e
      where e.horse_id=h.id and e.event_scope='care' and e.event_type='Feeding'
        and e.status='Completed'
        and timezone('Asia/Bahrain',e.completed_at)::date=v_today
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'horse_id',h.id,'horse_name',h.horse_name,'stable_no',h.stable_no,
    'farrier_date',h.farrier_date,
    'days_overdue',case when h.farrier_date is null then null else (v_today-h.farrier_date) end
  ) order by h.farrier_date nulls first,h.horse_name),'[]'::jsonb)
  into v_farrier
  from public.horses h
  where h.status='Available'
    and (h.farrier_date is null or h.farrier_date<v_today-30);

  return jsonb_build_object('feeding',v_feeding,'farrier',v_farrier,'as_of',v_today);
end;
$$;

create or replace function public.cce_mark_horse_fed(p_horse_id bigint)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_horse_name text;
  v_actor text;
  v_event_id bigint;
begin
  if not public.cce_has_permission('horse_care.manage') then
    raise exception 'Permission denied';
  end if;

  select horse_name into v_horse_name from public.horses where id=p_horse_id and status='Available';
  if v_horse_name is null then raise exception 'Horse not found or not active' using errcode='P0002'; end if;

  select coalesce(full_name,owner_name,'Staff') into v_actor from public.profiles where id=auth.uid();

  insert into public.horse_health_events(
    horse_id,event_scope,event_type,event_date,title,status,assigned_to,created_by
  ) values(
    p_horse_id,'care','Feeding',timezone('Asia/Bahrain',now())::date,'Daily feeding','Completed',v_actor,auth.uid()
  ) returning id into v_event_id;

  return jsonb_build_object('horse_id',p_horse_id,'event_id',v_event_id,'fed',true);
end;
$$;

revoke all on function public.cce_mark_horse_fed(bigint) from public,anon;
grant execute on function public.cce_mark_horse_fed(bigint) to authenticated;

commit;
