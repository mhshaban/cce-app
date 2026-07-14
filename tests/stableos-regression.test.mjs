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
  for(const pattern of [/esc\(r\.customer_name/,/esc\(r\.horse_name/,/esc\(r\.start_time/,/esc\(pkg\|\|notes/,/esc\(r\.status/]){
    assert.match(bookings,pattern);
  }
  const editIncome=functionBlock(core,'editIncome','saveIncome');
  assert.match(editIncome,/escAttr\(r\.customer_name/);
  assert.match(editIncome,/escAttr\(r\.notes/);
  assert.match(core,/\$\{esc\(g\.name\)\}/);
  assert.match(core,/'🐴 Horse: <strong>'\+esc\(horse\)/);
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

test('all app assets use the v4.6.5 cache key',()=>{
  const html=read('index.html');
  assert.ok(!html.includes('20260713-464'));
  assert.ok((html.match(/20260714-465/g)||[]).length>=20);
  assert.match(read('app-bootstrap.js'),/stableos-20260714-465/);
  assert.match(read('app-core.js'),/sw\.js\?v=20260714-465/);
});
