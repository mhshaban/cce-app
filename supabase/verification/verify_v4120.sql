-- CCE StableOS v4.12.0 — Show Office Sprint 4 verification

select
  to_regclass('public.show_office_class_judging') is not null as judging_table_exists,
  to_regclass('public.show_office_entry_rounds') is not null as score_table_exists,
  to_regclass('public.show_office_score_revisions') is not null as audit_table_exists,
  to_regprocedure('public.cce_show_office_judging_context()') is not null as context_rpc_exists,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_exists,
  to_regprocedure('public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer)') is not null as save_rpc_exists,
  to_regprocedure('public.cce_reset_show_office_score(bigint,text,integer)') is not null as reset_rpc_exists,
  to_regprocedure('public.cce_finalize_show_office_class(bigint)') is not null as finalize_rpc_exists,
  to_regprocedure('public.cce_reopen_show_office_class(bigint)') is not null as reopen_rpc_exists,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as restore_rpc_exists;

select count(*)=4 as judging_permissions_exist
from public.app_permissions
where code in (
  'show_office.judging.view','show_office.judging.score',
  'show_office.judging.finalize','show_office.judging.reopen'
);

select
  count(*) filter(where r.code in ('super_admin','manager') and rp.allowed)=8
    as manager_and_admin_defaults_exist,
  count(*) filter(where r.code='judge' and rp.allowed
    and rp.permission_code in ('show_office.judging.view','show_office.judging.score'))=2
    as judge_defaults_exist,
  count(*) filter(where r.code='judge' and rp.allowed
    and rp.permission_code in ('show_office.judging.finalize','show_office.judging.reopen'))=0
    as judge_has_no_approval_defaults
from public.role_permissions rp
join public.app_roles r on r.id=rp.role_id
where r.code in ('super_admin','manager','judge')
  and rp.permission_code like 'show_office.judging.%';

select count(*)=3 as judging_select_policies_exist
from pg_policies
where schemaname='public'
  and policyname in (
    'cce_show_office_class_judging_select',
    'cce_show_office_entry_rounds_select',
    'cce_show_office_score_revisions_select'
  );

select count(*)=5 as judging_indexes_exist
from pg_indexes
where schemaname='public'
  and indexname in (
    'show_office_entry_rounds_entry_phase_uidx',
    'show_office_entry_rounds_entry_idx',
    'show_office_entry_rounds_phase_rank_idx',
    'show_office_score_revisions_score_idx',
    'show_office_score_revisions_entry_idx'
  );

select count(*)=11 as judging_constraints_exist
from pg_constraint
where conrelid in (
  'public.show_office_class_judging'::regclass,
  'public.show_office_entry_rounds'::regclass,
  'public.show_office_score_revisions'::regclass
)
and conname in (
  'show_office_class_judging_status_check',
  'show_office_class_judging_profile_check',
  'show_office_class_judging_ruleset_required',
  'show_office_class_judging_ruleset_length_check',
  'show_office_class_judging_finalized_check',
  'show_office_entry_rounds_phase_check',
  'show_office_entry_rounds_time_check',
  'show_office_entry_rounds_faults_check',
  'show_office_entry_rounds_refusals_check',
  'show_office_entry_rounds_version_check',
  'show_office_score_revisions_action_check'
);

select count(*)=3 as judging_triggers_exist
from pg_trigger
where not tgisinternal
  and tgname in (
    'show_office_class_judging_stamp',
    'show_office_entry_rounds_00_stamp',
    'show_office_entry_rounds_10_audit'
  );

select
  count(*) filter(where cl.id is null) as orphan_judging_count,
  count(*) filter(where j.status not in ('Not Started','Running','Finalized')) as invalid_status_count,
  count(*) filter(where j.status='Finalized' and j.finalized_at is null) as invalid_finalized_count
from public.show_office_class_judging j
left join public.show_office_classes cl on cl.id=j.class_id;

select
  count(*) filter(where e.id is null) as orphan_score_count,
  count(*) filter(where r.phase not in ('first_round','jump_off')) as invalid_phase_count,
  count(*) filter(where r.row_version<=0) as invalid_version_count,
  count(*) filter(where r.refusals not between 0 and 9) as invalid_refusals_count
from public.show_office_entry_rounds r
left join public.show_office_entries e on e.id=r.entry_id;

select count(*) as duplicate_entry_phase_count
from (
  select entry_id,phase
  from public.show_office_entry_rounds
  group by entry_id,phase
  having count(*)>1
) duplicate_scores;

select
  has_function_privilege('authenticated','public.cce_show_office_judging_context()','EXECUTE')
    as authenticated_can_read_context,
  not has_function_privilege('anon','public.cce_show_office_judging_context()','EXECUTE')
    as anon_cannot_read_context,
  has_function_privilege('authenticated','public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer)','EXECUTE')
    as authenticated_can_call_save,
  not has_function_privilege('anon','public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer)','EXECUTE')
    as anon_cannot_call_save;
