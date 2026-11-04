-- CCE StableOS v4.34.0 — Paddock board preflight
-- rbac_ready must be true. The second query lists the seed horses and whether
-- each one matches an Available horse; a false row is skipped by the seed,
-- not an error. Add it afterwards from the Paddocks page if needed.

select
  to_regprocedure('public.cce_has_permission(text)') is not null
  and to_regclass('public.app_permissions') is not null
  and to_regclass('public.profiles') is not null as rbac_ready,
  to_regclass('public.paddock_slots') is not null as already_applied;

select seed.horse_name,
  exists(select 1 from public.horses h where h.status='Available' and lower(trim(h.horse_name))=lower(trim(seed.horse_name))) as matches_available_horse
from (values
  ('Dark Ash'),('Warda'),('Bentli'),('Shumokh'),('Senorita'),('Nile Night'),('Azart'),('Vale Do Sol'),('N Snow'),
  ('Androus'),('Emperor'),('Dastan'),('Sultan De Marina'),('Maya'),('Badal'),('Blaze'),('Tameem'),('Flame Spirit'),
  ('Brihanna'),('Hanan'),('Tofan')
) as seed(horse_name)
order by 2,1;
