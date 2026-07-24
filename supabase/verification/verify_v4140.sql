-- CCE StableOS v4.14.0 — fence-by-fence scoring verification

select
  to_regclass('public.show_office_entry_fences') is not null as fences_table_exists,
  to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null as toggle_rpc_exists,
  to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is not null as confirm_rpc_exists,
  to_regprocedure('public.cce_reset_show_office_score(bigint,text,integer)') is not null as reset_rpc_exists,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_exists,
  to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is not null as class_restore_rpc_exists;

select count(*)=4 as class_fence_columns_exist
from information_schema.columns
where table_schema='public' and table_name='show_office_classes'
  and column_name in (
    'fence_count','knockdown_fault_value','refusal_fault_value','refusals_before_elimination'
  );

select count(*)=4 as class_fence_constraints_exist
from pg_constraint
where conrelid='public.show_office_classes'::regclass
  and conname in (
    'show_office_classes_fence_count_check','show_office_classes_knockdown_value_check',
    'show_office_classes_refusal_value_check','show_office_classes_refusal_threshold_check'
  );

select count(*)=5 as fence_constraints_exist
from pg_constraint
where conrelid='public.show_office_entry_fences'::regclass
  and conname in (
    'show_office_entry_fences_phase_check','show_office_entry_fences_fence_number_check',
    'show_office_entry_fences_incident_check','show_office_entry_fences_fault_value_check',
    'show_office_entry_fences_version_check'
  );

select count(*)=1 as fences_select_policy_exists
from pg_policies
where schemaname='public' and tablename='show_office_entry_fences'
  and policyname='cce_show_office_entry_fences_select';

select count(*)=1 as fences_unique_index_exists
from pg_indexes
where schemaname='public' and indexname='show_office_entry_fences_entry_phase_fence_uidx';

select
  count(*) filter(where e.id is null) as orphan_fence_count,
  count(*) filter(where f.phase not in ('first_round','jump_off')) as invalid_phase_count,
  count(*) filter(where f.incident not in ('clear','knockdown','refusal')) as invalid_incident_count,
  count(*) filter(where f.row_version<=0) as invalid_version_count
from public.show_office_entry_fences f
left join public.show_office_entries e on e.id=f.entry_id;

select
  count(*) filter(where fence_count is not null and (fence_count<1 or fence_count>50)) as invalid_fence_count,
  count(*) filter(where knockdown_fault_value<0 or knockdown_fault_value>999.99) as invalid_knockdown_value,
  count(*) filter(where refusal_fault_value<0 or refusal_fault_value>999.99) as invalid_refusal_value,
  count(*) filter(where refusals_before_elimination<1 or refusals_before_elimination>9) as invalid_refusal_threshold
from public.show_office_classes;

select
  has_function_privilege('authenticated','public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)','EXECUTE')
    as authenticated_can_toggle_fence,
  not has_function_privilege('anon','public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)','EXECUTE')
    as anon_cannot_toggle_fence,
  has_function_privilege('authenticated','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as authenticated_can_confirm_fence_score,
  not has_function_privilege('anon','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as anon_cannot_confirm_fence_score;

-- Sprint 4 objects stay untouched.
select
  to_regclass('public.show_office_entry_rounds') is not null as rounds_table_exists,
  to_regclass('public.show_office_score_revisions') is not null as audit_table_exists;
