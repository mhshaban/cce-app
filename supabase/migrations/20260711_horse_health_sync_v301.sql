begin;

-- Seed exactly one health profile for every active horse and merge legacy care data.
insert into public.horse_health_profiles (
  horse_id, health_status, severity, current_medication, veterinarian, medical_notes
)
select
  h.id,
  'Healthy',
  'None',
  nullif(h.medicant,''),
  nullif(h.vaccine_dr,''),
  nullif(concat_ws(E'\n',
    case when h.med_date is not null then 'Legacy medication date: '||h.med_date::text end,
    case when h.farrier_name is not null and h.farrier_name<>'' then 'Farrier: '||h.farrier_name end
  ),'')
from public.horses h
where lower(coalesce(h.status,''))='available'
on conflict (horse_id) do update set
  current_medication=coalesce(public.horse_health_profiles.current_medication,excluded.current_medication),
  veterinarian=coalesce(public.horse_health_profiles.veterinarian,excluded.veterinarian),
  medical_notes=coalesce(public.horse_health_profiles.medical_notes,excluded.medical_notes),
  updated_at=now();

-- Preserve legacy care dates as timeline records without creating duplicates.
insert into public.horse_medical_records(horse_id,record_type,event_date,title,veterinarian,status,notes)
select h.id,'Farrier',h.farrier_date,'Legacy farrier visit',nullif(h.farrier_name,''),'Completed','Imported from horse record'
from public.horses h
where h.farrier_date is not null
and not exists(select 1 from public.horse_medical_records r where r.horse_id=h.id and r.record_type='Farrier' and r.event_date=h.farrier_date and r.title='Legacy farrier visit');

insert into public.horse_medical_records(horse_id,record_type,event_date,title,veterinarian,status,notes)
select h.id,'Dental',h.teeth_date,'Legacy dental care',null,'Completed','Imported from horse record'
from public.horses h
where h.teeth_date is not null
and not exists(select 1 from public.horse_medical_records r where r.horse_id=h.id and r.record_type='Dental' and r.event_date=h.teeth_date and r.title='Legacy dental care');

insert into public.horse_medical_records(horse_id,record_type,event_date,title,status,notes)
select h.id,'Deworming',h.deworm_date,'Legacy deworming','Completed','Imported from horse record'
from public.horses h
where h.deworm_date is not null
and not exists(select 1 from public.horse_medical_records r where r.horse_id=h.id and r.record_type='Deworming' and r.event_date=h.deworm_date and r.title='Legacy deworming');

insert into public.horse_vaccinations(horse_id,vaccine_name,administered_date,due_date,veterinarian,status,notes)
select h.id,'Legacy vaccination',h.vaccine_date,h.vaccine_date,nullif(h.vaccine_dr,''),'Completed','Imported from horse record'
from public.horses h
where h.vaccine_date is not null
and not exists(select 1 from public.horse_vaccinations v where v.horse_id=h.id and v.administered_date=h.vaccine_date and v.vaccine_name='Legacy vaccination');

commit;
