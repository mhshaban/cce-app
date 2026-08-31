-- CCE StableOS v4.23.4 — Remove the mistaken "Feeding" concept from the staff care board
-- "تحذية" (shoeing) was misread as feeding/nutrition when this feature was
-- built in v4.22.0 — it actually refers to farrier work, the same thing the
-- Farrier overdue list already covers. Drops the now-unwanted
-- cce_mark_horse_fed RPC and simplifies cce_staff_care_board() to return
-- only the farrier list. No columns or tables are touched; the 'Feeding'
-- event_type value added to horse_health_events in v4.22.0 is left in the
-- whitelist (harmless, and any rows using it — there should be none, since
-- the routing bug meant this page was never actually reachable — are left
-- alone rather than force-migrated).

begin;

do $$
begin
  if to_regprocedure('public.cce_staff_care_board()') is null then
    raise exception 'CCE staff care board (v4.22.0) must be applied before this cleanup';
  end if;
end $$;

drop function if exists public.cce_mark_horse_fed(bigint);

create or replace function public.cce_staff_care_board()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_today date:=timezone('Asia/Bahrain',now())::date;
  v_farrier jsonb;
begin
  if not public.cce_has_permission('horse_care.view') then
    raise exception 'Permission denied';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'horse_id',h.id,'horse_name',h.horse_name,'stable_no',h.stable_no,
    'farrier_date',h.farrier_date,
    'days_overdue',case when h.farrier_date is null then null else (v_today-h.farrier_date) end
  ) order by h.farrier_date nulls first,h.horse_name),'[]'::jsonb)
  into v_farrier
  from public.horses h
  where h.status='Available'
    and (h.farrier_date is null or h.farrier_date<v_today-30);

  return jsonb_build_object('farrier',v_farrier,'as_of',v_today);
end;
$$;

revoke all on function public.cce_staff_care_board() from public,anon;
grant execute on function public.cce_staff_care_board() to authenticated;

comment on function public.cce_staff_care_board() is
  'The farrier-overdue list for Available horses. Requires horse_care.view.';

commit;
