import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

async function buildDatabase(){
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
  for(const file of migrations)await db.exec(read(path.join('supabase/migrations',file)));
  return db;
}

test('the full Supabase chain builds and enforces the v4.7.0 contracts',async()=>{
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
    await db.exec('reset role');

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

    await db.exec(read('supabase/verification/verify_v470.sql'));
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
