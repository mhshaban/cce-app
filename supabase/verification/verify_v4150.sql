-- CCE StableOS v4.15.0 — Accumulator with Joker verification

select
  to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is not null
    as confirm_rpc_exists,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_exists,
  to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is not null as class_restore_rpc_exists;

select count(*)=2 as class_accumulator_columns_exist
from information_schema.columns
where table_schema='public' and table_name='show_office_classes'
  and column_name in ('scoring_format','joker_fence_number');

select count(*)=1 as round_points_column_exists
from information_schema.columns
where table_schema='public' and table_name='show_office_entry_rounds' and column_name='points';

select count(*)=3 as class_accumulator_constraints_exist
from pg_constraint
where conrelid='public.show_office_classes'::regclass
  and conname in (
    'show_office_classes_scoring_format_check',
    'show_office_classes_accumulator_requires_fences_check',
    'show_office_classes_joker_fence_check'
  );

select count(*)=3 as round_points_constraints_exist
from pg_constraint
where conrelid='public.show_office_entry_rounds'::regclass
  and conname in (
    'show_office_entry_rounds_complete_check',
    'show_office_entry_rounds_points_check',
    'show_office_entry_rounds_faults_points_exclusive_check'
  );

select
  count(*) filter(where scoring_format not in ('table_a','accumulator_joker')) as invalid_scoring_format_count,
  count(*) filter(where scoring_format='accumulator_joker' and fence_count is null) as accumulator_missing_fences_count,
  count(*) filter(
    where joker_fence_number is not null
      and (fence_count is null or joker_fence_number<1 or joker_fence_number>fence_count)
  ) as invalid_joker_fence_count
from public.show_office_classes;

select
  count(*) filter(where faults is not null and points is not null) as rounds_with_both_faults_and_points,
  count(*) filter(where points is not null and (points<0 or points>999999.99)) as invalid_points_count
from public.show_office_entry_rounds;

select
  has_function_privilege('authenticated','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as authenticated_can_confirm_fence_score,
  not has_function_privilege('anon','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as anon_cannot_confirm_fence_score;

-- v4.14.0 objects stay untouched.
select
  to_regclass('public.show_office_entry_fences') is not null as fences_table_exists,
  to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null
    as toggle_rpc_exists;
