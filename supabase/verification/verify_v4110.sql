-- CCE StableOS v4.11.0 — Show Office Sprint 3 verification

select
  to_regclass('public.show_office_riders') is not null as rider_table_exists,
  to_regclass('public.show_office_horses') is not null as horse_registry_exists,
  to_regclass('public.show_office_stables') is not null as stable_table_exists,
  to_regclass('public.show_office_entries') is not null as entry_table_exists,
  to_regprocedure('public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text)') is not null as save_rpc_exists,
  to_regprocedure('public.cce_show_office_entry_context()') is not null as context_rpc_exists,
  to_regprocedure('public.cce_show_office_entry_directory(text,integer)') is not null as directory_rpc_exists,
  to_regprocedure('public.cce_show_office_entries_page(bigint,text,integer,integer)') is not null as page_rpc_exists,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as restore_rpc_exists;

select count(*)=4 as entry_permissions_exist
from public.app_permissions
where code in (
  'show_office.entries.view','show_office.entries.create',
  'show_office.entries.update','show_office.entries.delete'
);

select count(*)=8 as manager_and_admin_defaults_exist
from public.role_permissions rp
join public.app_roles r on r.id=rp.role_id
where r.code in ('super_admin','manager')
  and rp.permission_code like 'show_office.entries.%'
  and rp.allowed=true;

select count(*)=4 as entry_rls_policies_exist
from pg_policies
where schemaname='public' and tablename='show_office_entries'
  and policyname in (
    'cce_show_office_entries_select','cce_show_office_entries_insert',
    'cce_show_office_entries_update','cce_show_office_entries_delete'
  );

select count(*)=3 as registry_select_policies_exist
from pg_policies
where schemaname='public'
  and policyname in (
    'cce_show_office_riders_select','cce_show_office_horses_select',
    'cce_show_office_stables_select'
  );

select count(*)=9 as entry_indexes_exist
from pg_indexes
where schemaname='public'
  and indexname in (
    'show_office_entries_class_start_uidx','show_office_entries_class_pair_uidx',
    'show_office_entries_class_order_idx','show_office_entries_rider_idx',
    'show_office_entries_horse_idx','show_office_entries_stable_idx',
    'show_office_riders_name_uidx','show_office_horses_name_uidx',
    'show_office_stables_name_uidx'
  );

select count(*)=7 as entry_constraints_exist
from pg_constraint
where conrelid in (
  'public.show_office_riders'::regclass,'public.show_office_horses'::regclass,
  'public.show_office_stables'::regclass,'public.show_office_entries'::regclass
)
and conname in (
  'show_office_riders_name_required','show_office_riders_name_length_check',
  'show_office_horses_name_required','show_office_horses_name_length_check',
  'show_office_stables_name_required','show_office_stables_name_length_check',
  'show_office_entries_start_number_check'
);

select count(*)=5 as entry_triggers_exist
from pg_trigger
where not tgisinternal and tgname in (
    'show_office_riders_stamp','show_office_horses_00_sync','show_office_horses_stamp',
    'show_office_stables_stamp','show_office_entries_stamp'
  );

select
  count(*) filter(where start_number<=0) as invalid_start_number_count,
  count(*) filter(where cl.id is null) as orphan_class_count,
  count(*) filter(where r.id is null) as orphan_rider_count,
  count(*) filter(where h.id is null) as orphan_horse_count,
  count(*) filter(where e.stable_id is not null and s.id is null) as orphan_stable_count
from public.show_office_entries e
left join public.show_office_classes cl on cl.id=e.class_id
left join public.show_office_riders r on r.id=e.rider_id
left join public.show_office_horses h on h.id=e.horse_id
left join public.show_office_stables s on s.id=e.stable_id;

select count(*) as duplicate_start_number_count
from (
  select class_id,start_number from public.show_office_entries
  group by class_id,start_number having count(*)>1
) duplicates;

select count(*) as duplicate_class_pair_count
from (
  select class_id,rider_id,horse_id from public.show_office_entries
  group by class_id,rider_id,horse_id having count(*)>1
) duplicates;

select
  count(*) filter(where length(trim(rider_name))=0 or char_length(trim(rider_name))>180) as invalid_rider_name_count
from public.show_office_riders;

select
  count(*) filter(where length(trim(horse_name))=0 or char_length(trim(horse_name))>180) as invalid_horse_name_count
from public.show_office_horses;

select
  count(*) filter(where length(trim(stable_name))=0 or char_length(trim(stable_name))>180) as invalid_stable_name_count
from public.show_office_stables;

select count(*) as duplicate_registry_name_count
from (
  select lower(trim(rider_name)) from public.show_office_riders group by 1 having count(*)>1
  union all
  select lower(trim(horse_name)) from public.show_office_horses group by 1 having count(*)>1
  union all
  select lower(trim(stable_name)) from public.show_office_stables group by 1 having count(*)>1
) duplicate_names;

select
  has_function_privilege('authenticated','public.cce_show_office_entry_context()','EXECUTE') as authenticated_can_read_context,
  not has_function_privilege('anon','public.cce_show_office_entry_context()','EXECUTE') as anon_cannot_read_context,
  has_function_privilege('authenticated','public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text)','EXECUTE') as authenticated_can_call_save,
  not has_function_privilege('anon','public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text)','EXECUTE') as anon_cannot_call_save;
