-- Country Club Equestrian — username login upgrade
-- Adds unique member usernames while retaining email login compatibility.

begin;

alter table public.profiles add column if not exists username text;

create or replace function public.cce_normalize_username(p_username text)
returns text
language sql
immutable
set search_path=public
as $$
  select nullif(lower(regexp_replace(trim(coalesce(p_username,'')), '[^a-zA-Z0-9._-]+', '', 'g')), '');
$$;

-- Give existing accounts a predictable unique username based on the email local part.
do $$
declare
  rec record;
  base_name text;
  candidate text;
  suffix_no integer;
begin
  for rec in
    select id,email
    from public.profiles
    where username is null or trim(username)=''
    order by created_at,id
  loop
    base_name := public.cce_normalize_username(split_part(coalesce(rec.email,''),'@',1));
    if base_name is null or char_length(base_name)<3 then
      base_name := 'member_' || substr(replace(rec.id::text,'-',''),1,8);
    elsif base_name !~ '^[a-z0-9]' then
      base_name := 'member_' || base_name;
    end if;
    base_name := left(base_name,32);
    candidate := base_name;
    suffix_no := 1;
    while exists (
      select 1 from public.profiles p
      where p.id<>rec.id and lower(p.username)=lower(candidate)
    ) loop
      candidate := left(base_name, greatest(3,30-char_length(suffix_no::text))) || '_' || suffix_no::text;
      suffix_no := suffix_no + 1;
    end loop;
    update public.profiles set username=candidate where id=rec.id;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.profiles'::regclass
      and conname='profiles_username_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
  end if;
end $$;

create unique index if not exists profiles_username_lower_key
  on public.profiles(lower(username))
  where username is not null;

create or replace function public.cce_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text;
begin
  v_username := public.cce_normalize_username(new.raw_user_meta_data->>'username');
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then
    v_username := null;
  end if;

  insert into public.profiles(id,email,username,full_name,phone,role_id,is_active)
  values(
    new.id,
    new.email,
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.phone,
    public.cce_default_role_id(),
    true
  )
  on conflict (id) do update set
    email=excluded.email,
    username=coalesce(public.profiles.username,excluded.username);
  return new;
end;
$$;

create or replace function public.cce_my_access()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',p.id,'email',p.email,'username',p.username,'full_name',p.full_name,'phone',p.phone,
      'role_id',p.role_id,'is_active',p.is_active,'owner_name',p.owner_name,'instructor_id',p.instructor_id
    ),
    'role',jsonb_build_object('id',r.id,'code',r.code,'name_en',r.name_en,'name_ar',r.name_ar),
    'portal',case when r.code='owner' then 'owner' when r.code='trainer' then 'trainer' else 'dashboard' end,
    'instructor_name',(select i.name from public.instructors i where i.id=p.instructor_id limit 1),
    'permissions',coalesce((
      select jsonb_agg(ap.code order by ap.code)
      from public.app_permissions ap
      where public.cce_has_permission(ap.code)
    ),'[]'::jsonb)
  )
  from public.profiles p
  left join public.app_roles r on r.id=p.role_id
  where p.id=auth.uid() and p.is_active is true
  limit 1;
$$;

-- Public resolver used only to translate a username to the Auth email identifier.
-- Password verification remains fully handled by Supabase Auth.
create or replace function public.cce_resolve_login_identifier(p_identifier text)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_identifier text := trim(coalesce(p_identifier,''));
  v_email text;
begin
  if v_identifier='' then return null; end if;
  if position('@' in v_identifier)>0 then return lower(v_identifier); end if;

  select p.email into v_email
  from public.profiles p
  where p.is_active is true
    and lower(p.username)=lower(v_identifier)
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.cce_resolve_login_identifier(text) from public;
grant execute on function public.cce_resolve_login_identifier(text) to anon,authenticated;
grant execute on function public.cce_normalize_username(text) to authenticated;

commit;
