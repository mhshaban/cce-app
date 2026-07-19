-- CCE StableOS v4.8.0 — Training revenue split and instructor assignment
--
-- Additive migration. It never rewrites amount_bd or paid_bd:
--   * paid training cash is split 50/50 into generated reporting columns;
--   * every new paid training record must reference an active instructor;
--   * every new training schedule row must reference an active instructor;
--   * legacy schedule names are linked by exact case-insensitive match;
--   * trainer portal access uses the durable instructor id, with a legacy fallback.

begin;

do $$
begin
  if to_regclass('public.income') is null
     or to_regclass('public.schedule') is null
     or to_regclass('public.instructors') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'CCE v4.8.0 requires income, schedule, instructors, profiles and audit_logs';
  end if;
  if to_regprocedure('public.cce_has_permission(text)') is null then
    raise exception 'CCE v4.8.0 requires the unified member portal permission helpers';
  end if;
end $$;

-- Transaction guard: the migration must not alter customer amounts or paid cash.
create temporary table cce_v480_finance_guard on commit drop as
select count(*)::bigint as row_count,
       coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
       coalesce(sum(paid_bd),0)::numeric as total_paid_bd
from public.income;

-- ---------------------------------------------------------------------------
-- 1) Durable instructor links
-- ---------------------------------------------------------------------------
alter table public.income add column if not exists instructor_id bigint;
alter table public.schedule add column if not exists instructor_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='income_instructor_id_fkey'
      and conrelid='public.income'::regclass
  ) then
    alter table public.income
      add constraint income_instructor_id_fkey
      foreign key (instructor_id) references public.instructors(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='schedule_instructor_id_fkey'
      and conrelid='public.schedule'::regclass
  ) then
    alter table public.schedule
      add constraint schedule_instructor_id_fkey
      foreign key (instructor_id) references public.instructors(id) on delete restrict;
  end if;
end $$;

create index if not exists income_instructor_id_idx
  on public.income(instructor_id,date desc) where instructor_id is not null;
create index if not exists schedule_instructor_id_date_idx
  on public.schedule(instructor_id,date,start_time) where instructor_id is not null;

-- Exact matching is safe because instructors.name already has a case-insensitive
-- unique index in the reconstructable baseline.
update public.schedule s
set instructor_id=i.id,
    instructor=i.name
from public.instructors i
where s.instructor_id is null
  and nullif(trim(s.instructor),'') is not null
  and lower(trim(s.instructor))=lower(trim(i.name));

-- ---------------------------------------------------------------------------
-- 2) 50/50 split without touching customer totals or remaining balances
-- ---------------------------------------------------------------------------
alter table public.income add column if not exists stable_share_bd numeric(12,3)
  generated always as (
    case
      when lower(trim(coalesce(activity,''))) in ('lesson','training')
        then round(coalesce(paid_bd,0)::numeric/2,3)
      else coalesce(paid_bd,0)
    end
  ) stored;

alter table public.income add column if not exists instructor_share_bd numeric(12,3)
  generated always as (
    case
      when lower(trim(coalesce(activity,''))) in ('lesson','training')
        then coalesce(paid_bd,0)-round(coalesce(paid_bd,0)::numeric/2,3)
      else 0::numeric
    end
  ) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='income_training_share_sum_check'
      and conrelid='public.income'::regclass
  ) then
    alter table public.income add constraint income_training_share_sum_check
      check (stable_share_bd+instructor_share_bd=coalesce(paid_bd,0));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='income_training_instructor_required'
      and conrelid='public.income'::regclass
  ) then
    -- NOT VALID preserves old paid Lesson rows until the administrator assigns
    -- the correct instructor. PostgreSQL still enforces it for new/updated rows.
    alter table public.income add constraint income_training_instructor_required
      check (
        coalesce(paid_bd,0)<=0
        or lower(trim(coalesce(activity,''))) not in ('lesson','training')
        or instructor_id is not null
      ) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='schedule_training_instructor_required'
      and conrelid='public.schedule'::regclass
  ) then
    alter table public.schedule add constraint schedule_training_instructor_required
      check (
        lower(trim(coalesce(activity,''))) not in ('lesson','training')
        or instructor_id is not null
      ) not valid;
  end if;
end $$;

create or replace function public.cce_validate_training_income_instructor()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if lower(trim(coalesce(new.activity,''))) in ('lesson','training')
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

drop trigger if exists income_validate_training_instructor on public.income;
create trigger income_validate_training_instructor
before insert or update of paid_bd,activity,instructor_id on public.income
for each row execute function public.cce_validate_training_income_instructor();

create or replace function public.cce_validate_schedule_instructor()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_name text;
begin
  if new.instructor_id is not null then
    select i.name into v_name
    from public.instructors i
    where i.id=new.instructor_id and i.active is true;
    if v_name is null then
      raise exception 'The selected instructor is missing or inactive';
    end if;
    new.instructor:=v_name;
  elsif lower(trim(coalesce(new.activity,''))) in ('lesson','training') then
    raise exception 'Select an instructor for this training session';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_validate_instructor on public.schedule;
create trigger schedule_validate_instructor
before insert or update of activity,instructor_id,instructor on public.schedule
for each row execute function public.cce_validate_schedule_instructor();

create or replace function public.cce_audit_training_revenue_split()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if lower(trim(coalesce(new.activity,''))) in ('lesson','training')
     and coalesce(new.paid_bd,0)>0
     and (
       tg_op='INSERT'
       or old.paid_bd is distinct from new.paid_bd
       or old.instructor_id is distinct from new.instructor_id
     ) then
    insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
    values(
      'User: '||coalesce(auth.uid()::text,'system'),
      'training_revenue_split','income',new.id::text,
      case when tg_op='UPDATE' then jsonb_build_object(
        'paid_bd',old.paid_bd,'instructor_id',old.instructor_id,
        'stable_share_bd',old.stable_share_bd,'instructor_share_bd',old.instructor_share_bd
      ) end,
      jsonb_build_object(
        'paid_bd',new.paid_bd,'instructor_id',new.instructor_id,
        'stable_share_bd',new.stable_share_bd,'instructor_share_bd',new.instructor_share_bd
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists income_audit_training_revenue_split on public.income;
create trigger income_audit_training_revenue_split
after insert or update of paid_bd,activity,instructor_id on public.income
for each row execute function public.cce_audit_training_revenue_split();

-- ---------------------------------------------------------------------------
-- 3) Safe instructor directory for finance and scheduling forms
-- ---------------------------------------------------------------------------
create or replace function public.cce_instructor_directory()
returns setof jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if not (
    public.cce_has_permission('instructors.view')
    or public.cce_has_permission('schedule.view')
    or public.cce_has_permission('schedule.create')
    or public.cce_has_permission('schedule.update')
    or public.cce_has_permission('income.view')
    or public.cce_has_permission('income.create')
    or public.cce_has_permission('income.update')
  ) then
    raise exception 'Permission denied';
  end if;
  return query
  select jsonb_build_object('id',i.id,'name',i.name,'active',i.active)
  from public.instructors i
  order by i.active desc,i.name;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Trainer portal uses instructor_id; name matching remains as legacy fallback
-- ---------------------------------------------------------------------------
create or replace function public.cce_member_instructor_schedule()
returns setof jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_instructor_id bigint;
  v_name text;
begin
  if not public.cce_has_permission('schedule.view_own') then raise exception 'Permission denied'; end if;
  select i.id,i.name into v_instructor_id,v_name
  from public.profiles p
  join public.instructors i on i.id=p.instructor_id
  where p.id=auth.uid() and p.is_active=true and i.active is true;
  if v_instructor_id is null then raise exception 'Instructor mapping is missing or inactive'; end if;
  return query
  select to_jsonb(s)||jsonb_build_object('instructor',v_name,'instructor_id',v_instructor_id)
  from public.schedule s
  where s.instructor_id=v_instructor_id
     or (s.instructor_id is null and lower(trim(s.instructor))=lower(trim(v_name)))
  order by s.date,s.start_time;
end;
$$;

create or replace function public.cce_member_instructor_update_schedule(
  p_schedule_id bigint,
  p_status text default null,
  p_notes text default null
)
returns setof jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_instructor_id bigint;
  v_name text;
begin
  if not public.cce_has_permission('schedule.update_own') then raise exception 'Permission denied'; end if;
  select i.id,i.name into v_instructor_id,v_name
  from public.profiles p
  join public.instructors i on i.id=p.instructor_id
  where p.id=auth.uid() and p.is_active=true and i.active is true;
  if v_instructor_id is null then raise exception 'Instructor mapping is missing or inactive'; end if;
  return query
  with changed as (
    update public.schedule s set
      status=coalesce(p_status,s.status),
      notes=case when p_notes is null then s.notes else p_notes end
    where s.id=p_schedule_id
      and (
        s.instructor_id=v_instructor_id
        or (s.instructor_id is null and lower(trim(s.instructor))=lower(trim(v_name)))
      )
    returning s.*
  )
  select to_jsonb(changed)||jsonb_build_object('instructor',v_name,'instructor_id',v_instructor_id)
  from changed;
  if not found then raise exception 'Schedule row not found or not linked to this trainer'; end if;
end;
$$;

revoke all on function public.cce_validate_training_income_instructor() from public,anon,authenticated;
revoke all on function public.cce_validate_schedule_instructor() from public,anon,authenticated;
revoke all on function public.cce_audit_training_revenue_split() from public,anon,authenticated;
revoke all on function public.cce_instructor_directory() from public,anon;
revoke all on function public.cce_member_instructor_schedule() from public,anon;
revoke all on function public.cce_member_instructor_update_schedule(bigint,text,text) from public,anon;
grant execute on function public.cce_member_instructor_schedule() to authenticated;
grant execute on function public.cce_member_instructor_update_schedule(bigint,text,text) to authenticated;
grant execute on function public.cce_instructor_directory() to authenticated;

comment on column public.income.instructor_id is 'Financial instructor receiving the immediate 50% share of paid training cash.';
comment on column public.income.stable_share_bd is 'Stable share of paid cash; 50% for training and 100% for other income.';
comment on column public.income.instructor_share_bd is 'Instructor share of paid training cash; zero for other income.';
comment on column public.schedule.instructor_id is 'Durable active instructor assignment for this scheduled session.';

do $$
declare
  v_before record;
  v_after record;
begin
  select * into v_before from cce_v480_finance_guard;
  select count(*)::bigint as row_count,
         coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
         coalesce(sum(paid_bd),0)::numeric as total_paid_bd
  into v_after
  from public.income;
  if v_after.row_count is distinct from v_before.row_count
     or v_after.total_amount_bd is distinct from v_before.total_amount_bd
     or v_after.total_paid_bd is distinct from v_before.total_paid_bd then
    raise exception 'CCE v4.8.0 finance guard failed: amount_bd or paid_bd changed';
  end if;
end;
$$;

commit;
