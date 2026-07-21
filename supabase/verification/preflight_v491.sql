-- CCE StableOS v4.9.1 — Show Office backup restore preflight (read-only)

select
  to_regclass('public.show_office_competitions') is not null as competition_table_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permission_function_ready,
  to_regprocedure('public.cce_show_office_stamp_competition()') is not null as audit_trigger_function_ready,
  to_regprocedure('public.cce_restore_show_office_competitions(jsonb)') is not null as restore_function_already_exists;

select count(*)=1 as create_permission_ready
from public.app_permissions
where code='show_office.competitions.create';

select
  count(*) filter (where char_length(competition_name)>180) as invalid_competition_name_length,
  count(*) filter (where char_length(venue)>180) as invalid_venue_length,
  count(*) filter (where char_length(organizer)>180) as invalid_organizer_length,
  count(*) filter (where char_length(chief_judge)>180) as invalid_chief_judge_length,
  count(*) filter (where char_length(course_designer)>180) as invalid_course_designer_length,
  count(*) filter (where char_length(notes)>4000) as invalid_notes_length
from public.show_office_competitions;
