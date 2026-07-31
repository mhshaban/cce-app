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

function showOfficeCompetitionService(overrides={}){
  const context={Intl,Date,Object,String,Error,...overrides};
  context.window=context;
  vm.runInNewContext(read('src/modules/show-office/competition-service.js'),context,{filename:'competition-service.js'});
  return context.window.CCE.showOffice.competitionService;
}

function showOfficeClassService(overrides={}){
  const context={Intl,Date,Object,String,Number,Error,...overrides};
  context.window=context;
  vm.runInNewContext(read('src/modules/show-office/class-service.js'),context,{filename:'class-service.js'});
  return context.window.CCE.showOffice.classService;
}

function showOfficeEntryService(overrides={}){
  const context={Intl,Date,Object,Array,String,Number,Error,Map,Set,...overrides};
  context.window=context;
  vm.runInNewContext(read('src/modules/show-office/entry-service.js'),context,{filename:'entry-service.js'});
  return context.window.CCE.showOffice.entryService;
}

function showOfficeJudgingService(overrides={}){
  const context={Intl,Date,Object,Array,String,Number,Error,Map,Set,...overrides};
  context.window=context;
  vm.runInNewContext(read('src/modules/show-office/judging-service.js'),context,{filename:'judging-service.js'});
  return context.window.CCE.showOffice.judgingService;
}

function backupRuntimeContext({providers={},jsonProviders={},post=async()=>[]}={}){
  const context={Object,Array,String,Error,console:{warn(){}},sbPost:post,CCE:{restoreProviders:providers,jsonBackupProviders:jsonProviders}};
  context.window=context;
  vm.runInNewContext(read('src/services/backup-runtime.js'),context,{filename:'backup-runtime.js'});
  return context.window.CCE;
}

function backupRestoreRuntime(options={}){
  return backupRuntimeContext(options).backupRestore;
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

test('only the active portal exposes its logout action',()=>{
  const portal=read('member-portal.js');
  const sync=functionBlock(portal,'syncMemberLogoutButtons','updateMemberChrome');
  for(const mapping of [
    /logoutAdminBtn:\s*\{pages:\['dashboard','instructor'\]/,
    /logoutOwnerBtn:\s*\{page:'owner'/,
    /instrLogoutBtn:\s*\{page:'instructor'/
  ]) assert.match(sync,mapping);
  assert.match(sync,/const pages = route\.pages \|\| \[route\.page\]/);
  assert.match(sync,/!pages\.includes\(activePage\)/);
  const owner=functionBlock(portal,'openOwnerMemberPortal','secureMemberOwnerUpdate');
  assert.match(owner,/classList\.contains\('page-owner'\)/);
  assert.doesNotMatch(owner,/logoutOwnerBtn[\s\S]*classList\.remove\('hidden'\)/);
  assert.match(read('src/components/header/header-system.css'),/\.cce-header-action\.hidden\s*\{display:none!important\}/);
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

test('Supabase exact counts use a HEAD request and reject malformed totals',async()=>{
  const runtime=read('src/services/supabase-runtime.js');
  const calls=[];
  const context={
    SB_URL:'https://example.supabase.co',SB_KEY:'key',SB_ACCESS_TOKEN:'token',HDR:{},
    buildHeaders:()=>({Prefer:'count=exact'}),
    fetch:async(url,options)=>{
      calls.push({url,options});
      return {ok:true,headers:{get:name=>name==='content-range'?'0-0/2145':''},text:async()=>''};
    },
    Error,String,Number
  };
  vm.runInNewContext('async '+functionBlock(runtime,'sbCount','tableRowsForAudit'),context);
  assert.equal(await context.sbCount('show_office_classes','competition_id=eq.9'),2145);
  assert.equal(calls[0].options.method,'HEAD');
  assert.equal(calls[0].options.headers.Range,'0-0');
  assert.match(calls[0].url,/show_office_classes\?select=id&competition_id=eq\.9/);
  context.fetch=async()=>({ok:true,headers:{get:()=>''},text:async()=>''});
  await assert.rejects(context.sbCount('show_office_classes'),/invalid count response/i);
});

test('the repository contains a reconstructable Supabase baseline and ordered chain',()=>{
  assert.match(read('supabase/baseline/legacy_core_schema.sql'),/create table public\.income/i);
  assert.match(read('supabase/baseline/legacy_core_schema.sql'),/create table public\.horses/i);
  for(const file of [
    'supabase/migrations/20260710_unified_member_portal.sql',
    'supabase/migrations/20260711_horse_health_phase1.sql',
    'supabase/migrations/20260712_database_consolidation_v310.sql',
    'supabase/migrations/20260719_security_database_foundation_v470.sql',
    'supabase/migrations/20260719_training_revenue_instructor_v480.sql',
    'supabase/migrations/20260719_training_split_cutover_v481.sql',
    'supabase/migrations/20260719_training_booking_schedule_v482.sql',
    'supabase/migrations/20260721_show_office_sprint1_v490.sql',
    'supabase/migrations/20260721_show_office_sprint1_v491_backup_restore.sql',
    'supabase/migrations/20260722_show_office_sprint2_classes_v4100.sql',
    'supabase/migrations/20260723_show_office_sprint3_entries_v4110.sql',
    'supabase/migrations/20260724_show_office_sprint4_judging_v4120.sql',
    'supabase/migrations/20260725_show_office_sprint5_live_results_v4130.sql',
    'supabase/migrations/20260726_show_office_fence_scoring_v4140.sql',
    'supabase/migrations/20260728_show_office_accumulator_joker_v4150.sql',
    'supabase/migrations/20260729_show_office_accumulator_joker_fix_v4151.sql',
    'supabase/migrations/20260730_show_office_joker_alternate_fence_v4160.sql',
    'supabase/migrations/20260731_booking_payment_deadline_v4170.sql',
    'supabase/verification/preflight_v470.sql',
    'supabase/verification/verify_v470.sql',
    'supabase/verification/preflight_v480.sql',
    'supabase/verification/verify_v480.sql',
    'supabase/verification/preflight_v481.sql',
    'supabase/verification/verify_v481.sql',
    'supabase/verification/preflight_v482.sql',
    'supabase/verification/verify_v482.sql',
    'supabase/verification/preflight_v490.sql',
    'supabase/verification/verify_v490.sql',
    'supabase/verification/preflight_v491.sql',
    'supabase/verification/verify_v491.sql',
    'supabase/verification/preflight_v4100.sql',
    'supabase/verification/verify_v4100.sql',
    'supabase/verification/preflight_v4110.sql',
    'supabase/verification/verify_v4110.sql',
    'supabase/verification/preflight_v4120.sql',
    'supabase/verification/verify_v4120.sql',
    'supabase/verification/preflight_v4130.sql',
    'supabase/verification/verify_v4130.sql',
    'supabase/verification/preflight_v4140.sql',
    'supabase/verification/verify_v4140.sql',
    'supabase/verification/preflight_v4150.sql',
    'supabase/verification/verify_v4150.sql',
    'supabase/verification/preflight_v4151.sql',
    'supabase/verification/verify_v4151.sql',
    'supabase/verification/preflight_v4160.sql',
    'supabase/verification/verify_v4160.sql',
    'supabase/verification/preflight_v4170.sql',
    'supabase/verification/verify_v4170.sql',
    'supabase/maintenance/20260719_finance_pre_v470_repair.sql',
    'supabase/maintenance/20260719_training_legacy_gross_normalization.sql',
    'supabase/rollback/rollback_20260719_finance_pre_v470_repair.sql',
    'supabase/rollback/rollback_20260719_training_legacy_gross_normalization.sql',
    'supabase/verification/preflight_legacy_training_gross_normalization.sql',
    'supabase/verification/verify_legacy_training_gross_normalization.sql',
    'supabase/rollback/rollback_v470_compatibility.sql',
    'supabase/rollback/rollback_v480_compatibility.sql',
    'supabase/rollback/rollback_v481_compatibility.sql',
    'supabase/rollback/rollback_v482_compatibility.sql',
    'supabase/rollback/rollback_v490_compatibility.sql',
    'supabase/rollback/rollback_v491_compatibility.sql',
    'supabase/rollback/rollback_v4100_compatibility.sql',
    'supabase/rollback/rollback_v4110_compatibility.sql',
    'supabase/rollback/rollback_v4120_compatibility.sql',
    'supabase/rollback/rollback_v4130_compatibility.sql',
    'supabase/rollback/rollback_v4140_compatibility.sql',
    'supabase/rollback/rollback_v4150_compatibility.sql',
    'supabase/rollback/rollback_v4151_compatibility.sql',
    'supabase/rollback/rollback_v4160_compatibility.sql',
    'supabase/rollback/rollback_v4170_compatibility.sql'
  ]) assert.ok(fs.existsSync(path.join(root,file)),`missing ${file}`);
});

test('Show Office preserves the current main UI while using one permission-aware Supabase implementation',()=>{
  const html=read('index.html');
  const core=read('app-core.js');
  const portal=read('member-portal.js');
  const module=read('show-office.js');
  const css=read('show-office.css');
  const sprintOne=read('supabase/migrations/20260721_show_office_sprint1_v490.sql');
  const sprintTwo=read('supabase/migrations/20260722_show_office_sprint2_classes_v4100.sql');
  const sprintThree=read('supabase/migrations/20260723_show_office_sprint3_entries_v4110.sql');
  const sprintFour=read('supabase/migrations/20260724_show_office_sprint4_judging_v4120.sql');
  const sprintFive=read('supabase/migrations/20260725_show_office_sprint5_live_results_v4130.sql');
  const liveResults=read('live-results.js');
  for(const marker of [
    'dash-group-showoffice','nav-show-office','nav-competitions','nav-show-office-classes','nav-show-office-entries','nav-show-office-judge','nav-show-office-results',
    'page-show-office','page-competitions','page-show-office-classes','page-show-office-entries','page-show-office-judge','page-show-office-results','showOfficeStats',
    'competitionSearch','competitionStatusFilter','competitionTable','showOfficeClassCompetition',
    'showOfficeClassSearch','showOfficeClassTypeFilter','showOfficeClassJumpOffFilter','showOfficeClassTable',
    'showOfficeEntryCompetition','showOfficeEntryClass','showOfficeEntrySearch','showOfficeEntryTable',
    'showOfficeJudgeCompetition','showOfficeJudgeClass','showOfficeJudgePanel',
    'showOfficeResultsCompetition','showOfficeResultsClass','showOfficeResultsBoard','showOfficeResultsTvToggle'
  ]) assert.ok(html.includes(marker),`missing Show Office UI marker ${marker}`);
  assert.match(core,/showoffice:\['show-office','competitions','show-office-classes','show-office-entries','show-office-judge','show-office-results'\]/);
  assert.match(portal,/'show-office': \[[\s\S]*?'show_office\.judging\.view'/);
  assert.match(portal,/'show-office': \[[\s\S]*?'show_office\.results\.view'/);
  assert.match(portal,/'show-office-classes': \['show_office\.view', 'show_office\.classes\.view'\]/);
  assert.match(portal,/'show-office-entries': \['show_office\.view', 'show_office\.entries\.view'\]/);
  assert.match(portal,/'show-office-results': \[[\s\S]*?'show_office\.results\.view'/);
  assert.match(html,/live-results\.js/);
  assert.match(module,/canViewResults\s*=\s*\(\)\s*=>\s*can\('show_office\.view'\)\s*\|\|\s*can\('show_office\.results\.view'\)/);
  assert.match(module,/showOffice\.liveResults\?\.open\?\.\(\)/);
  assert.match(liveResults,/showOffice\.judgingService/);
  assert.doesNotMatch(liveResults,/setInterval/);
  assert.match(liveResults,/no background polling/i);
  assert.match(sprintFive,/show_office\.results\.view/);
  assert.match(sprintFive,/where r\.code in \('super_admin','manager','judge','reception','staff'\)/);
  assert.match(sprintFive,/cce_show_office_judging_context/);
  assert.match(sprintFive,/cce_show_office_judge_panel/);
  assert.match(module,/show_office\.competitions\.create/);
  assert.match(module,/show_office\.competitions\.update/);
  assert.match(module,/show_office\.competitions\.delete/);
  assert.match(module,/show_office\.classes\.create/);
  assert.match(module,/show_office\.classes\.update/);
  assert.match(module,/show_office\.classes\.delete/);
  assert.match(module,/show_office\.entries\.create/);
  assert.match(module,/show_office\.entries\.update/);
  assert.match(module,/show_office\.entries\.delete/);
  assert.doesNotMatch(module,/localStorage\.(?:getItem|setItem)/);
  assert.doesNotMatch(core,/show_office_competitions/);
  assert.match(html,/src\/modules\/show-office\/competition-service\.js/);
  assert.match(html,/src\/modules\/show-office\/class-service\.js/);
  assert.match(html,/src\/modules\/show-office\/entry-service\.js/);
  assert.match(html,/src\/modules\/show-office\/judging-service\.js/);
  assert.match(html,/src\/modules\/show-office\/show-office-module-service\.js/);
  assert.match(html,/judge-panel\.js/);
  assert.match(sprintOne,/create table if not exists public\.show_office_competitions/i);
  assert.match(sprintOne,/status in \('Draft','Open','Running','Finished'\)/);
  assert.match(sprintTwo,/create table if not exists public\.show_office_classes/i);
  assert.match(sprintTwo,/references public\.show_office_competitions\(id\) on delete restrict/i);
  assert.match(sprintTwo,/cce_show_office_classes_(select|insert|update|delete)/);
  assert.match(sprintTwo,/cce_show_office_class_competitions/);
  const competitionPolicy=sprintTwo.match(/create policy cce_show_office_competitions_select[\s\S]*?;\n/)?.[0]||'';
  assert.doesNotMatch(competitionPolicy,/show_office\.classes\.view/);
  assert.match(sprintTwo,/returns table\(id bigint,competition_name text,competition_date date\)/);
  assert.match(sprintTwo,/cce_restore_show_office_module/);
  assert.match(sprintThree,/create table if not exists public\.show_office_entries/i);
  assert.match(sprintThree,/create table if not exists public\.show_office_riders/i);
  assert.match(sprintThree,/create table if not exists public\.show_office_horses/i);
  assert.match(sprintThree,/create table if not exists public\.show_office_stables/i);
  assert.match(sprintThree,/cce_save_show_office_entry/);
  assert.match(sprintThree,/cce_show_office_entries_(select|insert|update|delete)/);
  assert.match(sprintFour,/create table if not exists public\.show_office_entry_rounds/i);
  assert.match(sprintFour,/create table if not exists public\.show_office_score_revisions/i);
  assert.match(sprintFour,/cce_save_show_office_score/);
  assert.match(sprintFour,/cce_finalize_show_office_class/);
  assert.match(sprintFour,/row_version/);
  assert.match(css,/body\.member-authenticated \.so-actions \.action-btn\{min-width:44px;min-height:44px\}/);
  assert.match(css,/\.show-office-page-head>\.btn\{width:auto;flex:0 0 auto\}/);
  assert.match(css,/\.show-office-filters select\{width:auto;flex:0 1 220px\}/);
  assert.match(css,/html\[dir="ltr"\] :is\(#page-show-office,#page-competitions,#page-show-office-classes,#page-show-office-entries\)/);
  assert.match(module,/if \(loadError && !loaded\)[\s\S]*refreshShowOffice\(\)/);
  assert.match(module,/classesError \? loadWarningHtml\(classesError, 'refreshShowOfficeClasses\(\)'\)/);
  assert.match(css,/@media\(max-width:850px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
});

test('Show Office competition service validates fields and Sprint 1 dashboard totals',()=>{
  const service=showOfficeCompetitionService();
  assert.deepEqual([...service.STATUSES],['Draft','Open','Running','Finished']);
  const valid=service.validate({
    competition_name:'  Summer Cup  ',competition_date:'2026-07-21',venue:' CCE ',status:'Open'
  });
  assert.equal(valid.competition_name,'Summer Cup');
  assert.equal(valid.venue,'CCE');
  assert.equal(valid.organizer,null);
  assert.throws(()=>service.validate({competition_name:'',competition_date:'2026-07-21'}),/name is required/i);
  assert.throws(()=>service.validate({competition_name:'Cup',competition_date:'21-07-2026'}),/valid competition date/i);
  assert.throws(()=>service.validate({competition_name:'Cup',competition_date:'2026-07-21',status:'Archived'}),/valid competition status/i);
  const stats=service.dashboardStats([
    {competition_date:'2026-07-21'},{competition_date:'2026-07-22'}
  ],'2026-07-21');
  assert.deepEqual({...stats},{competitions:2,classes:0,entries:0,today:1});
});

test('Show Office class operators receive only the narrow competition directory',async()=>{
  let rpcCall=null;
  const service=showOfficeCompetitionService({
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return [{
        id:9,competition_name:' Directory Cup ',competition_date:'2026-08-09',
        venue:'must not cross the boundary',notes:'must not cross the boundary'
      }];
    }
  });
  const rows=await service.listClassDirectory();
  assert.equal(rpcCall.fn,'cce_show_office_class_competitions');
  assert.deepEqual(JSON.parse(JSON.stringify(rows)),[{
    id:9,competition_name:'Directory Cup',competition_date:'2026-08-09'
  }]);
  assert.ok(!Object.hasOwn(rows[0],'venue'));
  assert.ok(!Object.hasOwn(rows[0],'notes'));
});

test('Show Office class service validates operational fields and portable parent references',()=>{
  const service=showOfficeClassService();
  const valid=service.validate({
    competition_id:8,class_number:' 1A ',sort_order:'2',class_name:' Open 100 cm ',height_cm:'100',
    competition_type:' Table A ',allowed_time_seconds:'72',time_limit_seconds:'144',jump_off:true,
    entry_fee_bd:'12.500',notes:' First class '
  });
  assert.deepEqual(JSON.parse(JSON.stringify(valid)),{
    competition_id:8,class_number:'1A',sort_order:2,class_name:'Open 100 cm',height_cm:100,
    competition_type:'Table A',allowed_time_seconds:72,time_limit_seconds:144,jump_off:true,
    entry_fee_bd:12.5,notes:'First class',
    fence_count:null,knockdown_fault_value:4,refusal_fault_value:4,refusals_before_elimination:3,
    scoring_format:'table_a',joker_fence_number:null
  });
  assert.throws(()=>service.validate({...valid,class_number:''}),/class number is required/i);
  assert.throws(()=>service.validate({...valid,sort_order:0}),/class order must be a positive/i);
  assert.throws(()=>service.validate({...valid,time_limit_seconds:60}),/time limit cannot be less/i);
  assert.throws(()=>service.validate({...valid,entry_fee_bd:'1.0009'}),/up to 3 decimal/i);
  const portable=service.validateBackupPayload([{
    competition_name:' Autumn Cup ',competition_date:'2026-10-02',...valid,
    competition_id:999,created_by:'untrusted',updated_by:'untrusted'
  }]);
  assert.equal(portable[0].competition_name,'Autumn Cup');
  assert.equal(portable[0].competition_date,'2026-10-02');
  assert.ok(!Object.hasOwn(portable[0],'competition_id'));
  assert.ok(!Object.hasOwn(portable[0],'created_by'));
});

test('Show Office class service validates optional fence-by-fence scoring rules',()=>{
  const service=showOfficeClassService();
  const base={
    competition_id:8,class_number:'1A',sort_order:1,class_name:'Fence Class',
    competition_type:'Table A'
  };
  const withoutFences=service.validate(base);
  assert.equal(withoutFences.fence_count,null);
  assert.equal(withoutFences.knockdown_fault_value,4);
  assert.equal(withoutFences.refusal_fault_value,4);
  assert.equal(withoutFences.refusals_before_elimination,3);
  const withFences=service.validate({
    ...base,fence_count:'12',knockdown_fault_value:'4.00',refusal_fault_value:'6.5',refusals_before_elimination:'2'
  });
  assert.equal(withFences.fence_count,12);
  assert.equal(withFences.refusal_fault_value,6.5);
  assert.equal(withFences.refusals_before_elimination,2);
  assert.throws(()=>service.validate({...base,fence_count:0}),/positive whole number/i);
  assert.throws(()=>service.validate({...base,fence_count:51}),/no greater than 50/i);
  assert.throws(()=>service.validate({...base,knockdown_fault_value:'1000'}),/between 0 and 999\.99/i);
  assert.throws(()=>service.validate({...base,refusals_before_elimination:10}),/no greater than 9/i);
});

test('Show Office class service validates Accumulator with Joker scoring format',()=>{
  const service=showOfficeClassService();
  const base={
    competition_id:8,class_number:'1A',sort_order:1,class_name:'Accumulator Class',
    competition_type:'Accumulator'
  };
  const defaultFormat=service.validate(base);
  assert.equal(defaultFormat.scoring_format,'table_a');
  assert.equal(defaultFormat.joker_fence_number,null);
  const accumulator=service.validate({
    ...base,fence_count:'8',scoring_format:'accumulator_joker',joker_fence_number:'8'
  });
  assert.equal(accumulator.scoring_format,'accumulator_joker');
  assert.equal(accumulator.joker_fence_number,8);
  assert.throws(
    ()=>service.validate({...base,scoring_format:'accumulator_joker'}),
    /requires a fence count/i
  );
  assert.throws(
    ()=>service.validate({...base,fence_count:'5',scoring_format:'accumulator_joker',joker_fence_number:'6'}),
    /cannot exceed the fence count/i
  );
  assert.throws(
    ()=>service.validate({...base,scoring_format:'bogus'}),
    /table_a or accumulator_joker/i
  );
});

test('Show Office entry service validates permanent registries and writes through one atomic RPC',async()=>{
  let rpcCall=null;
  const service=showOfficeEntryService({
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return {id:44,class_id:8,start_number:12,rider_id:3,rider_name:'Sara',horse_id:5,horse_name:'Nabd',stable_id:null,stable_name:null};
    }
  });
  const valid=service.validate({
    class_id:'8',start_number:'12',rider_name:' Sara ',horse_name:' Nabd ',stable_name:' CCE '
  });
  assert.deepEqual(JSON.parse(JSON.stringify(valid)),{
    class_id:8,start_number:12,rider_id:null,rider_name:'Sara',horse_id:null,
    core_horse_id:null,horse_name:'Nabd',stable_id:null,stable_name:'CCE'
  });
  await service.save('',valid);
  assert.equal(rpcCall.fn,'cce_save_show_office_entry');
  assert.equal(rpcCall.payload.p_entry_id,null);
  assert.equal(rpcCall.payload.p_start_number,12);
  assert.throws(()=>service.validate({...valid,start_number:0}),/positive whole number/i);
  assert.throws(()=>service.validate({...valid,rider_name:'x'.repeat(181)}),/180 characters/i);
  assert.throws(()=>service.validate({...valid,horse_name:''}),/horse name is required/i);
});

test('Show Office JSON backup reads every competition through keyset pagination',async()=>{
  const competitions=Array.from({length:1005},(_,index)=>({
    id:index+1,competition_name:`Cup ${index+1}`,competition_date:'2026-07-21',status:'Draft'
  }));
  const queries=[];
  const service=showOfficeCompetitionService({
    sbGet:async(_table,query)=>{
      queries.push(query);
      const cursor=Number(query.match(/id=gt\.([^&]+)/)?.[1]||0);
      return competitions.filter(row=>row.id>cursor).slice(0,400);
    }
  });
  const payload=await service.jsonBackup();
  assert.equal(payload.competitions.length,1005);
  assert.equal(payload.competitions[0].id,1);
  assert.equal(payload.competitions.at(-1).id,1005);
  assert.equal(queries.length,4);
  assert.ok(queries.every(query=>query.includes('order=id.asc')));
});

test('Show Office Sprint 2 JSON backup reads every class and uses portable competition keys',async()=>{
  const classes=Array.from({length:1005},(_,index)=>({
    id:index+1,competition_id:77,class_number:String(index+1),sort_order:index+1,
    class_name:`Class ${index+1}`,competition_type:'Table A',entry_fee_bd:5,jump_off:false
  }));
  const queries=[];
  const service=showOfficeClassService({
    sbGet:async(_table,query)=>{
      queries.push(query);
      const cursor=Number(query.match(/id=gt\.([^&]+)/)?.[1]||0);
      return classes.filter(row=>row.id>cursor).slice(0,400);
    }
  });
  const rows=await service.listAll();
  const payload=service.backupRows(rows,new Map([['77',{
    id:77,competition_name:'Sprint 2 Cup',competition_date:'2026-12-01'
  }]]));
  assert.equal(payload.length,1005);
  assert.equal(payload[0].competition_name,'Sprint 2 Cup');
  assert.equal(payload.at(-1).class_number,'1005');
  assert.ok(payload.every(row=>!Object.hasOwn(row,'competition_id')&&!Object.hasOwn(row,'id')));
  assert.equal(queries.length,4);
  assert.ok(queries.every(query=>query.includes('order=id.asc')));
});

test('Show Office Sprint 3 backup paginates every registry and exports portable entry references',async()=>{
  const riderRef='00000000-0000-4000-8000-000000000101';
  const horseRef='00000000-0000-4000-8000-000000000102';
  const entryRef='00000000-0000-4000-8000-000000000103';
  const riders=Array.from({length:1005},(_,index)=>({id:index+1,rider_ref:index?`00000000-0000-4000-8000-${String(index+200).padStart(12,'0')}`:riderRef,rider_name:`Rider ${index+1}`}));
  const tables={
    show_office_riders:riders,
    show_office_horses:[{id:1,horse_ref:horseRef,horse_name:'Nabd'}],
    show_office_stables:[],
    show_office_entries:[{id:1,entry_ref:entryRef,class_id:20,start_number:7,rider_id:1,horse_id:1,stable_id:null}]
  };
  const queries=[];
  const service=showOfficeEntryService({
    sbGet:async(table,query)=>{
      queries.push({table,query});
      const cursor=Number(query.match(/id=gt\.([^&]+)/)?.[1]||0);
      return tables[table].filter(row=>row.id>cursor).slice(0,400);
    }
  });
  const data=await service.listAll();
  assert.equal(data.riders.length,1005);
  const payload=service.backupPayload(
    data,
    new Map([['10',{id:10,competition_name:'Portable Cup',competition_date:'2027-01-02'}]]),
    new Map([['20',{id:20,competition_id:10,class_number:'1A'}]])
  );
  assert.deepEqual(JSON.parse(JSON.stringify(payload.entries)),[{
    entry_ref:entryRef,competition_name:'Portable Cup',competition_date:'2027-01-02',
    class_number:'1A',start_number:7,rider_ref:riderRef,horse_ref:horseRef,stable_ref:null
  }]);
  assert.ok(!Object.hasOwn(payload.entries[0],'class_id'));
  assert.ok(queries.filter(call=>call.table==='show_office_riders').length>=4);
  assert.ok(queries.every(call=>call.query.includes('order=id.asc')));
});

test('Show Office Sprint 4 judging service validates scores and paginates every result',async()=>{
  const scoreRef=index=>`00000000-0000-4000-8001-${String(index).padStart(12,'0')}`;
  const scores=Array.from({length:1005},(_,index)=>({
    id:index+1,result_ref:scoreRef(index+1),entry_id:index+1,phase:'first_round',
    time_ms:70000+index,faults:index%5,refusals:0,
    eliminated:false,retired:false,did_not_start:false,row_version:1
  }));
  const queries=[];
  let rpcCall=null;
  const service=showOfficeJudgingService({
    sbGet:async(table,query)=>{
      queries.push({table,query});
      if(table==='show_office_class_judging'){
        const cursor=Number(query.match(/class_id=gt\.([^&]+)/)?.[1]||0);
        return cursor ? [] : [{class_id:20,status:'Running',scoring_profile:'faults_then_time',ruleset_version:'CCE 2026'}];
      }
      const cursor=Number(query.match(/(?:^|&)id=gt\.([^&]+)/)?.[1]||0);
      return scores.filter(row=>row.id>cursor).slice(0,400);
    },
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return {
        id:1,result_ref:scoreRef(1),entry_id:1,phase:'first_round',
        time_ms:72450,faults:4,refusals:1,eliminated:false,retired:false,
        did_not_start:false,row_version:1
      };
    }
  });
  const scoreInput={
    entry_id:1,phase:'first_round',time_seconds:'72.450',faults:'4.00',
    refusals:'1',expected_version:0
  };
  const valid=service.validateScore(scoreInput);
  assert.equal(valid.time_ms,72450);
  assert.equal(valid.faults,4);
  await service.saveScore(scoreInput);
  assert.equal(rpcCall.fn,'cce_save_show_office_score');
  assert.equal(rpcCall.payload.p_time_ms,72450);
  assert.throws(()=>service.validateScore({...valid,time_seconds:'72.4501'}),/3 decimal/i);
  assert.throws(()=>service.validateScore({...valid,eliminated:true,retired:true}),/mutually exclusive/i);

  const data=await service.listAll();
  assert.equal(data.judging.length,1);
  assert.equal(data.scores.length,1005);
  assert.ok(queries.filter(call=>call.table==='show_office_entry_rounds').length>=4);
  const payload=service.backupPayload(
    data,
    new Map([['10',{id:10,competition_name:'Judging Cup',competition_date:'2027-03-01'}]]),
    new Map([['20',{id:20,competition_id:10,class_number:'1'}]]),
    new Map(scores.map(row=>[String(row.entry_id),{
      id:row.entry_id,entry_ref:scoreRef(row.entry_id)
    }]))
  );
  assert.equal(payload.scores.length,1005);
  assert.equal(payload.scores.at(-1).result_ref,scoreRef(1005));
  assert.equal(payload.judging[0].competition_name,'Judging Cup');
});

test('Fence-by-fence scoring toggles one fence and confirms a round from computed totals',async()=>{
  let rpcCall=null;
  const service=showOfficeJudgingService({
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      if(fn==='cce_show_office_toggle_fence'){
        return {fence_number:payload.p_fence_number,incident:payload.p_incident,joker_chosen:false,row_version:1,totals:{faults:4,refusals:0}};
      }
      if(fn==='cce_show_office_choose_joker_fence'){
        return {fence_number:payload.p_fence_number,incident:'clear',joker_chosen:payload.p_joker_chosen,row_version:2,totals:{faults:0,refusals:0}};
      }
      return {
        id:5,result_ref:'00000000-0000-4000-8002-000000000005',entry_id:1,phase:'first_round',
        time_ms:70000,faults:8,refusals:1,eliminated:false,retired:false,did_not_start:false,row_version:1
      };
    }
  });
  const toggled=await service.toggleFence(1,'first_round',2,'knockdown',0);
  assert.equal(rpcCall.fn,'cce_show_office_toggle_fence');
  assert.equal(rpcCall.payload.p_fence_number,2);
  assert.equal(rpcCall.payload.p_incident,'knockdown');
  assert.ok(!Object.hasOwn(rpcCall.payload,'p_joker_chosen'));
  assert.equal(toggled.incident,'knockdown');
  assert.equal(toggled.joker_chosen,false);
  assert.equal(toggled.totals.faults,4);
  await assert.rejects(service.toggleFence(1,'first_round',0,'knockdown',0),/positive whole number/i);
  await assert.rejects(service.toggleFence(1,'first_round',2,'bogus',0),/clear, knockdown or refusal/i);

  const jokerChosen=await service.chooseJokerFence(1,'first_round',8,true,1);
  assert.equal(rpcCall.fn,'cce_show_office_choose_joker_fence');
  assert.equal(rpcCall.payload.p_fence_number,8);
  assert.equal(rpcCall.payload.p_joker_chosen,true);
  assert.equal(rpcCall.payload.p_expected_version,1);
  assert.equal(jokerChosen.joker_chosen,true);
  assert.equal(jokerChosen.incident,'clear');
  await assert.rejects(service.chooseJokerFence(1,'first_round',0,true,0),/positive whole number/i);

  const confirmed=await service.saveFenceScore({
    entry_id:1,phase:'first_round',time_seconds:'70.000',expected_version:0
  });
  assert.equal(rpcCall.fn,'cce_save_show_office_fence_score');
  assert.equal(rpcCall.payload.p_time_ms,70000);
  assert.ok(!Object.hasOwn(rpcCall.payload,'p_faults'));
  assert.equal(confirmed.faults,8);
  assert.throws(
    ()=>service.validateFenceScore({entry_id:1,phase:'first_round',eliminated:true,retired:true}),
    /mutually exclusive/i
  );
  const special=await service.saveFenceScore({entry_id:1,phase:'first_round',did_not_start:true,expected_version:1});
  assert.equal(rpcCall.payload.p_time_ms,null);
  assert.equal(rpcCall.payload.p_did_not_start,true);

  const fences=service.normalizeFences([{fence_number:'1',incident:'refusal',row_version:'2',joker_chosen:true},{fence_number:2}]);
  assert.deepEqual(JSON.parse(JSON.stringify(fences)),[
    {fence_number:1,incident:'refusal',joker_chosen:true,row_version:2},
    {fence_number:2,incident:'clear',joker_chosen:false,row_version:0}
  ]);
});

test('a failed JSON module provider aborts backup creation and prevents download',async()=>{
  const CCE=backupRuntimeContext({jsonProviders:{
    showOffice:async()=>{throw new Error('Supabase unavailable');}
  }});
  await assert.rejects(
    CCE.backupRuntime.createJsonBackup({app:'CCE'}),
    /module “showOffice”: Supabase unavailable/
  );

  const core=read('app-core.js');
  const start=core.indexOf('async function backupObject');
  const end=core.indexOf('function exportCsvBundle',start);
  let downloads=0;
  const alerts=[];
  const context={
    window:null,CCE,Date,JSON,
    income:[],expenses:[],horses:[],breeding:[],schedule_data:[],instructors_data:[],booking_requests:[],
    readAuditLog:()=>[],downloadTextFile:()=>{downloads+=1;},queueAudit:()=>{},
    alert:message=>alerts.push(message),userSafeError:error=>error.message
  };
  context.window=context;
  vm.runInNewContext(core.slice(start,end),context,{filename:'app-core-backup.js'});
  await context.downloadJsonBackup();
  assert.equal(downloads,0);
  assert.match(alerts[0],/showOffice.*Supabase unavailable/);
  assert.match(core,/Object\.entries\(window\.CCE\?\.backupProviders\|\|\{\}\)/);
  assert.match(core,/Backup failed for module “\$\{name\}”/);
});

test('Show Office aggregate provider exports all Sprint 4 entities as one portable snapshot',async()=>{
  const competitions=[{id:10,competition_name:'Aggregate Cup',competition_date:'2026-12-20',status:'Open'}];
  const classes=[{
    id:20,competition_id:10,class_number:'1A',sort_order:1,class_name:'Aggregate Class',
    height_cm:110,competition_type:'Table A',allowed_time_seconds:70,time_limit_seconds:140,
    jump_off:true,entry_fee_bd:15,notes:'Portable'
  }];
  const riders=[{id:30,rider_ref:'00000000-0000-4000-8000-000000000130',rider_name:'Sara Rider'}];
  const horses=[{id:40,horse_ref:'00000000-0000-4000-8000-000000000140',horse_name:'Nabd'}];
  const stables=[{id:50,stable_ref:'00000000-0000-4000-8000-000000000150',stable_name:'CCE'}];
  const entries=[{id:60,entry_ref:'00000000-0000-4000-8000-000000000160',class_id:20,start_number:9,rider_id:30,horse_id:40,stable_id:50}];
  const judging=[{class_id:20,status:'Running',scoring_profile:'faults_then_time',ruleset_version:'CCE 2026'}];
  const scores=[{
    id:70,result_ref:'00000000-0000-4000-8000-000000000170',entry_id:60,
    phase:'first_round',time_ms:72450,faults:4,refusals:0,
    eliminated:false,retired:false,did_not_start:false
  }];
  const tables={
    show_office_competitions:competitions,show_office_classes:classes,
    show_office_riders:riders,show_office_horses:horses,
    show_office_stables:stables,show_office_entries:entries,
    show_office_class_judging:judging,show_office_entry_rounds:scores
  };
  const context={
    Intl,Date,Object,Array,String,Number,Error,
    sbGet:async(table,query)=>{
      if(query.includes('id=gt.'))return [];
      return tables[table]||[];
    },
    sbRpc:async()=>{throw new Error('not used');}
  };
  context.window=context;
  context.CCE={};
  vm.runInNewContext(read('src/modules/show-office/competition-service.js'),context,{filename:'competition-service.js'});
  vm.runInNewContext(read('src/modules/show-office/class-service.js'),context,{filename:'class-service.js'});
  vm.runInNewContext(read('src/modules/show-office/entry-service.js'),context,{filename:'entry-service.js'});
  vm.runInNewContext(read('src/modules/show-office/judging-service.js'),context,{filename:'judging-service.js'});
  vm.runInNewContext(read('src/modules/show-office/show-office-module-service.js'),context,{filename:'show-office-module-service.js'});
  const payload=await context.CCE.jsonBackupProviders.showOffice();
  assert.equal(payload.competitions.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.classes)),[{
    competition_name:'Aggregate Cup',competition_date:'2026-12-20',class_number:'1A',sort_order:1,
    class_name:'Aggregate Class',height_cm:110,competition_type:'Table A',allowed_time_seconds:70,
    time_limit_seconds:140,jump_off:true,entry_fee_bd:15,notes:'Portable',
    fence_count:null,knockdown_fault_value:4,refusal_fault_value:4,refusals_before_elimination:3,
    scoring_format:'table_a',joker_fence_number:null
  }]);
  assert.equal(payload.riders[0].rider_ref,riders[0].rider_ref);
  assert.equal(payload.horses[0].horse_ref,horses[0].horse_ref);
  assert.equal(payload.stables[0].stable_ref,stables[0].stable_ref);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.entries)),[{
    entry_ref:entries[0].entry_ref,competition_name:'Aggregate Cup',competition_date:'2026-12-20',
    class_number:'1A',start_number:9,rider_ref:riders[0].rider_ref,
    horse_ref:horses[0].horse_ref,stable_ref:stables[0].stable_ref
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.judging)),[{
    competition_name:'Aggregate Cup',competition_date:'2026-12-20',class_number:'1A',
    status:'Running',scoring_profile:'faults_then_time',ruleset_version:'CCE 2026'
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.scores)),[{
    result_ref:scores[0].result_ref,entry_ref:entries[0].entry_ref,phase:'first_round',
    time_ms:72450,faults:4,refusals:0,eliminated:false,retired:false,did_not_start:false
  }]);
  const sheets=await context.CCE.backupProviders.showOffice();
  assert.deepEqual([...sheets.map(sheet=>sheet.sheet)],[
    'Competitions','Competition Classes','Competition Riders','Competition Horses',
    'Stables and Clubs','Competition Entries','Class Judging','Judge Scores'
  ]);
});

test('Show Office aggregate restore validates all entity summaries and strips imported identities',async()=>{
  let rpcCall=null;
  const context={
    Intl,Date,Object,Array,String,Number,Error,
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return {module:'showOffice',total:2,imported:2,duplicates:0,invalid:0,entities:{
        competitions:{total:1,imported:1,duplicates:0,invalid:0},
        classes:{total:1,imported:1,duplicates:0,invalid:0},
        riders:{total:0,imported:0,duplicates:0,invalid:0},
        horses:{total:0,imported:0,duplicates:0,invalid:0},
        stables:{total:0,imported:0,duplicates:0,invalid:0},
        entries:{total:0,imported:0,duplicates:0,invalid:0},
        judging:{total:0,imported:0,duplicates:0,invalid:0},
        scores:{total:0,imported:0,duplicates:0,invalid:0}
      }};
    }
  };
  context.window=context;
  context.CCE={};
  vm.runInNewContext(read('src/modules/show-office/competition-service.js'),context,{filename:'competition-service.js'});
  vm.runInNewContext(read('src/modules/show-office/class-service.js'),context,{filename:'class-service.js'});
  vm.runInNewContext(read('src/modules/show-office/entry-service.js'),context,{filename:'entry-service.js'});
  vm.runInNewContext(read('src/modules/show-office/judging-service.js'),context,{filename:'judging-service.js'});
  vm.runInNewContext(read('src/modules/show-office/show-office-module-service.js'),context,{filename:'show-office-module-service.js'});
  const prepared=context.CCE.showOffice.moduleService.validateBackupPayload({
    competitions:[{competition_name:'Restore Aggregate Cup',competition_date:'2026-12-21',status:'Draft',created_by:'ignored'}],
    classes:[{
      competition_name:'Restore Aggregate Cup',competition_date:'2026-12-21',competition_id:999,
      class_number:'1',sort_order:1,class_name:'Restore Class',competition_type:'Table A',
      created_by:'ignored',updated_by:'ignored'
    }]
  });
  const result=await context.CCE.showOffice.moduleService.restorePrepared(prepared);
  assert.equal(result.entities.classes.imported,1);
  assert.equal(rpcCall.fn,'cce_restore_show_office_module');
  const sent=JSON.parse(JSON.stringify(rpcCall.payload.p_payload));
  assert.ok(!Object.hasOwn(sent.competitions[0],'created_by'));
  assert.ok(!Object.hasOwn(sent.classes[0],'competition_id'));
  assert.ok(!Object.hasOwn(sent.classes[0],'created_by'));
  assert.throws(()=>context.CCE.showOffice.moduleService.restoreSummary({
    module:'showOffice',total:2,imported:2,duplicates:0,invalid:0,
    entities:{
      competitions:{total:1,imported:1,duplicates:0,invalid:0},classes:{total:1,imported:0,duplicates:0,invalid:0},
      riders:{total:0,imported:0,duplicates:0,invalid:0},horses:{total:0,imported:0,duplicates:0,invalid:0},
      stables:{total:0,imported:0,duplicates:0,invalid:0},entries:{total:0,imported:0,duplicates:0,invalid:0},
      judging:{total:0,imported:0,duplicates:0,invalid:0},scores:{total:0,imported:0,duplicates:0,invalid:0}
    }
  },prepared),/inconsistent/i);
});

test('Show Office backup payloads are validated, sanitized and restored through one RPC',async()=>{
  let rpcCall=null;
  const service=showOfficeCompetitionService({
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return {module:'showOffice',total:1,imported:1,duplicates:0,invalid:0};
    }
  });
  const source={
    id:88,competition_name:'  Restore Cup  ',competition_date:'2026-10-01',status:'Open',
    created_by:'00000000-0000-4000-8000-000000000099',updated_by:'00000000-0000-4000-8000-000000000098',
    created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-02T00:00:00Z'
  };
  const prepared=service.validateBackupPayload({competitions:[source]});
  assert.deepEqual(JSON.parse(JSON.stringify(prepared)),[{
    competition_name:'Restore Cup',competition_date:'2026-10-01',venue:null,organizer:null,
    chief_judge:null,course_designer:null,status:'Open',notes:null
  }]);
  const summary=await service.restoreBackup({competitions:[source]});
  assert.deepEqual({...summary},{module:'showOffice',total:1,imported:1,duplicates:0,invalid:0});
  assert.equal(rpcCall.fn,'cce_restore_show_office_competitions');
  assert.deepEqual(JSON.parse(JSON.stringify(rpcCall.payload.p_competitions)),JSON.parse(JSON.stringify(prepared)));
  assert.throws(()=>service.validateBackupPayload({competitions:[{competition_name:'Bad',competition_date:'2026-10-01',status:'Archived'}]}),/Competition 1:.*status/i);
  assert.throws(()=>service.validateBackupPayload({competitions:[{competition_name:7,competition_date:'2026-10-01'}]}),/competition_name must be text/i);
  assert.throws(()=>service.validateBackupPayload({}),/competitions array/i);
});

test('backup restore planning supports legacy backups and optional module payloads',async()=>{
  const posts=[];
  let restored=null;
  const runtime=backupRestoreRuntime({
    providers:{showOffice:{
      validate:payload=>{
        if(!Array.isArray(payload?.competitions))throw new Error('invalid Show Office payload');
        return payload.competitions.map(row=>({competition_name:String(row.competition_name)}));
      },
      restore:async prepared=>{
        restored=prepared;
        return {module:'showOffice',total:prepared.length,imported:prepared.length,duplicates:0,invalid:0};
      }
    }},
    post:async(table,row,options)=>{posts.push({table,row,options});return [{id:1,...row}];}
  });

  const legacyPlan=runtime.plan({version:'4.8.4',income:[{id:44,customer_name:'Legacy rider'}],horses:[]});
  assert.deepEqual([...legacyPlan.tables],['income','horses']);
  assert.equal(legacyPlan.modules.length,0);
  const legacyResult=await runtime.execute(legacyPlan);
  assert.equal(legacyResult.legacy.imported,1);
  assert.equal(legacyResult.legacy.failed,0);
  assert.deepEqual(JSON.parse(JSON.stringify(posts)),[
    {table:'income',row:{customer_name:'Legacy rider'},options:{skipAudit:true}}
  ]);

  const missingModulePlan=runtime.plan({version:'4.9.0',income:[],modules:{}});
  assert.equal(missingModulePlan.modules.length,0);
  await runtime.execute(missingModulePlan);

  const currentPlan=runtime.plan({version:'4.9.0',modules:{showOffice:{competitions:[{competition_name:'Current Cup'}]}}});
  assert.equal(currentPlan.tables.length,0);
  assert.equal(currentPlan.modules.length,1);
  const currentResult=await runtime.execute(currentPlan);
  assert.deepEqual(restored,[{competition_name:'Current Cup'}]);
  assert.equal(currentResult.modules[0].imported,1);
  assert.throws(()=>runtime.plan({income:[],modules:{showOffice:{competitions:'invalid'}}}),/invalid Show Office payload/);

  const failingLegacyRuntime=backupRestoreRuntime({post:async()=>{throw new Error('legacy row rejected');}});
  const failingLegacyResult=await failingLegacyRuntime.execute(
    failingLegacyRuntime.plan({income:[{id:9,customer_name:'Rejected legacy row'}]})
  );
  assert.equal(failingLegacyResult.legacy.failed,1);
  assert.equal(failingLegacyResult.legacy.imported,0);
  assert.equal(failingLegacyResult.modules.length,0);
});

test('the current JSON backup format restores Show Office through the registered provider',async()=>{
  let rpcCall=null;
  const context={
    Intl,Date,Object,Array,String,Number,Error,
    console:{warn(){}},
    sbPost:async()=>[],
    sbRpc:async(fn,payload)=>{
      rpcCall={fn,payload};
      return {module:'showOffice',total:1,imported:1,duplicates:0,invalid:0,entities:{
        competitions:{total:1,imported:1,duplicates:0,invalid:0},
        classes:{total:0,imported:0,duplicates:0,invalid:0},
        riders:{total:0,imported:0,duplicates:0,invalid:0},
        horses:{total:0,imported:0,duplicates:0,invalid:0},
        stables:{total:0,imported:0,duplicates:0,invalid:0},
        entries:{total:0,imported:0,duplicates:0,invalid:0},
        judging:{total:0,imported:0,duplicates:0,invalid:0},
        scores:{total:0,imported:0,duplicates:0,invalid:0}
      }};
    }
  };
  context.window=context;
  context.CCE={};
  vm.runInNewContext(read('src/services/backup-runtime.js'),context,{filename:'backup-runtime.js'});
  vm.runInNewContext(read('src/modules/show-office/competition-service.js'),context,{filename:'competition-service.js'});
  vm.runInNewContext(read('src/modules/show-office/class-service.js'),context,{filename:'class-service.js'});
  vm.runInNewContext(read('src/modules/show-office/entry-service.js'),context,{filename:'entry-service.js'});
  vm.runInNewContext(read('src/modules/show-office/judging-service.js'),context,{filename:'judging-service.js'});
  vm.runInNewContext(read('src/modules/show-office/show-office-module-service.js'),context,{filename:'show-office-module-service.js'});
  const restorePlan=context.CCE.backupRestore.plan({
    app:'Country Club Equestrian',version:'4.9.1',income:[],
    modules:{showOffice:{competitions:[{
      id:71,competition_name:' Backup Format Cup ',competition_date:'2026-11-01',status:'Draft',
      created_by:'00000000-0000-4000-8000-000000000071',updated_by:'00000000-0000-4000-8000-000000000072'
    }]}}
  });
  const result=await context.CCE.backupRestore.execute(restorePlan);
  assert.equal(result.modules[0].imported,1);
  assert.equal(result.modules[0].entities.classes.total,0);
  assert.equal(rpcCall.fn,'cce_restore_show_office_module');
  assert.deepEqual(JSON.parse(JSON.stringify(rpcCall.payload)),{
    p_payload:{
      competitions:[{
        competition_name:'Backup Format Cup',competition_date:'2026-11-01',venue:null,organizer:null,
        chief_judge:null,course_designer:null,status:'Draft',notes:null
      }],
      classes:[],riders:[],horses:[],stables:[],entries:[],judging:[],scores:[]
    }
  });
});

test('Supabase audit helpers accept module-owned before snapshots',()=>{
  const runtime=read('src/services/supabase-runtime.js');
  for(const name of ['sbPatch','sbDel']){
    const end=name==='sbPatch'?'sbDel':'// Horse-health domain';
    const start=runtime.indexOf(`async function ${name}`);
    const finish=runtime.indexOf(end,start+1);
    const block=runtime.slice(start,finish);
    assert.match(block,/Object\.prototype\.hasOwnProperty\.call\(opts,'before'\)/);
  }
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

test('training cash is split 50/50 without changing gross paid or remaining',()=>{
  const core=read('app-core.js');
  const start=core.indexOf('const isTrainingIncome=');
  const end=core.indexOf('const calcIncomePending=',start);
  assert.ok(start>=0&&end>start,'missing training accounting helpers');
  const context={Math};
  context.moneyNum=value=>Number.parseFloat(value)||0;
  context.normalizeActivityCategory=value=>String(value||'').trim()||'Others';
  vm.runInNewContext(`${core.slice(start,end)};this.accounting={isTrainingIncome,trainingSplitEnabled,incomeStableShare,incomeInstructorShare,calcGrossIncomeReceived,calcIncomeReceived,calcInstructorShares};`,context);
  const paidPackage={activity:'Lesson',amount_bd:70,paid_bd:70};
  assert.equal(context.accounting.calcGrossIncomeReceived([paidPackage]),70);
  assert.equal(context.accounting.incomeStableShare(paidPackage),35);
  assert.equal(context.accounting.incomeInstructorShare(paidPackage),35);
  assert.equal(paidPackage.amount_bd-paidPackage.paid_bd,0);
  const partial={activity:'Lesson',amount_bd:70,paid_bd:20};
  assert.equal(context.accounting.incomeStableShare(partial),10);
  assert.equal(context.accounting.incomeInstructorShare(partial),10);
  assert.equal(partial.amount_bd-partial.paid_bd,50);
  const legacy={activity:'Lesson',amount_bd:5,paid_bd:5,training_split_enabled:false};
  assert.equal(context.accounting.incomeStableShare(legacy),5);
  assert.equal(context.accounting.incomeInstructorShare(legacy),0);
  assert.equal(context.accounting.incomeStableShare({activity:'Hack',paid_bd:70}),70);
});

test('training payment and schedule forms require a linked active instructor',()=>{
  const core=read('app-core.js');
  const payment=functionBlock(core,'openTrainingPaymentModal','confirmTrainingPayment');
  assert.match(payment,/training-payment-instructor/);
  assert.match(payment,/Stable.*splitStableHalf/s);
  assert.match(payment,/Instructor.*splitStableHalf/s);
  const confirm=functionBlock(core,'confirmTrainingPayment','markPaid');
  assert.match(confirm,/instructor_id:trainer\.id/);
  assert.match(confirm,/paid_bd:finalAmount/);
  const add=functionBlock(core,'openAddSchedule','syncScheduleInstructorField');
  assert.match(add,/<select id="sc-instructor-id">/);
  assert.doesNotMatch(add,/id="sc-instructor"/);
  const save=functionBlock(core,'saveSchedule','openEditSchedule');
  assert.match(save,/Select an instructor for this training session/);
  assert.match(save,/instructor_id:trainer\?\.id\|\|null/);
  const update=functionBlock(core,'updateSchedule','markSchedDone');
  assert.match(update,/instructor_id:trainer\?\.id\|\|null/);
  assert.match(read('member-portal.js'),/cce_instructor_directory/);
});

test('training packages materialize into filtered instructor schedules',()=>{
  const core=read('app-core.js');
  const html=read('index.html');
  const sql=read('supabase/migrations/20260719_training_booking_schedule_v482.sql');
  assert.match(core,/cce_schedule_training_booking/);
  assert.match(core,/openScheduleTrainingBooking/);
  assert.match(core,/let schedStatus='scheduled'/);
  assert.match(core,/let instrStatus = 'scheduled'/);
  assert.match(core,/paymentStatus:r\.status\|\|''/);
  assert.match(html,/id="schedStatusScheduled"/);
  assert.match(html,/id="schedStatusDone"/);
  assert.match(html,/id="instrStatusScheduled"/);
  assert.match(html,/id="instrStatusDone"/);
  assert.match(sql,/schedule_booking_slot_uidx/i);
  assert.match(sql,/booking_slot_index/i);
  assert.match(sql,/where s\.booking_request_id is null/i);
  assert.match(sql,/update public\.income\s+set instructor_id=/i);
  assert.doesNotMatch(sql,/set\s+(amount_bd|paid_bd)\s*=/i);
  assert.match(sql,/Finance guard failed: amount_bd or paid_bd changed/);
});

test('v4.8 migration derives shares and protects instructor assignments',()=>{
  const sql=read('supabase/migrations/20260719_training_revenue_instructor_v480.sql');
  assert.match(sql,/generated always as/i);
  assert.match(sql,/round\(coalesce\(paid_bd,0\)::numeric\/2,3\)/i);
  assert.match(sql,/income_training_instructor_required/i);
  assert.match(sql,/schedule_training_instructor_required/i);
  assert.match(sql,/cce_validate_training_income_instructor/i);
  assert.match(sql,/cce_validate_schedule_instructor/i);
  assert.match(sql,/cce_instructor_directory/i);
  assert.match(sql,/cce_v480_finance_guard/i);
  assert.match(sql,/s\.instructor_id=v_instructor_id/i);
});

test('v4.8.1 preserves historical lessons and enables only explicit new splits',()=>{
  const sql=read('supabase/migrations/20260719_training_split_cutover_v481.sql');
  assert.match(sql,/training_split_enabled boolean not null default false/i);
  assert.match(sql,/income_prepare_training_split/i);
  assert.match(sql,/when training_split_enabled/i);
  assert.match(sql,/recorded training split cannot be disabled/i);
  assert.match(sql,/cce_v481_finance_guard/i);
  const core=read('app-core.js');
  assert.match(core,/Legacy — preserved/);
  assert.match(core,/training_split_enabled:splitEnabled/);
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

test('all app assets use the v4.17.2 cache key',()=>{
  const html=read('index.html');
  assert.ok(!html.includes('20260714-465'));
  assert.ok(!html.includes('20260731-4171'));
  assert.ok((html.match(/20260731-4172/g)||[]).length>=20);
  assert.match(read('app-bootstrap.js'),/stableos-20260731-4172/);
  assert.match(read('app-core.js'),/sw\.js\?v=20260731-4172/);
  assert.equal(read('VERSION.txt').trim(),'4.17.2');
});
