-- Compatibility rollback for v4.23.0 (dashboard financial-summary permission).
-- Removes the role grants and the permission row itself. This does not
-- affect any other data. Emergency use only — after rollback, the frontend
-- check for this permission simply evaluates to false for everyone (via
-- cce_has_permission's default-deny), which is the same visual effect as
-- the accountant role already gets, so no functional breakage results.

begin;

delete from public.role_permissions where permission_code='dashboard.financial_summary.view';
delete from public.app_permissions where code='dashboard.financial_summary.view';

commit;
