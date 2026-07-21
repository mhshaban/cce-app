-- CCE StableOS v4.9.1 — non-destructive Show Office restore rollback
-- Removes only the restore RPC. Competition data and Sprint 1 CRUD remain intact.

begin;

revoke all on function public.cce_restore_show_office_competitions(jsonb) from public,anon,authenticated;
drop function if exists public.cce_restore_show_office_competitions(jsonb);

alter table if exists public.show_office_competitions
  drop constraint if exists show_office_competitions_name_length_check,
  drop constraint if exists show_office_competitions_venue_length_check,
  drop constraint if exists show_office_competitions_organizer_length_check,
  drop constraint if exists show_office_competitions_chief_judge_length_check,
  drop constraint if exists show_office_competitions_course_designer_length_check,
  drop constraint if exists show_office_competitions_notes_length_check;

commit;
