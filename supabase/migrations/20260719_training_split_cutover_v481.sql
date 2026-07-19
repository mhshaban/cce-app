-- CCE StableOS v4.8.1 — explicit training split cutover
--
-- Production v4.8.0 revealed historical Lesson rows whose stored amount was
-- already the stable's share. This corrective migration preserves every old
-- income row as unsplit and applies 50/50 only to new training income or to a
-- legacy row that an administrator explicitly opts into later.
-- amount_bd and paid_bd are never rewritten.

begin;

do $$
begin
  if to_regclass('public.income') is null
     or to_regclass('public.instructors') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='income' and column_name='stable_share_bd'
     ) then
    raise exception 'CCE v4.8.1 requires the v4.8.0 training migration first';
  end if;
end;
$$;

create temporary table cce_v481_finance_guard on commit drop as
select count(*)::bigint as row_count,
       coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
       coalesce(sum(paid_bd),0)::numeric as total_paid_bd
from public.income;

-- Remove v4.8.0 enforcement before marking all pre-cutover rows as legacy.
drop trigger if exists income_validate_training_instructor on public.income;
drop trigger if exists income_audit_training_revenue_split on public.income;
alter table public.income drop constraint if exists income_training_instructor_required;
alter table public.income drop constraint if exists income_training_share_sum_check;
alter table public.income drop constraint if exists income_training_split_category_check;

alter table public.income
  add column if not exists training_split_enabled boolean not null default false;

-- The column is created as false for all rows that existed at cutover. Keep a
-- false default; a BEFORE INSERT trigger enables it only for new training rows.
alter table public.income alter column training_split_enabled set default false;

alter table public.income drop column if exists stable_share_bd;
alter table public.income drop column if exists instructor_share_bd;

alter table public.income add column stable_share_bd numeric(12,3)
  generated always as (
    case
      when training_split_enabled
       and lower(trim(coalesce(activity,''))) in ('lesson','training')
        then round(coalesce(paid_bd,0)::numeric/2,3)
      else coalesce(paid_bd,0)
    end
  ) stored;

alter table public.income add column instructor_share_bd numeric(12,3)
  generated always as (
    case
      when training_split_enabled
       and lower(trim(coalesce(activity,''))) in ('lesson','training')
        then coalesce(paid_bd,0)-round(coalesce(paid_bd,0)::numeric/2,3)
      else 0::numeric
    end
  ) stored;

alter table public.income add constraint income_training_share_sum_check
  check (stable_share_bd+instructor_share_bd=coalesce(paid_bd,0));

alter table public.income add constraint income_training_split_category_check
  check (
    training_split_enabled is false
    or lower(trim(coalesce(activity,''))) in ('lesson','training')
  );

alter table public.income add constraint income_training_instructor_required
  check (
    training_split_enabled is false
    or coalesce(paid_bd,0)<=0
    or instructor_id is not null
  ) not valid;

create or replace function public.cce_prepare_training_split()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare
  v_new_training boolean:=lower(trim(coalesce(new.activity,''))) in ('lesson','training');
  v_old_training boolean:=case when tg_op='UPDATE'
    then lower(trim(coalesce(old.activity,''))) in ('lesson','training')
    else false end;
begin
  if not v_new_training then
    new.training_split_enabled:=false;
  elsif tg_op='INSERT' or (tg_op='UPDATE' and not v_old_training) then
    new.training_split_enabled:=true;
  elsif tg_op='UPDATE'
    and v_old_training
    and old.training_split_enabled is true
    and new.training_split_enabled is false
    and coalesce(old.paid_bd,0)>0 then
    raise exception 'A recorded training split cannot be disabled; create an audited correction instead';
  end if;
  return new;
end;
$$;

drop trigger if exists income_prepare_training_split on public.income;
create trigger income_prepare_training_split
before insert or update of activity,training_split_enabled on public.income
for each row execute function public.cce_prepare_training_split();

create or replace function public.cce_validate_training_income_instructor()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.training_split_enabled is true
     and lower(trim(coalesce(new.activity,''))) in ('lesson','training')
     and coalesce(new.paid_bd,0)>0 then
    if new.instructor_id is null then
      raise exception 'Select an instructor before recording a training payment';
    end if;
    if not exists (
      select 1 from public.instructors i
      where i.id=new.instructor_id and i.active is true
    ) then
      raise exception 'The selected instructor is missing or inactive';
    end if;
  end if;
  return new;
end;
$$;

create trigger income_validate_training_instructor
before insert or update of paid_bd,activity,instructor_id,training_split_enabled on public.income
for each row execute function public.cce_validate_training_income_instructor();

create or replace function public.cce_audit_training_revenue_split()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.training_split_enabled is true
     and lower(trim(coalesce(new.activity,''))) in ('lesson','training')
     and coalesce(new.paid_bd,0)>0
     and (
       tg_op='INSERT'
       or old.paid_bd is distinct from new.paid_bd
       or old.instructor_id is distinct from new.instructor_id
       or old.training_split_enabled is distinct from new.training_split_enabled
     ) then
    insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
    values(
      'User: '||coalesce(auth.uid()::text,'system'),
      'training_revenue_split','income',new.id::text,
      case when tg_op='UPDATE' then jsonb_build_object(
        'paid_bd',old.paid_bd,'instructor_id',old.instructor_id,
        'training_split_enabled',old.training_split_enabled,
        'stable_share_bd',old.stable_share_bd,'instructor_share_bd',old.instructor_share_bd
      ) end,
      jsonb_build_object(
        'paid_bd',new.paid_bd,'instructor_id',new.instructor_id,
        'training_split_enabled',new.training_split_enabled,
        'stable_share_bd',new.stable_share_bd,'instructor_share_bd',new.instructor_share_bd
      )
    );
  end if;
  return new;
end;
$$;

create trigger income_audit_training_revenue_split
after insert or update of paid_bd,activity,instructor_id,training_split_enabled on public.income
for each row execute function public.cce_audit_training_revenue_split();

revoke all on function public.cce_prepare_training_split() from public,anon,authenticated;
revoke all on function public.cce_validate_training_income_instructor() from public,anon,authenticated;
revoke all on function public.cce_audit_training_revenue_split() from public,anon,authenticated;

comment on column public.income.training_split_enabled is
  'False for pre-v4.8.1 legacy Lesson rows; true for new training cash that receives the immediate 50/50 split.';

do $$
declare
  v_before record;
  v_after record;
begin
  select * into v_before from cce_v481_finance_guard;
  select count(*)::bigint as row_count,
         coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
         coalesce(sum(paid_bd),0)::numeric as total_paid_bd
  into v_after
  from public.income;
  if v_after.row_count is distinct from v_before.row_count
     or v_after.total_amount_bd is distinct from v_before.total_amount_bd
     or v_after.total_paid_bd is distinct from v_before.total_paid_bd then
    raise exception 'CCE v4.8.1 finance guard failed: amount_bd or paid_bd changed';
  end if;
end;
$$;

commit;
