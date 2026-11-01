-- CCE StableOS v4.33.0 — Seasonal monthly livery income
-- AC Livery is priced by season, as printed on the livery contract:
-- winter (Oct–Apr, no A/C) = horses.livery_bd, summer (May–Sep, A/C) =
-- horses.ac_livery_bd. The automatic monthly income row always used the
-- summer price whenever ac_livery_bd was set, so AC horses were billed the
-- A/C rate all year. The monthly row now takes the price for its month.
-- Fan livery horses (one price) are unchanged. The "already billed this
-- month" check also ignores stray spaces around the horse name, so a name
-- such as 'Dastan ' no longer gets a second row.
-- Safe to re-run.

begin;

do $$
begin
  if to_regprocedure('public.cce_create_monthly_livery_income()') is null then
    raise exception 'v4.19.0 monthly livery income must be applied before this migration';
  end if;
end $$;

-- Monthly livery price for a month (1–12): summer May–Sep uses the A/C price.
create or replace function public.cce_livery_monthly_amount(
  p_livery_bd numeric,
  p_ac_livery_bd numeric,
  p_month integer
)
returns numeric
language sql
immutable
set search_path=public,pg_temp
as $$
  select case when p_month between 5 and 9
    then coalesce(nullif(p_ac_livery_bd,0),p_livery_bd)
    else coalesce(nullif(p_livery_bd,0),p_ac_livery_bd)
  end
$$;

create or replace function public.cce_create_monthly_livery_income()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_month text:=to_char(timezone('Asia/Bahrain',now()),'YYYY-MM');
  v_due_date date:=(v_month||'-01')::date;
  v_today date:=timezone('Asia/Bahrain',now())::date;
  v_created integer:=0;
  v_horse record;
  v_amount numeric(12,3);
begin
  for v_horse in
    select horse_name,owner,livery_bd,ac_livery_bd
    from public.horses
    where status='Available'
      and (coalesce(livery_bd,0)>0 or coalesce(ac_livery_bd,0)>0)
  loop
    if exists (
      select 1 from public.income
      where trim(horse_name)=trim(v_horse.horse_name)
        and activity like 'Livery%'
        and due_date is not null
        and to_char(due_date,'YYYY-MM')=v_month
    ) then
      continue;
    end if;
    v_amount:=public.cce_livery_monthly_amount(v_horse.livery_bd,v_horse.ac_livery_bd,extract(month from v_due_date)::integer);
    insert into public.income(date,due_date,customer_name,horse_name,activity,qty,amount_bd,paid_bd,notes,status)
    values(
      v_today,v_due_date,coalesce(v_horse.owner,'Owner'),v_horse.horse_name,'Livery',1,v_amount,0,
      'Automatic monthly livery payment — '||v_horse.horse_name,'Pending'
    );
    v_created:=v_created+1;
  end loop;
  return v_created;
end;
$$;

revoke all on function public.cce_livery_monthly_amount(numeric,numeric,integer) from public,anon;
revoke all on function public.cce_create_monthly_livery_income() from public,anon,authenticated;

comment on function public.cce_create_monthly_livery_income() is
  'System-only: creates the current month''s Pending livery income row for each Available horse with Livery or AC Livery set, if one does not already exist, at the seasonal price (May–Sep A/C price, Oct–Apr livery price). Scheduled daily via pg_cron (job cce-monthly-livery-income); not callable by any client role.';

-- Unpaid automatic rows already created for the current month at the
-- off-season price are corrected to the seasonal price.
update public.income i
set amount_bd=public.cce_livery_monthly_amount(h.livery_bd,h.ac_livery_bd,extract(month from i.due_date)::integer)
from public.horses h
where trim(i.horse_name)=trim(h.horse_name)
  and i.activity='Livery'
  and i.status='Pending'
  and coalesce(i.paid_bd,0)=0
  and i.notes like 'Automatic monthly livery payment%'
  and to_char(i.due_date,'YYYY-MM')=to_char(timezone('Asia/Bahrain',now()),'YYYY-MM')
  and coalesce(h.livery_bd,0)>0 and coalesce(h.ac_livery_bd,0)>0
  and h.livery_bd<>h.ac_livery_bd
  and i.amount_bd=case when extract(month from i.due_date) between 5 and 9 then h.livery_bd else h.ac_livery_bd end;

commit;
