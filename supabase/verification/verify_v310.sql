-- Read-only verification after v3.1.0 migration
select 'active_horses' as check_name,count(*)::text as result from public.cce_active_horses
union all select 'health_profiles',count(*)::text from public.horse_health_profiles
union all select 'health_events',count(*)::text from public.horse_health_events
union all select 'linked_owner_horses',count(*)::text from public.horses where owner_profile_id is not null;

select horse_id,count(*) as profile_count
from public.horse_health_profiles group by horse_id having count(*)>1;

select h.id,h.horse_name,p.health_status,p.pregnant_since,p.expected_foaling_date,p.updated_at
from public.cce_active_horses h
left join public.horse_health_profiles p on p.horse_id=h.id
order by h.horse_name;
