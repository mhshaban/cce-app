-- CCE StableOS v4.9.1 — Show Office backup restore verification

select
  to_regprocedure('public.cce_restore_show_office_competitions(jsonb)') is not null as restore_function_exists,
  has_function_privilege('authenticated','public.cce_restore_show_office_competitions(jsonb)','EXECUTE') as authenticated_can_execute,
  not has_function_privilege('anon','public.cce_restore_show_office_competitions(jsonb)','EXECUTE') as anon_cannot_execute;

select count(*) as invalid_status_count
from public.show_office_competitions
where status not in ('Draft','Open','Running','Finished');

select count(*) as duplicate_name_date_count
from (
  select lower(trim(competition_name)),competition_date
  from public.show_office_competitions
  group by lower(trim(competition_name)),competition_date
  having count(*)>1
) duplicates;

select count(*)=6 as application_length_constraints_exist
from pg_constraint
where conrelid='public.show_office_competitions'::regclass
  and conname in (
    'show_office_competitions_name_length_check',
    'show_office_competitions_venue_length_check',
    'show_office_competitions_organizer_length_check',
    'show_office_competitions_chief_judge_length_check',
    'show_office_competitions_course_designer_length_check',
    'show_office_competitions_notes_length_check'
  );
