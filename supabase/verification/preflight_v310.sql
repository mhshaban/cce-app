-- Read-only checks before v3.1.0
select 'horses' as table_name,count(*) as rows from public.horses
union all select 'profiles',count(*) from public.profiles
union all select 'health_profiles',count(*) from public.horse_health_profiles
union all select 'medical_records',count(*) from public.horse_medical_records
union all select 'vaccinations',count(*) from public.horse_vaccinations
union all select 'care_tasks',count(*) from public.horse_care_tasks;

-- A healthy result returns no rows.
select horse_id,count(*)
from public.horse_health_profiles
group by horse_id having count(*)>1;

-- Owner mappings that are ambiguous and therefore will not be auto-linked.
select lower(trim(owner_name)) as owner_key,count(*)
from public.profiles
where is_active is true and coalesce(trim(owner_name),'')<>''
group by lower(trim(owner_name)) having count(*)>1;
