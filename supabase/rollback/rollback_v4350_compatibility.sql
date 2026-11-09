-- Compatibility rollback for v4.35.0 (Bran stock).
-- Drops the Bran stock functions, tables (all recorded bag entries are lost)
-- and the feed.* permissions. Nothing else is touched. Emergency use only.

begin;

drop function if exists public.cce_feed_summary(date);
drop function if exists public.cce_feed_account_month(bigint,date);
drop table if exists public.feed_ledger;
drop table if exists public.feed_accounts;
drop table if exists public.feed_settings;
delete from public.user_permissions where permission_code in ('feed.view','feed.manage');
delete from public.role_permissions where permission_code in ('feed.view','feed.manage');
delete from public.app_permissions where code in ('feed.view','feed.manage');

commit;
