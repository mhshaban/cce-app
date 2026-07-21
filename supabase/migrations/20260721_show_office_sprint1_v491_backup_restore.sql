-- CCE StableOS v4.9.1 — Show Office Sprint 1.1 backup restore
-- Validates the complete payload, inserts atomically and skips normalized name/date duplicates.

begin;

do $$
begin
  if to_regclass('public.show_office_competitions') is null
     or to_regprocedure('public.cce_has_permission(text)') is null
     or to_regprocedure('public.cce_show_office_stamp_competition()') is null then
    raise exception 'Show Office Sprint 1 must be applied before Sprint 1.1 backup restore';
  end if;
end $$;

alter table public.show_office_competitions
  drop constraint if exists show_office_competitions_name_length_check,
  drop constraint if exists show_office_competitions_venue_length_check,
  drop constraint if exists show_office_competitions_organizer_length_check,
  drop constraint if exists show_office_competitions_chief_judge_length_check,
  drop constraint if exists show_office_competitions_course_designer_length_check,
  drop constraint if exists show_office_competitions_notes_length_check;

alter table public.show_office_competitions
  add constraint show_office_competitions_name_length_check check (char_length(competition_name)<=180),
  add constraint show_office_competitions_venue_length_check check (char_length(venue)<=180),
  add constraint show_office_competitions_organizer_length_check check (char_length(organizer)<=180),
  add constraint show_office_competitions_chief_judge_length_check check (char_length(chief_judge)<=180),
  add constraint show_office_competitions_course_designer_length_check check (char_length(course_designer)<=180),
  add constraint show_office_competitions_notes_length_check check (char_length(notes)<=4000);

create or replace function public.cce_restore_show_office_competitions(p_competitions jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row jsonb;
  v_index integer:=0;
  v_total integer;
  v_imported integer:=0;
  v_duplicates integer:=0;
  v_date_text text;
  v_date date;
  v_status text;
  v_inserted_id bigint;
  v_field text;
begin
  if not public.cce_has_permission('show_office.competitions.create') then
    raise exception 'Permission denied: show_office.competitions.create is required'
      using errcode='42501';
  end if;
  if p_competitions is null or jsonb_typeof(p_competitions)<>'array' then
    raise exception 'Show Office backup competitions must be a JSON array'
      using errcode='22023';
  end if;

  v_total:=jsonb_array_length(p_competitions);
  -- Validate every row before the first insert so invalid backups fail atomically.
  for v_row in select value from jsonb_array_elements(p_competitions)
  loop
    v_index:=v_index+1;
    if jsonb_typeof(v_row)<>'object' then
      raise exception 'Show Office backup competition % must be an object',v_index
        using errcode='22023';
    end if;
    foreach v_field in array array[
      'competition_name','competition_date','venue','organizer','chief_judge',
      'course_designer','status','notes'
    ]
    loop
      if v_row?v_field and jsonb_typeof(v_row->v_field) not in ('string','null') then
        raise exception 'Show Office backup competition % field % must be text',v_index,v_field
          using errcode='22023';
      end if;
    end loop;

    if btrim(coalesce(v_row->>'competition_name',''))='' then
      raise exception 'Show Office backup competition % requires competition_name',v_index
        using errcode='22023';
    end if;
    if char_length(btrim(v_row->>'competition_name'))>180 then
      raise exception 'Show Office backup competition % name exceeds 180 characters',v_index
        using errcode='22023';
    end if;

    v_date_text:=v_row->>'competition_date';
    if v_date_text is null or v_date_text!~'^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Show Office backup competition % has invalid competition_date',v_index
        using errcode='22023';
    end if;
    begin
      v_date:=v_date_text::date;
    exception when others then
      raise exception 'Show Office backup competition % has invalid competition_date',v_index
        using errcode='22023';
    end;
    if to_char(v_date,'YYYY-MM-DD')<>v_date_text then
      raise exception 'Show Office backup competition % has invalid competition_date',v_index
        using errcode='22023';
    end if;

    v_status:=coalesce(nullif(btrim(v_row->>'status'),''),'Draft');
    if v_status not in ('Draft','Open','Running','Finished') then
      raise exception 'Show Office backup competition % has invalid status',v_index
        using errcode='22023';
    end if;
    if char_length(btrim(coalesce(v_row->>'venue','')))>180
       or char_length(btrim(coalesce(v_row->>'organizer','')))>180
       or char_length(btrim(coalesce(v_row->>'chief_judge','')))>180
       or char_length(btrim(coalesce(v_row->>'course_designer','')))>180 then
      raise exception 'Show Office backup competition % contains an official or venue over 180 characters',v_index
        using errcode='22023';
    end if;
    if char_length(btrim(coalesce(v_row->>'notes','')))>4000 then
      raise exception 'Show Office backup competition % notes exceed 4000 characters',v_index
        using errcode='22023';
    end if;
  end loop;

  -- Audit fields and IDs are intentionally excluded. The table trigger stamps the
  -- authenticated restore operator; an existing duplicate remains unchanged.
  for v_row in select value from jsonb_array_elements(p_competitions)
  loop
    v_inserted_id:=null;
    insert into public.show_office_competitions(
      competition_name,competition_date,venue,organizer,chief_judge,
      course_designer,status,notes
    ) values(
      btrim(v_row->>'competition_name'),
      (v_row->>'competition_date')::date,
      nullif(btrim(coalesce(v_row->>'venue','')),''),
      nullif(btrim(coalesce(v_row->>'organizer','')),''),
      nullif(btrim(coalesce(v_row->>'chief_judge','')),''),
      nullif(btrim(coalesce(v_row->>'course_designer','')),''),
      coalesce(nullif(btrim(v_row->>'status'),''),'Draft'),
      nullif(btrim(coalesce(v_row->>'notes','')),'')
    )
    on conflict do nothing
    returning id into v_inserted_id;
    if v_inserted_id is null then
      v_duplicates:=v_duplicates+1;
    else
      v_imported:=v_imported+1;
    end if;
  end loop;

  return jsonb_build_object(
    'module','showOffice',
    'total',v_total,
    'imported',v_imported,
    'duplicates',v_duplicates,
    'invalid',0
  );
end;
$$;

revoke all on function public.cce_restore_show_office_competitions(jsonb) from public,anon,authenticated;
grant execute on function public.cce_restore_show_office_competitions(jsonb) to authenticated;

comment on function public.cce_restore_show_office_competitions(jsonb) is
  'Atomically restores validated Show Office competitions, skips normalized name/date duplicates and stamps the restore operator.';

commit;
