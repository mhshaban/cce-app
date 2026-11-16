-- Compatibility rollback for v4.39.0 (video movement analysis).
-- Drops horse_gait_analyses: all saved AI analyses are lost. The videos, the
-- movement observations and ride checks are not touched. Emergency use only.

begin;

drop table if exists public.horse_gait_analyses;

commit;
