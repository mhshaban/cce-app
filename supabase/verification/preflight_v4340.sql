-- CCE StableOS v4.34.0 — Daily paddock schedule preflight
-- Every *_ready column must be true. horses_found should be 21 (the horses
-- named on the starting board); a lower number means a name did not match.

select
  to_regclass('public.app_permissions') is not null and to_regclass('public.role_permissions') is not null as permissions_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as has_permission_ready,
  to_regprocedure('public.cce_touch_updated_at()') is not null as touch_ready,
  (select count(distinct lower(trim(horse_name))) from public.horses where lower(trim(horse_name)) in (
    'dark ash','warda','bentli','shumokh','senorita','nile night','azart','vale do sol','n snow',
    'androus','emperor','dastan','sultan de marina','maya','badal','blaze','tameem','flame spirit',
    'brihanna','hanan','tofan')) as horses_found;

do $$
begin
  if to_regclass('public.app_permissions') is null
     or to_regprocedure('public.cce_has_permission(text)') is null
     or to_regprocedure('public.cce_touch_updated_at()') is null then
    raise exception 'CCE unified member portal (v4.7.0) must be applied before the paddock schedule';
  end if;
end $$;
