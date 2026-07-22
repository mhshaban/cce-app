-- CCE StableOS v4.10.0 — Show Office Sprint 2 verification

select
  to_regclass('public.show_office_classes') is not null as class_table_exists,
  to_regprocedure('public.cce_show_office_stamp_class()') is not null as class_audit_function_exists,
  to_regprocedure('public.cce_show_office_class_competitions()') is not null as class_directory_exists,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as module_restore_exists,
  has_function_privilege('authenticated','public.cce_show_office_class_competitions()','EXECUTE') as authenticated_can_read_class_directory,
  not has_function_privilege('anon','public.cce_show_office_class_competitions()','EXECUTE') as anon_cannot_read_class_directory,
  has_function_privilege('authenticated','public.cce_restore_show_office_module(jsonb)','EXECUTE') as authenticated_can_restore,
  not has_function_privilege('anon','public.cce_restore_show_office_module(jsonb)','EXECUTE') as anon_cannot_restore;

select count(*)=4 as class_permissions_exist
from public.app_permissions
where code in (
  'show_office.classes.view','show_office.classes.create',
  'show_office.classes.update','show_office.classes.delete'
);

select count(*)=8 as manager_and_admin_defaults_exist
from public.role_permissions rp
join public.app_roles r on r.id=rp.role_id
where r.code in ('super_admin','manager')
  and rp.permission_code like 'show_office.classes.%'
  and rp.allowed=true;

select count(*)=4 as class_rls_policies_exist
from pg_policies
where schemaname='public' and tablename='show_office_classes'
  and policyname in (
    'cce_show_office_classes_select','cce_show_office_classes_insert',
    'cce_show_office_classes_update','cce_show_office_classes_delete'
  );

select count(*)=13 as class_check_constraints_exist
from pg_constraint
where conrelid='public.show_office_classes'::regclass
  and conname in (
    'show_office_classes_number_required','show_office_classes_number_length_check',
    'show_office_classes_sort_order_check','show_office_classes_name_required',
    'show_office_classes_name_length_check','show_office_classes_height_check',
    'show_office_classes_type_required','show_office_classes_type_length_check',
    'show_office_classes_allowed_time_check','show_office_classes_time_limit_check',
    'show_office_classes_time_order_check','show_office_classes_entry_fee_check',
    'show_office_classes_notes_length_check'
  );

select count(*)=3 as class_indexes_exist
from pg_indexes
where schemaname='public' and tablename='show_office_classes'
  and indexname in (
    'show_office_classes_competition_number_uidx',
    'show_office_classes_competition_order_idx',
    'show_office_classes_type_idx'
  );

select count(*)=1 as full_competition_policy_excludes_class_only_view
from pg_policies
where schemaname='public' and tablename='show_office_competitions'
  and policyname='cce_show_office_competitions_select'
  and qual not like '%show_office.classes.view%';

select
  count(*) filter (where length(trim(class_number))=0 or char_length(trim(class_number))>30) as invalid_class_number_count,
  count(*) filter (where sort_order<=0) as invalid_sort_order_count,
  count(*) filter (where length(trim(class_name))=0 or char_length(trim(class_name))>180) as invalid_class_name_count,
  count(*) filter (where height_cm is not null and height_cm<=0) as invalid_height_count,
  count(*) filter (where length(trim(competition_type))=0 or char_length(trim(competition_type))>120) as invalid_type_count,
  count(*) filter (where allowed_time_seconds is not null and allowed_time_seconds<=0) as invalid_allowed_time_count,
  count(*) filter (where time_limit_seconds is not null and time_limit_seconds<=0) as invalid_time_limit_count,
  count(*) filter (where allowed_time_seconds is not null and time_limit_seconds is not null and time_limit_seconds<allowed_time_seconds) as invalid_time_order_count,
  count(*) filter (where entry_fee_bd<0) as invalid_entry_fee_count,
  count(*) filter (where char_length(coalesce(notes,''))>4000) as invalid_notes_count
from public.show_office_classes;

select count(*) as orphan_class_count
from public.show_office_classes c
left join public.show_office_competitions competition on competition.id=c.competition_id
where competition.id is null;

select count(*) as duplicate_class_number_count
from (
  select competition_id,lower(trim(class_number))
  from public.show_office_classes
  group by competition_id,lower(trim(class_number))
  having count(*)>1
) duplicates;
