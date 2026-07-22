-- CCE StableOS v4.10.0 — Show Office Sprint 2 preflight

select
  to_regclass('public.show_office_competitions') is not null as competitions_ready,
  to_regclass('public.app_permissions') is not null as permissions_ready,
  to_regclass('public.app_roles') is not null as roles_ready,
  to_regclass('public.role_permissions') is not null as role_permissions_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permission_function_ready,
  to_regprocedure('public.cce_restore_show_office_competitions(jsonb)') is not null as v491_restore_ready;

select
  to_regclass('public.show_office_classes') is not null as class_table_already_exists,
  to_regprocedure('public.cce_show_office_class_competitions()') is not null as class_directory_already_exists,
  to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as sprint2_restore_already_exists,
  case when to_regclass('public.show_office_classes') is null
    then 'Ready for first Sprint 2 application'
    else 'Existing class table detected — data guard will validate it before reapplying'
  end as note;

do $$
declare
  v_invalid bigint;
begin
  if to_regclass('public.show_office_classes') is null then return; end if;
  execute $check$
    select count(*) from public.show_office_classes
    where length(trim(class_number))=0 or char_length(trim(class_number))>30
       or sort_order<=0
       or length(trim(class_name))=0 or char_length(trim(class_name))>180
       or (height_cm is not null and height_cm<=0)
       or length(trim(competition_type))=0 or char_length(trim(competition_type))>120
       or (allowed_time_seconds is not null and allowed_time_seconds<=0)
       or (time_limit_seconds is not null and time_limit_seconds<=0)
       or (allowed_time_seconds is not null and time_limit_seconds is not null and time_limit_seconds<allowed_time_seconds)
       or entry_fee_bd<0 or char_length(coalesce(notes,''))>4000
  $check$ into v_invalid;
  if v_invalid>0 then
    raise exception 'Sprint 2 preflight found % invalid existing class rows',v_invalid;
  end if;
end $$;
