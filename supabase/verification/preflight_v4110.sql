-- CCE StableOS v4.11.0 — Show Office Sprint 3 preflight

select
  to_regclass('public.show_office_competitions') is not null as competitions_ready,
  to_regclass('public.show_office_classes') is not null as classes_ready,
  to_regclass('public.horses') is not null as core_horses_ready,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as v410_restore_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permissions_ready;

select
  to_regclass('public.show_office_entries') is not null as entries_already_exist,
  to_regclass('public.show_office_riders') is not null as riders_already_exist,
  to_regclass('public.show_office_horses') is not null as entry_horses_already_exist,
  to_regclass('public.show_office_stables') is not null as stables_already_exist,
  case when to_regclass('public.show_office_entries') is null
    then 'Ready for first Sprint 3 application'
    else 'Existing Sprint 3 tables detected — data guard will validate them before reapplying'
  end as note;

do $$
declare v_invalid bigint;
begin
  if to_regclass('public.show_office_entries') is null
     and to_regclass('public.show_office_riders') is null
     and to_regclass('public.show_office_horses') is null
     and to_regclass('public.show_office_stables') is null then return; end if;
  if to_regclass('public.show_office_entries') is null
     or to_regclass('public.show_office_riders') is null
     or to_regclass('public.show_office_horses') is null
     or to_regclass('public.show_office_stables') is null then
    raise exception 'Sprint 3 preflight found an incomplete set of existing Show Office entry tables';
  end if;
  execute $check$
    select count(*) from public.show_office_entries e
    left join public.show_office_classes cl on cl.id=e.class_id
    left join public.show_office_riders r on r.id=e.rider_id
    left join public.show_office_horses h on h.id=e.horse_id
    left join public.show_office_stables s on s.id=e.stable_id
    where e.start_number<=0 or cl.id is null or r.id is null or h.id is null
       or (e.stable_id is not null and s.id is null)
       or length(trim(r.rider_name))=0 or char_length(trim(r.rider_name))>180
       or length(trim(h.horse_name))=0 or char_length(trim(h.horse_name))>180
       or (s.id is not null and (length(trim(s.stable_name))=0 or char_length(trim(s.stable_name))>180))
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 3 preflight found % invalid existing entry rows',v_invalid;
  end if;
  execute $check$
    select count(*) from (
      select lower(trim(rider_name)) from public.show_office_riders group by 1 having count(*)>1
      union all
      select lower(trim(horse_name)) from public.show_office_horses group by 1 having count(*)>1
      union all
      select lower(trim(stable_name)) from public.show_office_stables group by 1 having count(*)>1
    ) duplicate_names
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 3 preflight found % duplicated registry names',v_invalid;
  end if;
end $$;
