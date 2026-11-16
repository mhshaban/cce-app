-- Compatibility rollback for v4.38.0 (movement & lameness log).
-- Drops the movement log and ride check tables (all recorded observations
-- and checks are lost) and their helper functions. Vet follow-up care tasks
-- already created in horse_health_events stay. Storage policies are
-- dropped; the horse-media bucket and its files are left for manual review.
-- Emergency use only.

begin;

-- v4.39.0 video analyses reference these tables; they go first.
drop table if exists public.horse_gait_analyses;
drop table if exists public.horse_movement_logs;
drop table if exists public.horse_ride_checks;
drop function if exists public.cce_movement_horses();
drop function if exists public.cce_movement_stamp_author();

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists cce_horse_media_select on storage.objects';
    execute 'drop policy if exists cce_horse_media_insert on storage.objects';
    execute 'drop policy if exists cce_horse_media_delete on storage.objects';
  end if;
end $$;

drop function if exists public.cce_movement_can_record();
drop function if exists public.cce_movement_can_view();

commit;
