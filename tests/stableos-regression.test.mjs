import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const functionBlock=(source,name,nextName)=>{
  const start=source.indexOf(`function ${name}`);
  const end=source.indexOf(`function ${nextName}`,start+1);
  assert.ok(start>=0,`missing function ${name}`);
  assert.ok(end>start,`missing function boundary ${nextName}`);
  return source.slice(start,end);
};

function healthService(){
  const context={Intl,Date,console};
  context.window=context;
  vm.runInNewContext(read('src/modules/health/health-service.js'),context,{filename:'health-service.js'});
  return context.window.CCE.health;
}

test('mobile headers share the home-page safe-area gap',()=>{
  const css=read('src/components/header/header-system.css');
  assert.match(css,/--cce-header-safe-gap:8px/);
  assert.match(css,/\.cce-public-responsive-header,[\s\S]*\.cce-service-responsive-header,[\s\S]*\.cce-legacy-header/);
  assert.doesNotMatch(css,/safe-area-inset-top[^;}]*\+\s*(?:6[0-9]|7[0-9])px/);
});

test('completed Farrier care updates the client horse summary using Bahrain date',()=>{
  const {mergeCompletedSummaries}=healthService();
  const horses=[{id:7,horse_name:'Najd',farrier_date:'2026-06-01'}];
  const events=[{
    id:9,horse_id:7,event_scope:'care',event_type:'Farrier',event_date:'2026-07-12',
    status:'Completed',completed_at:'2026-07-12T22:30:00.000Z',assigned_to:'Ahmed'
  }];
  const [horse]=mergeCompletedSummaries(horses,events);
  assert.equal(horse.farrier_date,'2026-07-13');
  assert.equal(horse.farrier_name,'Ahmed');
});

test('pending events do not change summaries and newer manual dates are preserved',()=>{
  const {mergeCompletedSummaries}=healthService();
  const horses=[{id:1,farrier_date:'2026-08-01'},{id:2,farrier_date:null}];
  const events=[
    {id:1,horse_id:1,event_scope:'medical',event_type:'Farrier',event_date:'2026-07-01',status:'Completed'},
    {id:2,horse_id:2,event_scope:'care',event_type:'Farrier',event_date:'2026-07-01',status:'Pending'}
  ];
  const merged=mergeCompletedSummaries(horses,events);
  assert.equal(merged[0].farrier_date,'2026-08-01');
  assert.equal(merged[1].farrier_date,null);
});

test('notification loading, permissions and session field names stay wired',()=>{
  const portal=read('member-portal.js');
  const core=read('app-core.js');
  assert.match(portal,/notifications:\s*\['notifications\.view',\s*'settings\.manage'\]/);
  for(const call of ["safeInvoke('buildAlerts')","safeInvoke('initNotifications')","safeInvoke('checkScheduledNotifications')"]){
    assert.ok(portal.includes(call),`missing ${call}`);
  }
  assert.match(core,/select=id,date,start_time,activity,horse_name,customer_name,instructor,status/);
  assert.doesNotMatch(core,/select=id,date,start_time,activity,horse,customer,instructor,status/);
});

test('database migration owns completion-to-summary synchronization',()=>{
  const sql=read('supabase/migrations/20260713_health_event_summary_sync_v464.sql');
  assert.match(sql,/create trigger cce_health_event_sync_horse_summary/i);
  assert.match(sql,/when 'Farrier'/);
  assert.match(sql,/farrier_date=/);
  assert.match(sql,/timezone\('Asia\/Bahrain',new\.completed_at\)/);
});

test('public booking data is escaped before admin or success-page rendering',()=>{
  const core=read('app-core.js');
  const bookings=functionBlock(core,'renderBookings','openModal');
  for(const pattern of [/esc\(customer/,/esc\(phone/,/esc\(horse/,/esc\(String\(start\)/,/esc\(pkg\|\|notes/,/esc\(r\.status/]){
    assert.match(bookings,pattern);
  }
  assert.match(bookings,/bookings\.sensitive\.view/);
  assert.match(bookings,/cce_booking_private_details/);
  const editIncome=functionBlock(core,'editIncome','saveIncome');
  assert.match(editIncome,/escAttr\(r\.customer_name/);
  assert.match(editIncome,/escAttr\(r\.notes/);
  assert.match(core,/\$\{esc\(g\.name\)\}/);
  assert.match(core,/'🐴 Horse: <strong>'\+esc\(horse\)/);
});

test('public booking submission is a server-owned atomic transaction',()=>{
  const core=read('app-core.js');
  const runtime=read('src/services/supabase-runtime.js');
  const sql=read('supabase/migrations/20260719_security_database_foundation_v470.sql');
  assert.doesNotMatch(runtime,/publicPostIncome/);
  for(const name of ['submitBooking','submitTraining','submitLivery']){
    assert.match(core.slice(core.indexOf(`function ${name}`)),/publicSubmitBooking\(/,`${name} must use the validated RPC`);
  }
  assert.match(sql,/create or replace function public\.cce_public_submit_booking/i);
  assert.match(sql,/from public\.public_booking_services[\s\S]*active is true/i);
  assert.match(sql,/pg_advisory_xact_lock\(hashtextextended\('cce-public-capacity:/i);
  assert.match(sql,/insert into public\.booking_requests[\s\S]*insert into public\.income/i);
  assert.match(sql,/revoke insert on public\.income from anon/i);
  assert.match(sql,/Unsupported terms version/);
  assert.doesNotMatch(sql,/v_notes[^;]*(personal_id|emergency_contact|health_notes)/i);
});

test('booking lifecycle and sensitive data cannot be patched directly by browsers',()=>{
  const core=read('app-core.js');
  const sql=read('supabase/migrations/20260719_security_database_foundation_v470.sql');
  const status=functionBlock(core,'updateBookingStatus','viewBookingSafety');
  assert.match(status,/cce_update_booking_status/);
  assert.doesNotMatch(status,/sbPatch\('booking_requests'/);
  assert.match(sql,/grant select on public\.booking_requests to authenticated/i);
  assert.doesNotMatch(sql,/grant select,insert,update,delete on public\.booking_requests/i);
  assert.doesNotMatch(sql,/grant select[^;]*booking_private_details to authenticated/i);
  assert.match(sql,/Invalid booking status transition/);
  assert.match(sql,/read_sensitive[\s\S]*booking_private_details/);
});

test('new Auth users are inactive and role-less until admin provisioning',()=>{
  const sql=read('supabase/migrations/20260719_security_database_foundation_v470.sql');
  const handler=sql.slice(sql.indexOf('create or replace function public.cce_handle_new_auth_user'),sql.indexOf('-- ---------------------------------------------------------------------------\n-- 3)'));
  assert.match(sql,/alter table public\.profiles alter column is_active set default false/i);
  assert.match(handler,/null,\s*false/);
  assert.doesNotMatch(handler,/cce_default_role_id/);
});

test('horse health security is scope-aware and summaries are rebuildable',()=>{
  const sql=read('supabase/migrations/20260719_security_database_foundation_v470.sql');
  assert.match(sql,/event_scope='medical' and public\.cce_has_permission\('horse_medical\.view'\)/);
  assert.match(sql,/event_scope='vaccination' and public\.cce_has_permission\('horse_vaccinations\.manage'\)/);
  assert.match(sql,/event_scope='care' and public\.cce_has_permission\('horse_care\.manage'\)/);
  assert.match(sql,/after insert or update or delete on public\.horse_health_events/i);
  assert.match(sql,/if tg_op='DELETE'/i);
  assert.match(sql,/horses_legacy_farrier/);
  assert.match(sql,/perform public\.cce_recompute_horse_health_summary\(old\.horse_id,old\.event_type\)/);
});

test('Supabase reads preserve explicit ordering and add one safe default',async()=>{
  const runtime=read('src/services/supabase-runtime.js');
  const urls=[];
  const context={
    SB_URL:'https://example.supabase.co',HDR:{},
    fetch:async url=>{urls.push(url);return {ok:true,json:async()=>[]};},
    Error,String
  };
  vm.runInNewContext('async '+functionBlock(runtime,'sbGet','tableRowsForAudit'),context);
  await context.sbGet('schedule','select=*&order=date.asc,start_time.asc&limit=10');
  await context.sbGet('horses','select=*&limit=10');
  assert.equal((urls[0].match(/order=/g)||[]).length,1);
  assert.match(urls[0],/order=date\.asc,start_time\.asc/);
  assert.match(urls[1],/order=id\.asc/);
});

test('the repository contains a reconstructable Supabase baseline and ordered chain',()=>{
  assert.match(read('supabase/baseline/legacy_core_schema.sql'),/create table public\.income/i);
  assert.match(read('supabase/baseline/legacy_core_schema.sql'),/create table public\.horses/i);
  for(const file of [
    'supabase/migrations/20260710_unified_member_portal.sql',
    'supabase/migrations/20260711_horse_health_phase1.sql',
    'supabase/migrations/20260712_database_consolidation_v310.sql',
    'supabase/migrations/20260719_security_database_foundation_v470.sql',
    'supabase/verification/preflight_v470.sql',
    'supabase/verification/verify_v470.sql',
    'supabase/maintenance/20260719_finance_pre_v470_repair.sql',
    'supabase/rollback/rollback_20260719_finance_pre_v470_repair.sql',
    'supabase/rollback/rollback_v470_compatibility.sql'
  ]) assert.ok(fs.existsSync(path.join(root,file)),`missing ${file}`);
});

test('all local entry-point assets exist',()=>{
  const html=read('index.html');
  const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
  const local=refs.filter(ref=>!ref.startsWith('http')&&!ref.startsWith('data:')&&!ref.startsWith('#'));
  for(const ref of local){
    const clean=ref.split('?')[0].replace(/^\.\//,'');
    assert.ok(fs.existsSync(path.join(root,clean)),`missing local asset ${clean}`);
  }
  for(const entry of ['book/index.html','stable/index.html','instructor/index.html']){
    assert.ok(fs.existsSync(path.join(root,entry)),`missing entry point ${entry}`);
  }
});

test('paid expenses cannot create a plan and metadata edits preserve Paid BD',()=>{
  const core=read('app-core.js');
  const cell=functionBlock(core,'expenseInstallmentsCell','bahrainDateISO');
  assert.match(cell,/isPaidRow\(r\)/);
  assert.match(cell,/No plan needed/);
  const save=functionBlock(core,'saveExpenseMetaPatch','addExpenseInstallment');
  assert.doesNotMatch(save,/else if\(cleanInstallments\.length\)/);
  const add=functionBlock(core,'addExpenseInstallment','payExpenseInstallment');
  assert.match(add,/isPaidRow\(r\)\|\|!hasRemaining\(r\)/);
  assert.match(add,/openingPaidInstallment\(r,r\.paid_bd\)/);
  assert.match(add,/cannot exceed expense remaining/);
  assert.match(core,/paidValue=hasPlan\?Math\.max\(plan\.paid,moneyNum\(r\.paid_bd\)\)/);
});

test('recent dashboard activity combines income and expenses by latest operation',()=>{
  const core=read('app-core.js');
  const context={Date,Math,Number,readAuditLog:()=>[
    {ts:'2026-07-14T08:02:00Z',table_name:'expenses',record_id:'1',action:'create'},
    {ts:'2026-07-14T08:01:00Z',table_name:'income',record_id:'99',action:'create'}
  ]};
  vm.runInNewContext(functionBlock(core,'recentFinancialActivityRows','recentFinancialActivityHTML'),context);
  const rows=context.recentFinancialActivityRows(
    [{id:99,date:'2026-07-14',customer_name:'Income'}],
    [{id:1,date:'2026-07-14',supplier:'Expense'}],
    10
  );
  assert.equal(rows.length,2);
  assert.equal(rows[0].kind,'Expense');
  const crossDevice=context.recentFinancialActivityRows(
    [{id:99,date:'2026-07-14',updated_at:'2026-07-14T09:00:00Z',customer_name:'Income'}],
    [{id:1,date:'2026-07-14',updated_at:'2026-07-14T08:30:00Z',supplier:'Expense'}],
    10
  );
  assert.equal(crossDevice[0].kind,'Income');
  assert.match(read('index.html'),/Recent Financial Activity \(Last 10\)/);
});

test('Bahrain date boundaries and reminder windows are deterministic',()=>{
  const core=read('app-core.js');
  const context={Intl,Date};
  vm.runInNewContext(functionBlock(core,'bahrainDateISO','todayISOForInstallment'),context);
  assert.equal(context.bahrainDateISO(new Date('2026-07-13T22:30:00.000Z')),'2026-07-14');
  const reminders=functionBlock(core,'checkSessionReminders','sendBrowserPush');
  assert.match(reminders,/if\(diff<=36e5\)\{[\s\S]*\}\s*else if\(diff<=864e5/);
});

test('all app assets use the v4.7.0 cache key',()=>{
  const html=read('index.html');
  assert.ok(!html.includes('20260714-465'));
  assert.ok((html.match(/20260719-470/g)||[]).length>=20);
  assert.match(read('app-bootstrap.js'),/stableos-20260719-470/);
  assert.match(read('app-core.js'),/sw\.js\?v=20260719-470/);
  assert.equal(read('VERSION.txt').trim(),'4.7.0');
});
