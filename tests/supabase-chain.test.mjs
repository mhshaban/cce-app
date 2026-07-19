import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

async function buildDatabaseThrough(lastMigration=''){
  const db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(
      id uuid primary key,
      email text,
      phone text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
  `);
  const migrations=fs.readdirSync(path.join(root,'supabase/migrations'))
    .filter(file=>file.endsWith('.sql')).sort();
  await db.exec(read('supabase/baseline/legacy_core_schema.sql'));
  for(const file of migrations){
    if(lastMigration&&file>lastMigration)break;
    await db.exec(read(path.join('supabase/migrations',file)));
  }
  return db;
}

const buildDatabase=()=>buildDatabaseThrough();

test('the full Supabase chain builds and enforces the v4.8.2 contracts',async()=>{
  const db=await buildDatabase();
  try{
    const services=await db.query(`
      select code,price_bd::text,capacity_units
      from public.public_booking_services where code in ('ride_family','training_12')
      order by code
    `);
    assert.deepEqual(services.rows.map(row=>({...row})),[
      {code:'ride_family',price_bd:'22.000',capacity_units:4},
      {code:'training_12',price_bd:'100.000',capacity_units:1}
    ]);

    const privilege=await db.query(`select has_table_privilege('anon','public.income','INSERT') as allowed`);
    assert.equal(privilege.rows[0].allowed,false);

    await db.exec(`
      insert into auth.users(id,email,raw_user_meta_data)
      values('00000000-0000-4000-8000-000000000001','untrusted@example.com','{"full_name":"Untrusted","username":"untrusted"}');
    `);
    const profile=await db.query(`
      select is_active,role_id from public.profiles
      where id='00000000-0000-4000-8000-000000000001'
    `);
    assert.equal(profile.rows[0].is_active,false);
    assert.equal(profile.rows[0].role_id,null);

    await db.exec(`insert into public.horses(horse_name,owner,status) values('Atlas','CC','Available')`);
    await db.exec('set role anon');
    await assert.rejects(
      db.exec(`insert into public.income(date,customer_name,amount_bd,paid_bd,notes,status)
               values(current_date,'Bypass',1,0,'BOOKING REQUEST','Pending')`),
      /permission denied/
    );
    const submitted=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Test Rider',
        p_phone=>'39001234',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'08:00'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-123',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    assert.equal(submitted.rows[0].result.amount_bd,5);
    const trainingRequest=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'training',p_service_code=>'training_4',p_customer_name=>'Pending Trainee',
        p_phone=>'39001235',p_personal_id=>'CPR-456',
        p_session_slots=>jsonb_build_array(
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+1),'time','16:00'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+2),'time','16:00'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+3),'time','16:00'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+4),'time','16:00')
        ),
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    assert.equal(trainingRequest.rows[0].result.amount_bd,35);
    const eightSessionRequest=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'training',p_service_code=>'training_8',p_customer_name=>'Eight Session Trainee',
        p_phone=>'39001236',p_personal_id=>'CPR-789',
        p_session_slots=>jsonb_build_array(
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+10),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+11),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+12),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+13),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+14),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+15),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+16),'time','18:15'),
          jsonb_build_object('date',(timezone('Asia/Bahrain',now())::date+17),'time','18:15')
        ),
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    assert.equal(eightSessionRequest.rows[0].result.amount_bd,70);
    await db.exec('reset role');

    const pendingTraining=await db.query(`
      select amount_bd::text,paid_bd::text,stable_share_bd::text,instructor_share_bd::text,
             training_split_enabled,instructor_id
      from public.income where id=$1
    `,[trainingRequest.rows[0].result.income_id]);
    assert.deepEqual({...pendingTraining.rows[0]},
      {amount_bd:'35.000',paid_bd:'0.000',stable_share_bd:'0.000',instructor_share_bd:'0.000',training_split_enabled:true,instructor_id:null});

    const intake=await db.query(`
      select br.status,br.amount_bd::text,i.amount_bd::text as income_amount,i.notes,pd.personal_id
      from public.booking_requests br
      join public.income i on i.booking_request_id=br.id
      join public.booking_private_details pd on pd.booking_request_id=br.id
    `);
    assert.equal(intake.rows[0].status,'Requested');
    assert.equal(intake.rows[0].amount_bd,'5.000');
    assert.equal(intake.rows[0].income_amount,'5.000');
    assert.equal(intake.rows[0].personal_id,'CPR-123');
    assert.doesNotMatch(intake.rows[0].notes,/39001234|CPR-123/);

    await db.exec(`
      insert into auth.users(id,email) values
        ('00000000-0000-4000-8000-000000000002','manager@example.com'),
        ('00000000-0000-4000-8000-000000000003','reception@example.com'),
        ('00000000-0000-4000-8000-000000000004','trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='00000000-0000-4000-8000-000000000002' and r.code='manager')
         or (p.id='00000000-0000-4000-8000-000000000003' and r.code='reception')
         or (p.id='00000000-0000-4000-8000-000000000004' and r.code='trainer');
    `);

    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000002'; set role authenticated`);
    await assert.rejects(
      db.exec(`update public.booking_requests set amount_bd=0,status='Completed'`),
      /permission denied/
    );
    const bookingId=submitted.rows[0].result.booking_request_id;
    const status=await db.query(`select public.cce_update_booking_status(${bookingId},'Confirmed') as result`);
    assert.equal(status.rows[0].result.status,'Confirmed');
    const privateDetails=await db.query(`select public.cce_booking_private_details(${bookingId}) as result`);
    assert.equal(privateDetails.rows[0].result.personal_id,'CPR-123');
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000003'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_booking_private_details(${bookingId})`),
      /Permission denied/
    );
    await db.exec('reset role');

    const horse=await db.query(`insert into public.horses(horse_name,owner,status) values('Nabd','CC','Available') returning id`);
    const horseId=horse.rows[0].id;
    const newest=await db.query(`
      insert into public.horse_health_events(
        horse_id,event_scope,event_type,event_date,title,status,assigned_to,completed_at
      ) values($1,'care','Farrier','2026-07-20','Farrier done','Completed','Ahmed','2026-07-20T22:30:00Z')
      returning id
    `,[horseId]);
    await db.exec(`
      insert into public.horse_health_events(
        horse_id,event_scope,event_type,event_date,title,status,assigned_to,completed_at
      ) values(${horseId},'care','Farrier','2026-07-19','Older farrier','Completed','Ali','2026-07-19T08:00:00Z')
    `);
    let summary=await db.query(`select farrier_date::text,farrier_name from public.horses where id=$1`,[horseId]);
    assert.deepEqual({...summary.rows[0]},{farrier_date:'2026-07-21',farrier_name:'Ahmed'});

    await db.exec(`delete from public.horse_health_events where id=${newest.rows[0].id}`);
    summary=await db.query(`select farrier_date::text,farrier_name from public.horses where id=$1`,[horseId]);
    assert.deepEqual({...summary.rows[0]},{farrier_date:'2026-07-19',farrier_name:'Ali'});

    await db.exec(`update public.horse_health_events set status='Cancelled' where horse_id=${horseId} and event_type='Farrier'`);
    summary=await db.query(`select farrier_date::text,farrier_name from public.horses where id=$1`,[horseId]);
    assert.deepEqual({...summary.rows[0]},{farrier_date:null,farrier_name:null});

    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000004'; set role authenticated`);
    await db.exec(`
      insert into public.horse_health_events(horse_id,event_scope,event_type,event_date,title,status)
      values(${horseId},'care','Observation',current_date,'Trainer care note','Pending')
    `);
    await assert.rejects(
      db.exec(`
        insert into public.horse_health_events(horse_id,event_scope,event_type,event_date,title,status)
        values(${horseId},'medical','Medical',current_date,'Unauthorized medical note','Open')
      `),
      /row-level security policy/
    );
    await db.exec('reset role');

    const trainers=await db.query(`
      insert into public.instructors(name,active)
      values('Trainer Ali',true),('Trainer Sara',true),('Trainer Inactive',false)
      returning id,name
    `);
    const trainerAli=trainers.rows.find(row=>row.name==='Trainer Ali').id;
    const trainerSara=trainers.rows.find(row=>row.name==='Trainer Sara').id;
    const trainerInactive=trainers.rows.find(row=>row.name==='Trainer Inactive').id;

    const packageMoneyBefore=await db.query(`
      select amount_bd::text,paid_bd::text,(amount_bd-paid_bd)::text as remaining_bd
      from public.income where id=$1
    `,[eightSessionRequest.rows[0].result.income_id]);
    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000002'; set role authenticated`);
    const materialized=await db.query(`
      select public.cce_schedule_training_booking($1,$2) as result
    `,[eightSessionRequest.rows[0].result.booking_request_id,trainerAli]);
    assert.equal(materialized.rows[0].result.sessions,8);
    assert.equal(materialized.rows[0].result.created,8);
    const packageSchedule=await db.query(`
      select count(*)::int as sessions,min(booking_slot_index)::int as first_slot,
             max(booking_slot_index)::int as last_slot,
             bool_and(instructor_id=$2) as assigned,
             bool_and(status='Scheduled') as scheduled
      from public.schedule where booking_request_id=$1
    `,[eightSessionRequest.rows[0].result.booking_request_id,trainerAli]);
    assert.deepEqual({...packageSchedule.rows[0]},
      {sessions:8,first_slot:1,last_slot:8,assigned:true,scheduled:true});
    const repeated=await db.query(`
      select public.cce_schedule_training_booking($1,$2) as result
    `,[eightSessionRequest.rows[0].result.booking_request_id,trainerAli]);
    assert.equal(repeated.rows[0].result.created,0);
    assert.equal(repeated.rows[0].result.existing,8);
    await db.exec('reset role');
    const reservedAfterMaterialization=await db.query(`
      select public.cce_reserved_horse_units(
        (slot->>'date')::date,(slot->>'time')::time,45
      )::int as units
      from public.booking_requests br
      cross join lateral jsonb_array_elements(br.session_slots) with ordinality as rows(slot,ordinality)
      where br.id=$1 and ordinality=2
    `,[eightSessionRequest.rows[0].result.booking_request_id]);
    assert.equal(reservedAfterMaterialization.rows[0].units,1);

    const packageMoneyAfter=await db.query(`
      select amount_bd::text,paid_bd::text,(amount_bd-paid_bd)::text as remaining_bd
      from public.income where id=$1
    `,[eightSessionRequest.rows[0].result.income_id]);
    assert.deepEqual({...packageMoneyAfter.rows[0]},{...packageMoneyBefore.rows[0]});

    await db.exec(`
      update public.profiles set instructor_id=${trainerAli}
      where id='00000000-0000-4000-8000-000000000004';
      set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000004';
      set role authenticated;
    `);
    const trainerPackage=await db.query(`select public.cce_member_instructor_schedule() as session`);
    assert.equal(trainerPackage.rows.filter(row=>String(row.session.booking_request_id)===String(eightSessionRequest.rows[0].result.booking_request_id)).length,8);
    await db.exec('reset role');

    await db.exec(`
      insert into auth.users(id,email) values
        ('00000000-0000-4000-8000-000000000005','accountant@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where p.id='00000000-0000-4000-8000-000000000005' and r.code='accountant';
      set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000005';
      set role authenticated;
    `);
    const directory=await db.query(`select public.cce_instructor_directory() as result`);
    assert.equal(directory.rows.length,3);
    assert.deepEqual(Object.keys(directory.rows[0].result).sort(),['active','id','name']);
    await db.exec('reset role');

    await assert.rejects(
      db.exec(`
        insert into public.income(date,customer_name,activity,qty,amount_bd,paid_bd,status)
        values(current_date,'Training without instructor','Lesson',8,70,70,'Paid')
      `),
      /Select an instructor/
    );
    const trainingIncome=await db.query(`
      insert into public.income(
        date,customer_name,activity,qty,amount_bd,paid_bd,status,instructor_id
      ) values(current_date,'Eight-session rider','Lesson',8,70,70,'Paid',$1)
      returning id,amount_bd::text,paid_bd::text,stable_share_bd::text,instructor_share_bd::text,
                (amount_bd-paid_bd)::text as remaining_bd
    `,[trainerAli]);
    assert.deepEqual({...trainingIncome.rows[0]},
      {id:trainingIncome.rows[0].id,amount_bd:'70.000',paid_bd:'70.000',stable_share_bd:'35.000',instructor_share_bd:'35.000',remaining_bd:'0.000'});

    await db.exec(`update public.income set paid_bd=20,status='Pending' where id=${trainingIncome.rows[0].id}`);
    const partial=await db.query(`
      select amount_bd::text,paid_bd::text,stable_share_bd::text,instructor_share_bd::text,
             (amount_bd-paid_bd)::text as remaining_bd
      from public.income where id=${trainingIncome.rows[0].id}
    `);
    assert.deepEqual({...partial.rows[0]},
      {amount_bd:'70.000',paid_bd:'20.000',stable_share_bd:'10.000',instructor_share_bd:'10.000',remaining_bd:'50.000'});

    const hackIncome=await db.query(`
      insert into public.income(date,customer_name,activity,amount_bd,paid_bd,status)
      values(current_date,'Hack rider','Hack',70,70,'Paid')
      returning stable_share_bd::text,instructor_share_bd::text
    `);
    assert.deepEqual({...hackIncome.rows[0]},{stable_share_bd:'70.000',instructor_share_bd:'0.000'});

    const legacyLesson=await db.query(`
      insert into public.income(date,customer_name,activity,amount_bd,paid_bd,status)
      values(current_date,'Legacy lesson','Lesson',5,0,'Pending') returning id
    `);
    await db.exec(`
      update public.income set training_split_enabled=false
      where id=${legacyLesson.rows[0].id};
      update public.income set paid_bd=5,status='Paid'
      where id=${legacyLesson.rows[0].id};
    `);
    const legacyPreserved=await db.query(`
      select paid_bd::text,stable_share_bd::text,instructor_share_bd::text,
             training_split_enabled,instructor_id
      from public.income where id=${legacyLesson.rows[0].id}
    `);
    assert.deepEqual({...legacyPreserved.rows[0]},
      {paid_bd:'5.000',stable_share_bd:'5.000',instructor_share_bd:'0.000',training_split_enabled:false,instructor_id:null});
    await assert.rejects(
      db.exec(`
        update public.income set instructor_id=${trainerInactive},paid_bd=70
        where id=${trainingIncome.rows[0].id}
      `),
      /missing or inactive/
    );
    await assert.rejects(
      db.exec(`
        update public.income set training_split_enabled=false
        where id=${trainingIncome.rows[0].id}
      `),
      /cannot be disabled/
    );

    await assert.rejects(
      db.exec(`
        insert into public.schedule(date,start_time,activity,customer_name,status)
        values(current_date,'16:00','Lesson','Unassigned rider','Scheduled')
      `),
      /Select an instructor/
    );
    const scheduled=await db.query(`
      insert into public.schedule(
        date,start_time,end_time,activity,customer_name,instructor_id,status
      ) values(current_date,'16:45','17:30','Lesson','Assigned rider',$1,'Scheduled')
      returning id,instructor_id,instructor
    `,[trainerAli]);
    assert.equal(scheduled.rows[0].instructor,'Trainer Ali');
    const reassigned=await db.query(`
      update public.schedule set instructor_id=$1
      where id=$2 returning instructor_id,instructor
    `,[trainerSara,scheduled.rows[0].id]);
    assert.equal(String(reassigned.rows[0].instructor_id),String(trainerSara));
    assert.equal(reassigned.rows[0].instructor,'Trainer Sara');

    await db.exec(read('supabase/verification/preflight_v481.sql'));
    await db.exec(read('supabase/verification/verify_v470.sql'));
    await db.exec(read('supabase/verification/verify_v481.sql'));
  }finally{
    await db.close();
  }
});

test('v4.8.1 restores pre-cutover Lesson revenue without changing customer cash',async()=>{
  const db=await buildDatabaseThrough('20260719_security_database_foundation_v470.sql');
  try{
    await db.exec(`
      insert into public.income(date,customer_name,activity,amount_bd,paid_bd,status)
      values
        ('2025-01-01','Historical single lesson','Lesson',5,5,'Paid'),
        ('2026-07-22','Historical package','Lesson',70,70,'Paid');
    `);
    const before=await db.query(`
      select count(*)::int as rows,sum(amount_bd)::text as amount,sum(paid_bd)::text as paid
      from public.income
    `);

    await db.exec(read('supabase/migrations/20260719_training_revenue_instructor_v480.sql'));
    const unsafe=await db.query(`
      select sum(stable_share_bd)::text as stable,sum(instructor_share_bd)::text as instructor
      from public.income
    `);
    assert.deepEqual({...unsafe.rows[0]},{stable:'37.500',instructor:'37.500'});

    await db.exec(read('supabase/migrations/20260719_training_split_cutover_v481.sql'));
    const corrected=await db.query(`
      select count(*)::int as rows,sum(amount_bd)::text as amount,sum(paid_bd)::text as paid,
             sum(stable_share_bd)::text as stable,sum(instructor_share_bd)::text as instructor,
             bool_and(training_split_enabled is false) as legacy_preserved
      from public.income
    `);
    assert.deepEqual({...corrected.rows[0]},
      {rows:before.rows[0].rows,amount:before.rows[0].amount,paid:before.rows[0].paid,
       stable:'75.000',instructor:'0.000',legacy_preserved:true});
  }finally{
    await db.close();
  }
});

test('legacy training gross normalization preserves stable cash and is reversible',async()=>{
  const db=await buildDatabaseThrough('20260719_security_database_foundation_v470.sql');
  try{
    await db.exec(`
      insert into public.income(date,customer_name,activity,amount_bd,paid_bd,status)
      select
        '2026-01-01'::date+(series-1),
        'Historical training '||series,
        'Lesson',
        case when series%5=0 then 7 when series%3=0 then 4 else 5 end,
        case when series%5=0 then 7 when series%3=0 then 4 else 5 end,
        'Paid'
      from generate_series(1,126) series;
    `);
    const original=await db.query(`
      select count(*)::int as rows,sum(amount_bd)::text as amount,sum(paid_bd)::text as paid
      from public.income
    `);

    await db.exec(read('supabase/migrations/20260719_training_revenue_instructor_v480.sql'));
    await db.exec(read('supabase/migrations/20260719_training_split_cutover_v481.sql'));
    const target=await db.query(`
      insert into public.instructors(name,active)
      values('Target Trainer',true) returning id
    `);
    await db.query(`
      insert into public.income(
        date,customer_name,activity,amount_bd,paid_bd,status,instructor_id
      ) values('2026-07-19','Current training template','Lesson',10,10,'Paid',$1)
    `,[target.rows[0].id]);

    await db.exec(read('supabase/verification/preflight_legacy_training_gross_normalization.sql'));
    await db.exec(read('supabase/maintenance/20260719_training_legacy_gross_normalization.sql'));
    await db.exec(read('supabase/verification/verify_legacy_training_gross_normalization.sql'));

    const normalized=await db.query(`
      select
        count(*)::int as rows,
        bool_and(income.amount_bd=(backup.row_data->>'amount_bd')::numeric*2) as gross_doubled,
        bool_and(income.paid_bd=(backup.row_data->>'paid_bd')::numeric*2) as paid_doubled,
        bool_and(income.stable_share_bd=(backup.row_data->>'paid_bd')::numeric) as stable_preserved,
        bool_and(income.instructor_share_bd=(backup.row_data->>'paid_bd')::numeric) as instructor_added,
        bool_and(income.amount_bd=income.paid_bd) as zero_remaining,
        bool_and(income.instructor_id=backup.target_instructor_id) as target_assigned
      from cce_migration_backup.training_legacy_gross_20260719 backup
      join public.income income on income.id=backup.record_id
    `);
    assert.deepEqual({...normalized.rows[0]},
      {rows:126,gross_doubled:true,paid_doubled:true,stable_preserved:true,
       instructor_added:true,zero_remaining:true,target_assigned:true});
    const totals=await db.query(`
      select sum(income.amount_bd)::text as amount,sum(income.paid_bd)::text as paid,
             sum(income.stable_share_bd)::text as stable,
             sum(income.instructor_share_bd)::text as instructor
      from cce_migration_backup.training_legacy_gross_20260719 backup
      join public.income income on income.id=backup.record_id
    `);
    assert.equal(Number(totals.rows[0].amount),Number(original.rows[0].amount)*2);
    assert.equal(Number(totals.rows[0].paid),Number(original.rows[0].paid)*2);
    assert.equal(Number(totals.rows[0].stable),Number(original.rows[0].paid));
    assert.equal(Number(totals.rows[0].instructor),Number(original.rows[0].paid));

    await db.exec(read('supabase/rollback/rollback_20260719_training_legacy_gross_normalization.sql'));
    const restored=await db.query(`
      select
        count(*)::int as rows,
        bool_and(income.amount_bd=(backup.row_data->>'amount_bd')::numeric) as amount_restored,
        bool_and(income.paid_bd=(backup.row_data->>'paid_bd')::numeric) as paid_restored,
        bool_and(income.training_split_enabled is false) as legacy_restored,
        bool_and(income.stable_share_bd=(backup.row_data->>'paid_bd')::numeric) as stable_restored,
        bool_and(income.instructor_share_bd=0) as instructor_restored
      from cce_migration_backup.training_legacy_gross_20260719 backup
      join public.income income on income.id=backup.record_id
    `);
    assert.deepEqual({...restored.rows[0]},
      {rows:126,amount_restored:true,paid_restored:true,legacy_restored:true,
       stable_restored:true,instructor_restored:true});
    const template=await db.query(`
      select amount_bd::text,paid_bd::text,stable_share_bd::text,instructor_share_bd::text
      from public.income where customer_name='Current training template'
    `);
    assert.deepEqual({...template.rows[0]},
      {amount_bd:'10.000',paid_bd:'10.000',stable_share_bd:'5.000',instructor_share_bd:'5.000'});
  }finally{
    await db.close();
  }
});

test('legacy finance repair is backed up, fail-closed and reversible',async()=>{
  const db=await buildDatabase();
  try{
    await db.exec(`
      alter table public.expenses alter column date drop not null;
      insert into public.income(date,customer_name,qty,amount_bd,paid_bd,status)
      values('2025-02-12','Legacy rider',12,4.167,50,'Paid');
      insert into public.expenses(date,due_date,supplier,qty,amount_bd,paid_bd,status)
      values
        ('2025-08-05','2025-07-01','Legacy supplier',150,0.5,70.11,'Paid'),
        (null,'2026-06-19','Missing date supplier',1,55,0,'Pending');
    `);

    await db.exec(read('supabase/maintenance/20260719_finance_pre_v470_repair.sql'));

    const repaired=await db.query(`
      select 'income' as source,customer_name as party,date::text,amount_bd::text,paid_bd::text
      from public.income where customer_name='Legacy rider'
      union all
      select 'expenses',supplier,date::text,amount_bd::text,paid_bd::text
      from public.expenses where supplier in ('Legacy supplier','Missing date supplier')
      order by source,party
    `);
    assert.deepEqual(repaired.rows.map(row=>({...row})),[
      {source:'expenses',party:'Legacy supplier',date:'2025-08-05',amount_bd:'70.110',paid_bd:'70.110'},
      {source:'expenses',party:'Missing date supplier',date:'2026-06-19',amount_bd:'55.000',paid_bd:'0.000'},
      {source:'income',party:'Legacy rider',date:'2025-02-12',amount_bd:'50.000',paid_bd:'50.000'}
    ]);
    const backup=await db.query(`
      select source,count(*)::int as rows
      from cce_migration_backup.finance_pre_v470_20260719
      group by source order by source
    `);
    assert.deepEqual(backup.rows.map(row=>({...row})),[
      {source:'expenses',rows:2},{source:'income',rows:1}
    ]);

    await db.exec(read('supabase/rollback/rollback_20260719_finance_pre_v470_repair.sql'));
    const restored=await db.query(`
      select customer_name,amount_bd::text from public.income where customer_name='Legacy rider'
    `);
    assert.deepEqual({...restored.rows[0]},{customer_name:'Legacy rider',amount_bd:'4.167'});
    const restoredExpense=await db.query(`
      select supplier,date::text,amount_bd::text
      from public.expenses where supplier='Missing date supplier'
    `);
    assert.deepEqual({...restoredExpense.rows[0]},
      {supplier:'Missing date supplier',date:null,amount_bd:'55.000'});
  }finally{
    await db.close();
  }
});
