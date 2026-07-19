-- Emergency compatibility rollback. Run only if the v3.1.0 frontend cannot be used.
begin;
do $$
begin
  if to_regclass('cce_archive.horse_medical_records_v300') is not null and to_regclass('public.horse_medical_records') is null then
    alter table cce_archive.horse_medical_records_v300 rename to horse_medical_records;
    alter table cce_archive.horse_medical_records set schema public;
  end if;
  if to_regclass('cce_archive.horse_vaccinations_v300') is not null and to_regclass('public.horse_vaccinations') is null then
    alter table cce_archive.horse_vaccinations_v300 rename to horse_vaccinations;
    alter table cce_archive.horse_vaccinations set schema public;
  end if;
  if to_regclass('cce_archive.horse_care_tasks_v300') is not null and to_regclass('public.horse_care_tasks') is null then
    alter table cce_archive.horse_care_tasks_v300 rename to horse_care_tasks;
    alter table cce_archive.horse_care_tasks set schema public;
  end if;
end $$;
commit;
