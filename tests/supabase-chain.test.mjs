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

test('the full Supabase chain builds and enforces the current contracts',async()=>{
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
    const competition=await db.query(`
      insert into public.show_office_competitions(
        competition_name,competition_date,venue,organizer,chief_judge,course_designer,status,notes
      ) values('CCE Summer Cup','2026-08-01','CCE Arena','Country Club Equestrian','Judge One','Designer One','Draft','Sprint 1')
      returning id,competition_name,status,created_by,updated_by
    `);
    assert.equal(competition.rows[0].competition_name,'CCE Summer Cup');
    assert.equal(competition.rows[0].status,'Draft');
    assert.equal(competition.rows[0].created_by,'00000000-0000-4000-8000-000000000002');
    assert.equal(competition.rows[0].updated_by,'00000000-0000-4000-8000-000000000002');
    const competitionId=competition.rows[0].id;
    const updatedCompetition=await db.query(`
      update public.show_office_competitions set status='Open',venue='Main Arena'
      where id=$1 returning status,venue,created_by,updated_by
    `,[competitionId]);
    assert.deepEqual({...updatedCompetition.rows[0]},
      {status:'Open',venue:'Main Arena',created_by:'00000000-0000-4000-8000-000000000002',updated_by:'00000000-0000-4000-8000-000000000002'});
    await assert.rejects(
      db.exec(`update public.show_office_competitions set status='Archived' where id=${competitionId}`),
      /show_office_competitions_status_check/
    );
    await assert.rejects(
      db.exec(`insert into public.show_office_competitions(competition_name,competition_date) values(' CCE Summer Cup ','2026-08-01')`),
      /show_office_competitions_name_date_uidx/
    );
    for (const [column,length,constraint] of [
      ['competition_name',181,'show_office_competitions_name_length_check'],
      ['venue',181,'show_office_competitions_venue_length_check'],
      ['organizer',181,'show_office_competitions_organizer_length_check'],
      ['chief_judge',181,'show_office_competitions_chief_judge_length_check'],
      ['course_designer',181,'show_office_competitions_course_designer_length_check'],
      ['notes',4001,'show_office_competitions_notes_length_check']
    ]) {
      await assert.rejects(
        db.exec(`update public.show_office_competitions set ${column}=repeat('x',${length}) where id=${competitionId}`),
        new RegExp(constraint)
      );
    }
    const competitionClass=await db.query(`
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,height_cm,competition_type,
        allowed_time_seconds,time_limit_seconds,jump_off,entry_fee_bd,notes
      ) values($1,'1A',1,'Open Jumping 100 cm',100,'Table A',72,144,true,12.500,'Sprint 2 class')
      returning id,competition_id,class_number,sort_order,class_name,height_cm,competition_type,
                allowed_time_seconds,time_limit_seconds,jump_off,entry_fee_bd::text,created_by,updated_by
    `,[competitionId]);
    assert.deepEqual({...competitionClass.rows[0]}, {
      id:competitionClass.rows[0].id,competition_id:competitionId,class_number:'1A',sort_order:1,
      class_name:'Open Jumping 100 cm',height_cm:100,competition_type:'Table A',
      allowed_time_seconds:72,time_limit_seconds:144,jump_off:true,entry_fee_bd:'12.500',
      created_by:'00000000-0000-4000-8000-000000000002',
      updated_by:'00000000-0000-4000-8000-000000000002'
    });
    const classId=competitionClass.rows[0].id;
    await assert.rejects(
      db.exec(`insert into public.show_office_classes(competition_id,class_number,sort_order,class_name,competition_type)
               values(${competitionId},' 1a ',2,'Duplicate number','Table A')`),
      /show_office_classes_competition_number_uidx/
    );
    for (const [column,value,constraint] of [
      ['class_number',`repeat('n',31)`,'show_office_classes_number_length_check'],
      ['sort_order','0','show_office_classes_sort_order_check'],
      ['class_name',`repeat('n',181)`,'show_office_classes_name_length_check'],
      ['height_cm','0','show_office_classes_height_check'],
      ['competition_type',`repeat('t',121)`,'show_office_classes_type_length_check'],
      ['allowed_time_seconds','0','show_office_classes_allowed_time_check'],
      ['time_limit_seconds','0','show_office_classes_time_limit_check'],
      ['entry_fee_bd','-1','show_office_classes_entry_fee_check'],
      ['notes',`repeat('x',4001)`,'show_office_classes_notes_length_check']
    ]) {
      await assert.rejects(
        db.exec(`update public.show_office_classes set ${column}=${value} where id=${classId}`),
        new RegExp(constraint)
      );
    }
    await assert.rejects(
      db.exec(`update public.show_office_classes set allowed_time_seconds=72,time_limit_seconds=71 where id=${classId}`),
      /show_office_classes_time_order_check/
    );
    const savedEntry=await db.query(`
      select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>7,p_rider_name=>' Sara Rider ',
        p_horse_name=>' Nabd Entry ',p_stable_name=>' CCE Show Team '
      ) as result
    `,[classId]);
    const entry=savedEntry.rows[0].result;
    assert.equal(entry.start_number,7);
    assert.equal(entry.rider_name,'Sara Rider');
    assert.equal(entry.horse_name,'Nabd Entry');
    assert.equal(entry.stable_name,'CCE Show Team');
    const entryAudit=await db.query(`
      select created_by,updated_by from public.show_office_entries where id=$1
    `,[entry.id]);
    assert.deepEqual({...entryAudit.rows[0]}, {
      created_by:'00000000-0000-4000-8000-000000000002',
      updated_by:'00000000-0000-4000-8000-000000000002'
    });
    const reusedNames=await db.query(`
      select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>7,p_entry_id=>$2,
        p_rider_name=>'sara rider',p_horse_name=>'NABD ENTRY',p_stable_name=>'cce show team'
      ) as result
    `,[classId,entry.id]);
    assert.equal(reusedNames.rows[0].result.rider_id,entry.rider_id);
    assert.equal(reusedNames.rows[0].result.horse_id,entry.horse_id);
    const registryCounts=await db.query(`
      select (select count(*)::int from public.show_office_riders) as riders,
             (select count(*)::int from public.show_office_horses) as horses,
             (select count(*)::int from public.show_office_stables) as stables
    `);
    assert.deepEqual({...registryCounts.rows[0]}, {riders:1,horses:1,stables:1});
    await assert.rejects(
      db.query(`select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>7,p_rider_name=>'Other Rider',p_horse_name=>'Other Horse'
      )`,[classId]),
      /show_office_entries_class_start_uidx/
    );
    await assert.rejects(
      db.query(`select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>8,p_rider_id=>$2,p_horse_id=>$3
      )`,[classId,entry.rider_id,entry.horse_id]),
      /show_office_entries_class_pair_uidx/
    );
    await assert.rejects(
      db.query(`select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>8,p_rider_name=>repeat('r',181),p_horse_name=>'Valid Horse'
      )`,[classId]),
      /valid rider name/i
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000003'; set role authenticated`);
    const hiddenCompetition=await db.query(`select id from public.show_office_competitions where id=$1`,[competitionId]);
    assert.equal(hiddenCompetition.rows.length,0);
    await assert.rejects(
      db.exec(`insert into public.show_office_competitions(competition_name,competition_date) values('Unauthorized Cup','2026-08-02')`),
      /row-level security policy/
    );
    const hiddenClass=await db.query(`select id from public.show_office_classes where id=$1`,[classId]);
    assert.equal(hiddenClass.rows.length,0);
    const hiddenEntry=await db.query(`select id from public.show_office_entries where id=$1`,[entry.id]);
    assert.equal(hiddenEntry.rows.length,0);
    await assert.rejects(
      db.query(`select * from public.cce_show_office_class_competitions()`),
      /Permission denied/
    );
    await assert.rejects(
      db.exec(`insert into public.show_office_classes(competition_id,class_number,sort_order,class_name,competition_type)
               values(${competitionId},'2',2,'Unauthorized class','Table A')`),
      /row-level security policy/
    );
    await assert.rejects(
      db.query(`select public.cce_show_office_entries_page($1,'',100,0)`,[classId]),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`
      insert into public.role_permissions(role_id,permission_code,allowed)
      select id,'show_office.classes.view',true from public.app_roles where code='reception'
      on conflict(role_id,permission_code) do update set allowed=true;
      insert into public.role_permissions(role_id,permission_code,allowed)
      select id,'show_office.entries.view',true from public.app_roles where code='reception'
      on conflict(role_id,permission_code) do update set allowed=true;
      set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000003';
      set role authenticated;
    `);
    const viewOnlyCompetition=await db.query(`select * from public.show_office_competitions where id=$1`,[competitionId]);
    const classCompetitionDirectory=await db.query(`
      select * from public.cce_show_office_class_competitions() where id=$1
    `,[competitionId]);
    const viewOnlyClass=await db.query(`select class_name from public.show_office_classes where id=$1`,[classId]);
    assert.equal(viewOnlyCompetition.rows.length,0);
    assert.deepEqual(Object.keys({...classCompetitionDirectory.rows[0]}).sort(),[
      'competition_date','competition_name','id'
    ]);
    assert.equal(classCompetitionDirectory.rows[0].competition_name,'CCE Summer Cup');
    assert.equal(viewOnlyClass.rows[0].class_name,'Open Jumping 100 cm');
    const viewOnlyEntry=await db.query(`select start_number from public.show_office_entries where id=$1`,[entry.id]);
    assert.equal(viewOnlyEntry.rows[0].start_number,7);
    const entryPage=await db.query(`select public.cce_show_office_entries_page($1,'Sara',100,0) as result`,[classId]);
    assert.equal(entryPage.rows[0].result.total,1);
    assert.equal(entryPage.rows[0].result.rows[0].horse_name,'Nabd Entry');
    const entryDirectoryResult=await db.query(`select public.cce_show_office_entry_directory('Nabd',10) as result`);
    assert.equal(entryDirectoryResult.rows[0].result.horses[0].horse_name,'Nabd Entry');
    await assert.rejects(
      db.exec(`insert into public.show_office_classes(competition_id,class_number,sort_order,class_name,competition_type)
               values(${competitionId},'2',2,'View-only write','Table A')`),
      /row-level security policy/
    );
    const viewOnlyUpdate=await db.query(`update public.show_office_classes set class_name='Blocked update' where id=$1 returning id`,[classId]);
    const viewOnlyDelete=await db.query(`delete from public.show_office_classes where id=$1 returning id`,[classId]);
    assert.equal(viewOnlyUpdate.rows.length,0);
    assert.equal(viewOnlyDelete.rows.length,0);
    await assert.rejects(
      db.query(`select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>9,p_rider_name=>'Blocked Rider',p_horse_name=>'Blocked Horse'
      )`,[classId]),
      /Permission denied/
    );
    const viewOnlyEntryUpdate=await db.query(`update public.show_office_entries set start_number=9 where id=$1 returning id`,[entry.id]);
    const viewOnlyEntryDelete=await db.query(`delete from public.show_office_entries where id=$1 returning id`,[entry.id]);
    assert.equal(viewOnlyEntryUpdate.rows.length,0);
    assert.equal(viewOnlyEntryDelete.rows.length,0);
    await db.exec(`
      reset role;
      update public.role_permissions rp set allowed=false
      from public.app_roles r
      where rp.role_id=r.id and r.code='reception' and rp.permission_code='show_office.classes.view';
      update public.role_permissions rp set allowed=false
      from public.app_roles r
      where rp.role_id=r.id and r.code='reception' and rp.permission_code='show_office.entries.view';
    `);

    await db.exec(`set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000002'; set role authenticated`);
    await assert.rejects(
      db.exec(`delete from public.show_office_competitions where id=${competitionId}`),
      /show_office_classes_competition_id_fkey/
    );
    await assert.rejects(
      db.exec(`delete from public.show_office_classes where id=${classId}`),
      /show_office_entries_class_id_fkey/
    );
    const updatedClass=await db.query(`
      update public.show_office_classes set class_name='Open Jumping 105 cm',height_cm=105
      where id=$1 returning class_name,height_cm,created_by,updated_by
    `,[classId]);
    assert.deepEqual({...updatedClass.rows[0]}, {
      class_name:'Open Jumping 105 cm',height_cm:105,
      created_by:'00000000-0000-4000-8000-000000000002',
      updated_by:'00000000-0000-4000-8000-000000000002'
    });
    const updatedEntry=await db.query(`
      select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>17,p_entry_id=>$2,p_rider_id=>$3,p_horse_id=>$4,p_stable_id=>$5
      ) as result
    `,[classId,entry.id,entry.rider_id,entry.horse_id,entry.stable_id]);
    assert.equal(updatedEntry.rows[0].result.start_number,17);
    await db.exec(`delete from public.show_office_entries where id=${entry.id}`);
    await db.exec(`delete from public.show_office_classes where id=${classId}`);
    await db.exec(`delete from public.show_office_competitions where id=${competitionId}`);
    const deletedCompetition=await db.query(`select count(*)::int as rows from public.show_office_competitions where id=$1`,[competitionId]);
    assert.equal(deletedCompetition.rows[0].rows,0);
    await db.exec('reset role');

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
    await db.exec(read('supabase/verification/preflight_v490.sql'));
    await db.exec(read('supabase/verification/preflight_v491.sql'));
    await db.exec(read('supabase/verification/preflight_v4100.sql'));
    await db.exec(read('supabase/verification/preflight_v4110.sql'));
    await db.exec(read('supabase/verification/verify_v470.sql'));
    await db.exec(read('supabase/verification/verify_v481.sql'));
    await db.exec(read('supabase/verification/verify_v490.sql'));
    await db.exec(read('supabase/verification/verify_v491.sql'));
    await db.exec(read('supabase/verification/verify_v4100.sql'));
    await db.exec(read('supabase/verification/verify_v4110.sql'));
    await db.exec(read('supabase/verification/verify_v4120.sql'));
    await db.exec(read('supabase/verification/preflight_v4130.sql'));
    await db.exec(read('supabase/verification/verify_v4130.sql'));
  }finally{
    await db.close();
  }
});

test('Show Office backup restore is atomic, duplicate-safe and owns audit identities',async()=>{
  const db=await buildDatabase();
  const creator='00000000-0000-4000-8000-000000000020';
  const restorer='00000000-0000-4000-8000-000000000021';
  const unauthorized='00000000-0000-4000-8000-000000000022';
  const asJson=value=>JSON.parse(JSON.stringify(value));
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${creator}','restore-creator@example.com'),
        ('${restorer}','restore-operator@example.com'),
        ('${unauthorized}','restore-reception@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${creator}' and r.code='manager')
         or (p.id='${restorer}' and r.code='manager')
         or (p.id='${unauthorized}' and r.code='reception');
      set "request.jwt.claim.sub"='${creator}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status,notes)
      values('Existing Restore Cup','2026-10-01','Draft','Original record');
      reset role;
    `);

    const payload=[
      {
        id:900,competition_name:' existing restore cup ',competition_date:'2026-10-01',status:'Finished',
        notes:'Must not overwrite',created_by:restorer,updated_by:restorer
      },
      {
        id:901,competition_name:' Restored Autumn Cup ',competition_date:'2026-10-02',venue:' CCE Arena ',status:'Open',
        created_by:creator,updated_by:creator,created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-02T00:00:00Z'
      },
      {competition_name:'restored autumn cup',competition_date:'2026-10-02',status:'Open'}
    ];
    await db.exec(`set "request.jwt.claim.sub"='${restorer}'; set role authenticated`);
    const restored=await db.query(
      `select public.cce_restore_show_office_competitions($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.deepEqual(asJson(restored.rows[0].result),{
      module:'showOffice',total:3,imported:1,duplicates:2,invalid:0
    });

    const rows=await db.query(`
      select competition_name,competition_date::text,status,notes,venue,created_by,updated_by
      from public.show_office_competitions order by competition_date
    `);
    assert.deepEqual(rows.rows.map(row=>({...row})),[
      {
        competition_name:'Existing Restore Cup',competition_date:'2026-10-01',status:'Draft',
        notes:'Original record',venue:null,created_by:creator,updated_by:creator
      },
      {
        competition_name:'Restored Autumn Cup',competition_date:'2026-10-02',status:'Open',
        notes:null,venue:'CCE Arena',created_by:restorer,updated_by:restorer
      }
    ]);

    const repeated=await db.query(
      `select public.cce_restore_show_office_competitions($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.deepEqual(asJson(repeated.rows[0].result),{
      module:'showOffice',total:3,imported:0,duplicates:3,invalid:0
    });

    const invalidPayload=[
      {competition_name:'Atomic Valid Cup',competition_date:'2026-10-03',status:'Draft'},
      {competition_name:'Atomic Invalid Cup',competition_date:'2026-10-04',status:'Archived'}
    ];
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_competitions($1::jsonb)`,[JSON.stringify(invalidPayload)]),
      /invalid status/
    );
    const atomic=await db.query(`select count(*)::int as rows from public.show_office_competitions where competition_name='Atomic Valid Cup'`);
    assert.equal(atomic.rows[0].rows,0);
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_competitions('{}'::jsonb)`),
      /must be a JSON array/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${unauthorized}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_competitions('[{"competition_name":"Denied Cup","competition_date":"2026-10-05"}]'::jsonb)`),
      /Permission denied/
    );
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('Show Office Sprint 2 restore keeps competitions and classes atomic and portable',async()=>{
  const db=await buildDatabase();
  const creator='00000000-0000-4000-8000-000000000030';
  const restorer='00000000-0000-4000-8000-000000000031';
  const unauthorized='00000000-0000-4000-8000-000000000032';
  const asJson=value=>JSON.parse(JSON.stringify(value));
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${creator}','class-creator@example.com'),
        ('${restorer}','class-restorer@example.com'),
        ('${unauthorized}','class-reception@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${creator}' and r.code='manager')
         or (p.id='${restorer}' and r.code='manager')
         or (p.id='${unauthorized}' and r.code='reception');
      set "request.jwt.claim.sub"='${creator}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Existing Class Cup','2026-12-01','Open');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type
      ) select id,'1',1,'Existing class','Table A'
        from public.show_office_competitions where competition_name='Existing Class Cup';
      reset role;
    `);

    const payload={
      competitions:[
        {competition_name:' existing class cup ',competition_date:'2026-12-01',status:'Finished'},
        {competition_name:' Restored Winter Cup ',competition_date:'2026-12-02',status:'Draft',created_by:creator}
      ],
      classes:[
        {
          competition_name:'Existing Class Cup',competition_date:'2026-12-01',class_number:' 1 ',sort_order:1,
          class_name:'Must not overwrite',competition_type:'Table A',jump_off:false,entry_fee_bd:0
        },
        {
          competition_name:'Restored Winter Cup',competition_date:'2026-12-02',class_number:' 2A ',sort_order:2,
          class_name:'Winter Grand Prix',height_cm:130,competition_type:'Table A',allowed_time_seconds:75,
          time_limit_seconds:150,jump_off:true,entry_fee_bd:20.500,notes:'Imported class',
          created_by:creator,updated_by:creator
        }
      ]
    };
    await db.exec(`set "request.jwt.claim.sub"='${restorer}'; set role authenticated`);
    const restored=await db.query(
      `select public.cce_restore_show_office_module($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.deepEqual(asJson(restored.rows[0].result),{
      module:'showOffice',total:4,imported:2,duplicates:2,invalid:0,
      entities:{
        competitions:{total:2,imported:1,duplicates:1,invalid:0},
        classes:{total:2,imported:1,duplicates:1,invalid:0},
        riders:{total:0,imported:0,duplicates:0,invalid:0},
        horses:{total:0,imported:0,duplicates:0,invalid:0},
        stables:{total:0,imported:0,duplicates:0,invalid:0},
        entries:{total:0,imported:0,duplicates:0,invalid:0},
        judging:{total:0,imported:0,duplicates:0,invalid:0},
        scores:{total:0,imported:0,duplicates:0,invalid:0}
      }
    });
    const imported=await db.query(`
      select c.competition_name,c.created_by,c.updated_by,
             cl.class_number,cl.class_name,cl.height_cm,cl.competition_type,
             cl.entry_fee_bd::text,cl.created_by as class_created_by,cl.updated_by as class_updated_by
      from public.show_office_competitions c
      join public.show_office_classes cl on cl.competition_id=c.id
      where c.competition_name='Restored Winter Cup'
    `);
    assert.deepEqual({...imported.rows[0]}, {
      competition_name:'Restored Winter Cup',created_by:restorer,updated_by:restorer,
      class_number:'2A',class_name:'Winter Grand Prix',height_cm:130,competition_type:'Table A',
      entry_fee_bd:'20.500',class_created_by:restorer,class_updated_by:restorer
    });

    const repeated=await db.query(
      `select public.cce_restore_show_office_module($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.deepEqual(asJson(repeated.rows[0].result),{
      module:'showOffice',total:4,imported:0,duplicates:4,invalid:0,
      entities:{
        competitions:{total:2,imported:0,duplicates:2,invalid:0},
        classes:{total:2,imported:0,duplicates:2,invalid:0},
        riders:{total:0,imported:0,duplicates:0,invalid:0},
        horses:{total:0,imported:0,duplicates:0,invalid:0},
        stables:{total:0,imported:0,duplicates:0,invalid:0},
        entries:{total:0,imported:0,duplicates:0,invalid:0},
        judging:{total:0,imported:0,duplicates:0,invalid:0},
        scores:{total:0,imported:0,duplicates:0,invalid:0}
      }
    });

    const atomicPayload={
      competitions:[{competition_name:'Atomic Sprint 2 Cup',competition_date:'2026-12-03',status:'Draft'}],
      classes:[{
        competition_name:'Missing Parent Cup',competition_date:'2026-12-04',class_number:'1',sort_order:1,
        class_name:'Invalid parent',competition_type:'Table A'
      }]
    };
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(atomicPayload)]),
      /references an unavailable competition/
    );
    const atomic=await db.query(`select count(*)::int as rows from public.show_office_competitions where competition_name='Atomic Sprint 2 Cup'`);
    assert.equal(atomic.rows[0].rows,0);
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${unauthorized}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify({competitions:[],classes:[]})]),
      /Permission denied/
    );
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('Show Office Sprint 3 restore is atomic, portable, duplicate-safe and backward compatible',async()=>{
  const db=await buildDatabase();
  const restorer='00000000-0000-4000-8000-000000000035';
  const unauthorized='00000000-0000-4000-8000-000000000036';
  const riderRef='00000000-0000-4000-8000-000000000135';
  const horseRef='00000000-0000-4000-8000-000000000136';
  const stableRef='00000000-0000-4000-8000-000000000137';
  const entryRef='00000000-0000-4000-8000-000000000138';
  const asJson=value=>JSON.parse(JSON.stringify(value));
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${restorer}','entry-restorer@example.com'),
        ('${unauthorized}','entry-unauthorized@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${restorer}' and r.code='manager')
         or (p.id='${unauthorized}' and r.code='reception');
    `);
    const payload={
      competitions:[{competition_name:'Portable Entry Cup',competition_date:'2027-02-01',status:'Open'}],
      classes:[{
        competition_name:'Portable Entry Cup',competition_date:'2027-02-01',class_number:'1A',
        sort_order:1,class_name:'Entry Class',competition_type:'Table A',jump_off:false,entry_fee_bd:5
      }],
      riders:[{rider_ref:riderRef,rider_name:'Portable Rider'}],
      horses:[{horse_ref:horseRef,horse_name:'Portable Horse'}],
      stables:[{stable_ref:stableRef,stable_name:'Portable Stable'}],
      entries:[{
        entry_ref:entryRef,competition_name:'Portable Entry Cup',competition_date:'2027-02-01',
        class_number:'1A',start_number:21,rider_ref:riderRef,horse_ref:horseRef,stable_ref:stableRef
      }]
    };
    await db.exec(`set "request.jwt.claim.sub"='${restorer}'; set role authenticated`);
    const restored=await db.query(`select public.cce_restore_show_office_module($1::jsonb) as result`,[JSON.stringify(payload)]);
    assert.deepEqual(asJson(restored.rows[0].result),{
      module:'showOffice',total:6,imported:6,duplicates:0,invalid:0,
      entities:{
        competitions:{total:1,imported:1,duplicates:0,invalid:0},
        classes:{total:1,imported:1,duplicates:0,invalid:0},
        riders:{total:1,imported:1,duplicates:0,invalid:0},
        horses:{total:1,imported:1,duplicates:0,invalid:0},
        stables:{total:1,imported:1,duplicates:0,invalid:0},
        entries:{total:1,imported:1,duplicates:0,invalid:0},
        judging:{total:0,imported:0,duplicates:0,invalid:0},
        scores:{total:0,imported:0,duplicates:0,invalid:0}
      }
    });
    const imported=await db.query(`
      select e.entry_ref,e.start_number,r.rider_name,h.horse_name,s.stable_name,
             e.created_by,e.updated_by
      from public.show_office_entries e
      join public.show_office_riders r on r.id=e.rider_id
      join public.show_office_horses h on h.id=e.horse_id
      left join public.show_office_stables s on s.id=e.stable_id
      where e.entry_ref=$1
    `,[entryRef]);
    assert.deepEqual({...imported.rows[0]}, {
      entry_ref:entryRef,start_number:21,rider_name:'Portable Rider',horse_name:'Portable Horse',
      stable_name:'Portable Stable',created_by:restorer,updated_by:restorer
    });
    const repeated=await db.query(`select public.cce_restore_show_office_module($1::jsonb) as result`,[JSON.stringify(payload)]);
    assert.equal(repeated.rows[0].result.imported,0);
    assert.equal(repeated.rows[0].result.duplicates,6);

    const collisionPayload={
      competitions:[{competition_name:'Cross Environment Cup',competition_date:'2027-02-03',status:'Draft'}],
      classes:[{competition_name:'Cross Environment Cup',competition_date:'2027-02-03',class_number:'2',sort_order:1,class_name:'Cross Environment',competition_type:'Table A'}],
      riders:[{rider_ref:'00000000-0000-4000-8000-000000000235',rider_name:'portable rider'}],
      horses:[{horse_ref:'00000000-0000-4000-8000-000000000236',horse_name:'PORTABLE HORSE'}],
      stables:[{stable_ref:'00000000-0000-4000-8000-000000000237',stable_name:'Portable Stable'}],
      entries:[{
        entry_ref:'00000000-0000-4000-8000-000000000238',competition_name:'Cross Environment Cup',
        competition_date:'2027-02-03',class_number:'2',start_number:22,
        rider_ref:'00000000-0000-4000-8000-000000000235',
        horse_ref:'00000000-0000-4000-8000-000000000236',
        stable_ref:'00000000-0000-4000-8000-000000000237'
      }]
    };
    const collision=await db.query(`select public.cce_restore_show_office_module($1::jsonb) as result`,[JSON.stringify(collisionPayload)]);
    assert.equal(collision.rows[0].result.imported,3);
    assert.equal(collision.rows[0].result.duplicates,3);
    const collisionEntry=await db.query(`
      select r.rider_ref,h.horse_ref,s.stable_ref
      from public.show_office_entries e
      join public.show_office_riders r on r.id=e.rider_id
      join public.show_office_horses h on h.id=e.horse_id
      join public.show_office_stables s on s.id=e.stable_id
      where e.entry_ref='00000000-0000-4000-8000-000000000238'
    `);
    assert.deepEqual({...collisionEntry.rows[0]}, {rider_ref:riderRef,horse_ref:horseRef,stable_ref:stableRef});

    const atomicPayload={
      competitions:[{competition_name:'Atomic Entry Cup',competition_date:'2027-02-02',status:'Draft'}],
      classes:[{competition_name:'Atomic Entry Cup',competition_date:'2027-02-02',class_number:'1',sort_order:1,class_name:'Atomic',competition_type:'Table A'}],
      riders:[],horses:[],stables:[],
      entries:[{
        entry_ref:'00000000-0000-4000-8000-000000000139',competition_name:'Atomic Entry Cup',
        competition_date:'2027-02-02',class_number:'1',start_number:1,
        rider_ref:'00000000-0000-4000-8000-000000000199',horse_ref:horseRef,stable_ref:null
      }]
    };
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(atomicPayload)]),
      /references an unavailable rider, horse or stable/
    );
    const atomic=await db.query(`select count(*)::int as rows from public.show_office_competitions where competition_name='Atomic Entry Cup'`);
    assert.equal(atomic.rows[0].rows,0);
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${unauthorized}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(payload)]),
      /Permission denied/
    );
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('Show Office Sprint 4 Judge Panel enforces scoring, ranking, locking and permissions',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000050';
  const judge='00000000-0000-4000-8000-000000000051';
  const unauthorized='00000000-0000-4000-8000-000000000052';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','judge-manager@example.com'),
        ('${judge}','judge@example.com'),
        ('${unauthorized}','judge-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager')
         or (p.id='${judge}' and r.code='judge')
         or (p.id='${unauthorized}' and r.code='trainer');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
    `);
    const competition=await db.query(`
      insert into public.show_office_competitions(
        competition_name,competition_date,status
      ) values('Sprint 4 Judge Cup','2027-04-01','Running') returning id
    `);
    const competitionId=competition.rows[0].id;
    const competitionClass=await db.query(`
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type,
        allowed_time_seconds,time_limit_seconds,jump_off
      ) values($1,'GP',1,'Grand Prix','Table A',75,150,true) returning id
    `,[competitionId]);
    const classId=competitionClass.rows[0].id;
    const first=await db.query(`
      select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>1,p_rider_name=>'Rider One',
        p_horse_name=>'Horse One',p_stable_name=>'CCE'
      ) as result
    `,[classId]);
    const second=await db.query(`
      select public.cce_save_show_office_entry(
        p_class_id=>$1,p_start_number=>2,p_rider_name=>'Rider Two',
        p_horse_name=>'Horse Two',p_stable_name=>'Bahrain Team'
      ) as result
    `,[classId]);
    const firstEntry=first.rows[0].result;
    const secondEntry=second.rows[0].result;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const context=await db.query(`select * from public.cce_show_office_judging_context() where class_id=$1`,[classId]);
    assert.equal(context.rows.length,1);
    assert.equal(Number(context.rows[0].entry_count),2);
    assert.equal(context.rows[0].judging_status,'Not Started');
    const firstScore=await db.query(`
      select public.cce_save_show_office_score(
        $1::bigint,'first_round',70000,4::numeric,1::smallint,false,false,false,0
      ) as result
    `,[firstEntry.id]);
    assert.equal(firstScore.rows[0].result.row_version,1);
    const secondScore=await db.query(`
      select public.cce_save_show_office_score(
        $1::bigint,'first_round',75000,0::numeric,0::smallint,false,false,false,0
      ) as result
    `,[secondEntry.id]);
    assert.equal(secondScore.rows[0].result.row_version,1);
    let panel=await db.query(`select public.cce_show_office_judge_panel($1) as result`,[classId]);
    assert.equal(panel.rows[0].result.rows.find(row=>row.entry_id===secondEntry.id).placing,1);
    assert.equal(panel.rows[0].result.class.judging_status,'Running');

    await assert.rejects(
      db.query(`
        select public.cce_save_show_office_score(
          $1::bigint,'first_round',69000,0::numeric,0::smallint,false,false,false,0
        )
      `,[firstEntry.id]),
      /changed on another device/
    );
    const corrected=await db.query(`
      select public.cce_save_show_office_score(
        $1::bigint,'first_round',69000,0::numeric,0::smallint,false,false,false,1
      ) as result
    `,[firstEntry.id]);
    assert.equal(corrected.rows[0].result.row_version,2);
    await db.query(`
      select public.cce_save_show_office_score(
        $1::bigint,'jump_off',40000,0::numeric,0::smallint,false,false,false,0
      )
    `,[firstEntry.id]);
    panel=await db.query(`select public.cce_show_office_judge_panel($1) as result`,[classId]);
    assert.equal(panel.rows[0].result.rows.find(row=>row.entry_id===firstEntry.id).placing,1);
    assert.equal(panel.rows[0].result.rows.find(row=>row.entry_id===firstEntry.id).jump_off.time_ms,40000);

    await assert.rejects(
      db.exec(`
        insert into public.show_office_entry_rounds(
          entry_id,phase,time_ms,faults
        ) values(${secondEntry.id},'jump_off',42000,0)
      `),
      /permission denied/
    );
    await assert.rejects(
      db.query(`select public.cce_finalize_show_office_class($1)`,[classId]),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const finalized=await db.query(`select public.cce_finalize_show_office_class($1) as result`,[classId]);
    assert.equal(finalized.rows[0].result.status,'Finalized');
    await assert.rejects(
      db.query(`
        select public.cce_save_show_office_score(
          $1::bigint,'first_round',68000,0::numeric,0::smallint,false,false,false,2
        )
      `,[firstEntry.id]),
      /finalized and locked/
    );
    const reopened=await db.query(`select public.cce_reopen_show_office_class($1) as result`,[classId]);
    assert.equal(reopened.rows[0].result.status,'Running');
    await db.query(`update public.show_office_competitions set status='Finished' where id=$1`,[competitionId]);
    await assert.rejects(
      db.query(`
        select public.cce_reset_show_office_score($1,'jump_off',1)
      `,[firstEntry.id]),
      /Competition must be Running/
    );
    await db.query(`update public.show_office_competitions set status='Running' where id=$1`,[competitionId]);
    const reset=await db.query(`
      select public.cce_reset_show_office_score($1,'jump_off',1) as result
    `,[firstEntry.id]);
    assert.equal(reset.rows[0].result,true);
    await db.exec('reset role');

    const revisions=await db.query(`
      select action,count(*)::int as rows
      from public.show_office_score_revisions
      group by action order by action
    `);
    assert.deepEqual(revisions.rows.map(row=>({...row})),[
      {action:'create',rows:3},{action:'reset',rows:1},{action:'update',rows:1}
    ]);

    await db.exec(`set "request.jwt.claim.sub"='${unauthorized}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_show_office_judge_panel($1)`,[classId]),
      /Permission denied/
    );
    const hidden=await db.query(`select id from public.show_office_entry_rounds`);
    assert.equal(hidden.rows.length,0);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('Show Office Sprint 4 restore is atomic, duplicate-safe and accepts older backups',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000055';
  const riderRef='00000000-0000-4000-8000-000000000551';
  const horseRef='00000000-0000-4000-8000-000000000552';
  const entryRef='00000000-0000-4000-8000-000000000553';
  const resultRef='00000000-0000-4000-8000-000000000554';
  const asJson=value=>JSON.parse(JSON.stringify(value));
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','judging-restore@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
    `);
    const payload={
      competitions:[{competition_name:'Portable Judge Cup',competition_date:'2027-05-01',status:'Running'}],
      classes:[{
        competition_name:'Portable Judge Cup',competition_date:'2027-05-01',
        class_number:'1',sort_order:1,class_name:'Portable Judge Class',
        competition_type:'Table A',jump_off:false
      }],
      riders:[{rider_ref:riderRef,rider_name:'Portable Judge Rider'}],
      horses:[{horse_ref:horseRef,horse_name:'Portable Judge Horse'}],
      stables:[],
      entries:[{
        entry_ref:entryRef,competition_name:'Portable Judge Cup',
        competition_date:'2027-05-01',class_number:'1',start_number:11,
        rider_ref:riderRef,horse_ref:horseRef,stable_ref:null
      }],
      judging:[{
        competition_name:'Portable Judge Cup',competition_date:'2027-05-01',
        class_number:'1',status:'Running',scoring_profile:'faults_then_time',
        ruleset_version:'CCE 2026'
      }],
      scores:[{
        result_ref:resultRef,entry_ref:entryRef,phase:'first_round',
        time_ms:71500,faults:0,refusals:0,
        eliminated:false,retired:false,did_not_start:false
      }]
    };
    const restored=await db.query(
      `select public.cce_restore_show_office_module($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.deepEqual(asJson(restored.rows[0].result),{
      module:'showOffice',total:7,imported:7,duplicates:0,invalid:0,
      entities:{
        competitions:{total:1,imported:1,duplicates:0,invalid:0},
        classes:{total:1,imported:1,duplicates:0,invalid:0},
        riders:{total:1,imported:1,duplicates:0,invalid:0},
        horses:{total:1,imported:1,duplicates:0,invalid:0},
        stables:{total:0,imported:0,duplicates:0,invalid:0},
        entries:{total:1,imported:1,duplicates:0,invalid:0},
        judging:{total:1,imported:1,duplicates:0,invalid:0},
        scores:{total:1,imported:1,duplicates:0,invalid:0}
      }
    });
    const repeated=await db.query(
      `select public.cce_restore_show_office_module($1::jsonb) as result`,
      [JSON.stringify(payload)]
    );
    assert.equal(repeated.rows[0].result.imported,0);
    assert.equal(repeated.rows[0].result.duplicates,7);

    const legacy=await db.query(`
      select public.cce_restore_show_office_module(
        '{"competitions":[{"competition_name":"Legacy Compatible Cup","competition_date":"2027-05-02","status":"Draft"}]}'::jsonb
      ) as result
    `);
    assert.equal(legacy.rows[0].result.imported,1);
    assert.equal(legacy.rows[0].result.entities.judging.total,0);
    assert.equal(legacy.rows[0].result.entities.scores.total,0);

    const invalid={
      competitions:[{competition_name:'Atomic Judge Cup',competition_date:'2027-05-03',status:'Draft'}],
      classes:[],riders:[],horses:[],stables:[],entries:[],judging:[],
      scores:[{
        result_ref:'00000000-0000-4000-8000-000000000555',
        entry_ref:'00000000-0000-4000-8000-000000000599',
        phase:'first_round',time_ms:70000,faults:0,refusals:0
      }]
    };
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(invalid)]),
      /references an unavailable entry/
    );
    const atomic=await db.query(`
      select count(*)::int as rows
      from public.show_office_competitions
      where competition_name='Atomic Judge Cup'
    `);
    assert.equal(atomic.rows[0].rows,0);

    const missingJudging={
      competitions:[{competition_name:'Missing Judging Cup',competition_date:'2027-05-05',status:'Running'}],
      classes:[{
        competition_name:'Missing Judging Cup',competition_date:'2027-05-05',
        class_number:'1',sort_order:1,class_name:'Missing Judging Class',
        competition_type:'Table A'
      }],
      riders:[{
        rider_ref:'00000000-0000-4000-8000-000000000561',
        rider_name:'Missing Judging Rider'
      }],
      horses:[{
        horse_ref:'00000000-0000-4000-8000-000000000562',
        horse_name:'Missing Judging Horse'
      }],
      stables:[],
      entries:[{
        entry_ref:'00000000-0000-4000-8000-000000000563',
        competition_name:'Missing Judging Cup',competition_date:'2027-05-05',
        class_number:'1',start_number:1,
        rider_ref:'00000000-0000-4000-8000-000000000561',
        horse_ref:'00000000-0000-4000-8000-000000000562',stable_ref:null
      }],
      judging:[],
      scores:[{
        result_ref:'00000000-0000-4000-8000-000000000564',
        entry_ref:'00000000-0000-4000-8000-000000000563',
        phase:'first_round',time_ms:70000,faults:0,refusals:0
      }]
    };
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(missingJudging)]),
      /requires a judging record/
    );
    const missingJudgingAtomic=await db.query(`
      select count(*)::int as rows
      from public.show_office_competitions
      where competition_name='Missing Judging Cup'
    `);
    assert.equal(missingJudgingAtomic.rows[0].rows,0);

    const emptyFinalized={
      competitions:[{competition_name:'Empty Finalized Cup',competition_date:'2027-05-04',status:'Running'}],
      classes:[{
        competition_name:'Empty Finalized Cup',competition_date:'2027-05-04',
        class_number:'1',sort_order:1,class_name:'Empty Finalized Class',
        competition_type:'Table A'
      }],
      riders:[],horses:[],stables:[],entries:[],
      judging:[{
        competition_name:'Empty Finalized Cup',competition_date:'2027-05-04',
        class_number:'1',status:'Finalized',scoring_profile:'faults_then_time',
        ruleset_version:'CCE 2026'
      }],
      scores:[]
    };
    await assert.rejects(
      db.query(`select public.cce_restore_show_office_module($1::jsonb)`,[JSON.stringify(emptyFinalized)]),
      /finalized class has unscored entries/
    );
    const emptyAtomic=await db.query(`
      select count(*)::int as rows
      from public.show_office_competitions
      where competition_name='Empty Finalized Cup'
    `);
    assert.equal(emptyAtomic.rows[0].rows,0);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.12 compatibility rollback preserves scores and Sprint 4 can be re-applied',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000056';
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','judging-rollback@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Judge Rollback Cup','2027-06-01','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type
      ) select id,'1',1,'Judge Rollback Class','Table A'
        from public.show_office_competitions where competition_name='Judge Rollback Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Judge Rollback Class'),
        p_start_number=>1,p_rider_name=>'Rollback Rider',p_horse_name=>'Rollback Horse'
      );
      select public.cce_save_show_office_score(
        (select id from public.show_office_entries where start_number=1),
        'first_round',70000,0::numeric,0::smallint,false,false,false,0
      );
      reset role;
    `);
    await db.exec(read('supabase/rollback/rollback_v4120_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        (select count(*)::int from public.show_office_entry_rounds) as score_rows,
        to_regprocedure('public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer)') is null as save_removed,
        to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as core_restore_ready,
        (select count(*)::int from pg_policies where schemaname='public'
          and tablename in ('show_office_class_judging','show_office_entry_rounds','show_office_score_revisions')) as policies,
        (select bool_and(allowed is false) from public.role_permissions
          where permission_code like 'show_office.judging.%') as defaults_disabled
    `);
    assert.deepEqual({...rolledBack.rows[0]},{
      score_rows:1,save_removed:true,core_restore_ready:true,policies:0,defaults_disabled:true
    });
    await db.exec(read('supabase/migrations/20260724_show_office_sprint4_judging_v4120.sql'));
    const reapplied=await db.query(`
      select
        (select count(*)::int from public.show_office_entry_rounds) as score_rows,
        to_regprocedure('public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer)') is not null as save_ready,
        (select count(*)::int from pg_policies where schemaname='public'
          and tablename in ('show_office_class_judging','show_office_entry_rounds','show_office_score_revisions')) as policies,
        (select count(*)::int from public.role_permissions rp
          join public.app_roles r on r.id=rp.role_id
          where r.code in ('manager','super_admin') and rp.permission_code like 'show_office.judging.%'
            and rp.allowed) as manager_defaults,
        (select count(*)::int from public.role_permissions rp
          join public.app_roles r on r.id=rp.role_id
          where r.code='judge' and rp.permission_code like 'show_office.judging.%'
            and rp.allowed) as judge_defaults
    `);
    assert.deepEqual({...reapplied.rows[0]},{
      score_rows:1,save_ready:true,policies:3,manager_defaults:8,judge_defaults:2
    });
  }finally{
    await db.close();
  }
});

test('v4.13 results.view widens the judging read RPCs and rollback restores v4.12 scope',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000058';
  const receptionist='00000000-0000-4000-8000-000000000059';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','live-results-manager@example.com'),
        ('${receptionist}','live-results-reception@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager')
         or (p.id='${receptionist}' and r.code='reception');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Live Results Cup','2027-07-01','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type
      ) select id,'1',1,'Live Results Class','Table A'
        from public.show_office_competitions where competition_name='Live Results Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Live Results Class'),
        p_start_number=>1,p_rider_name=>'Live Rider',p_horse_name=>'Live Horse'
      );
      select public.cce_save_show_office_score(
        (select id from public.show_office_entries where start_number=1),
        'first_round',70000,0::numeric,0::smallint,false,false,false,0
      );
    `);
    const classRow=await db.query(`select id from public.show_office_classes where class_name='Live Results Class'`);
    const classId=classRow.rows[0].id;
    const entryRow=await db.query(`select id from public.show_office_entries where start_number=1`);
    const entryId=entryRow.rows[0].id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${receptionist}'; set role authenticated`);
    const beforeRollback=await db.query(`
      select
        (select count(*) from public.cce_show_office_judging_context())::int as context_rows,
        jsonb_array_length((public.cce_show_office_judge_panel($1))->'rows') as panel_rows
    `,[classId]);
    assert.deepEqual({...beforeRollback.rows[0]},{context_rows:1,panel_rows:1});
    await assert.rejects(
      db.query(`select public.cce_save_show_office_score(
        $1::bigint,'first_round',71000,1::numeric,0::smallint,false,false,false,1
      )`,[entryId]),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4130_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        (select count(*)::int from public.app_permissions where code='show_office.results.view') as permission_kept,
        (select bool_and(allowed is false) from public.role_permissions
          where permission_code='show_office.results.view') as grants_withdrawn,
        (select count(*)::int from public.show_office_entry_rounds) as score_rows
    `);
    assert.deepEqual({...rolledBack.rows[0]},{permission_kept:1,grants_withdrawn:true,score_rows:1});

    await db.exec(`set "request.jwt.claim.sub"='${receptionist}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_show_office_judging_context()`),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(read('supabase/migrations/20260725_show_office_sprint5_live_results_v4130.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${receptionist}'; set role authenticated`);
    const reapplied=await db.query(`
      select (select count(*) from public.cce_show_office_judging_context())::int as context_rows
    `);
    assert.equal(reapplied.rows[0].context_rows,1);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.14 fence scoring computes totals, auto-eliminates and rollback restores v4.13 scope',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000060';
  const judge='00000000-0000-4000-8000-000000000061';
  const trainer='00000000-0000-4000-8000-000000000062';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','fence-manager@example.com'),
        ('${judge}','fence-judge@example.com'),
        ('${trainer}','fence-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager')
         or (p.id='${judge}' and r.code='judge')
         or (p.id='${trainer}' and r.code='trainer');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Fence Cup','2027-08-01','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type,
        fence_count,knockdown_fault_value,refusal_fault_value,refusals_before_elimination
      ) select id,'1',1,'Fence Class','Table A',3,4,4,2
        from public.show_office_competitions where competition_name='Fence Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Fence Class'),
        p_start_number=>1,p_rider_name=>'Fence Rider',p_horse_name=>'Fence Horse'
      );
    `);
    const entryRow=await db.query(`select id from public.show_office_entries where start_number=1`);
    const entryId=entryRow.rows[0].id;
    const classRow=await db.query(`select id from public.show_office_classes where class_name='Fence Class'`);
    const classId=classRow.rows[0].id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${trainer}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_show_office_toggle_fence($1,'first_round',1::smallint,'knockdown',0)`,[entryId]),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const knockdown=await db.query(
      `select public.cce_show_office_toggle_fence($1,'first_round',1::smallint,'knockdown',0) as result`,[entryId]
    );
    assert.equal(knockdown.rows[0].result.incident,'knockdown');
    assert.equal(knockdown.rows[0].result.totals.faults,4);
    const refusal=await db.query(
      `select public.cce_show_office_toggle_fence($1,'first_round',2::smallint,'refusal',0) as result`,[entryId]
    );
    assert.equal(refusal.rows[0].result.totals.faults,8);
    assert.equal(refusal.rows[0].result.totals.refusals,1);

    const confirmed=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',65000,false,false,false,0) as result`,
      [entryId]
    );
    assert.equal(confirmed.rows[0].result.faults,8);
    assert.equal(confirmed.rows[0].result.refusals,1);
    assert.equal(confirmed.rows[0].result.eliminated,false);
    assert.equal(confirmed.rows[0].result.time_ms,65000);
    const roundVersion=confirmed.rows[0].result.row_version;

    const secondRefusal=await db.query(
      `select public.cce_show_office_toggle_fence($1,'first_round',3::smallint,'refusal',0) as result`,[entryId]
    );
    assert.equal(secondRefusal.rows[0].result.totals.refusals,2);

    const eliminated=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',70000,false,false,false,$2) as result`,
      [entryId,roundVersion]
    );
    assert.equal(eliminated.rows[0].result.eliminated,true);
    assert.equal(eliminated.rows[0].result.time_ms,null);
    assert.equal(eliminated.rows[0].result.faults,null);
    const finalVersion=eliminated.rows[0].result.row_version;

    const panel=await db.query(
      `select public.cce_show_office_judge_panel($1) as result`,[classId]
    );
    const panelClass=panel.rows[0].result.class;
    assert.equal(panelClass.fence_count,3);
    assert.equal(panelClass.refusals_before_elimination,2);
    const panelRow=panel.rows[0].result.rows[0];
    assert.equal(panelRow.first_round_fences.length,3);
    assert.deepEqual(
      panelRow.first_round_fences.map(fence=>fence.incident),
      ['knockdown','refusal','refusal']
    );

    await db.query(`select public.cce_reset_show_office_score($1,'first_round',$2)`,[entryId,finalVersion]);
    const fencesAfterReset=await db.query(
      `select count(*)::int as rows from public.show_office_entry_fences where entry_id=$1`,[entryId]
    );
    assert.equal(fencesAfterReset.rows[0].rows,0);
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4140_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is null
          as toggle_removed,
        to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is null
          as confirm_removed,
        to_regclass('public.show_office_entry_fences') is not null as fences_table_kept,
        (select count(*)::int from information_schema.columns
          where table_schema='public' and table_name='show_office_classes' and column_name='fence_count') as fence_column_kept
    `);
    assert.deepEqual({...rolledBack.rows[0]},{
      toggle_removed:true,confirm_removed:true,fences_table_kept:true,fence_column_kept:1
    });

    await db.exec(read('supabase/migrations/20260726_show_office_fence_scoring_v4140.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const reapplied=await db.query(
      `select public.cce_show_office_toggle_fence($1,'first_round',1::smallint,'knockdown',0) as result`,[entryId]
    );
    assert.equal(reapplied.rows[0].result.incident,'knockdown');
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.15 Accumulator with Joker computes points, doubles the total, ranks descending and rollback restores v4.14 scope',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000063';
  const judge='00000000-0000-4000-8000-000000000064';
  const trainer='00000000-0000-4000-8000-000000000065';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','accumulator-manager@example.com'),
        ('${judge}','accumulator-judge@example.com'),
        ('${trainer}','accumulator-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager')
         or (p.id='${judge}' and r.code='judge')
         or (p.id='${trainer}' and r.code='trainer');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Accumulator Cup','2027-08-02','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type,
        fence_count,scoring_format,joker_fence_number,refusals_before_elimination
      ) select id,'1',1,'Accumulator Class','Accumulator with Joker',5,'accumulator_joker',5,2
        from public.show_office_competitions where competition_name='Accumulator Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Accumulator Class'),
        p_start_number=>1,p_rider_name=>'Leader Rider',p_horse_name=>'Leader Horse'
      );
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Accumulator Class'),
        p_start_number=>2,p_rider_name=>'Trailer Rider',p_horse_name=>'Trailer Horse'
      );
    `);
    const classRow=await db.query(`select id from public.show_office_classes where class_name='Accumulator Class'`);
    const classId=classRow.rows[0].id;
    const leaderRow=await db.query(`select id from public.show_office_entries where start_number=1`);
    const leaderId=leaderRow.rows[0].id;
    const trailerRow=await db.query(`select id from public.show_office_entries where start_number=2`);
    const trailerId=trailerRow.rows[0].id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${trainer}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_show_office_toggle_fence($1,'first_round',1::smallint,'knockdown',0)`,[leaderId]),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    // Leader: fence 1 knockdown, fence 3 refusal, fence 2/4 left clear untouched,
    // fence 5 (Joker) explicitly chosen and clear (v4.16.0: the Joker fence is an
    // alternative the judge must select, not an automatic double on the plain fence).
    // Points = 0(knockdown) + 2 + 0(refusal) + 4 + Joker fence 5 doubled (5*2=10) = 16.
    // Only the fence marked joker_chosen doubles, not the round total.
    await db.query(`select public.cce_show_office_toggle_fence($1,'first_round',1::smallint,'knockdown',0)`,[leaderId]);
    await db.query(`select public.cce_show_office_toggle_fence($1,'first_round',3::smallint,'refusal',0)`,[leaderId]);
    await db.query(`select public.cce_show_office_choose_joker_fence($1,'first_round',5::smallint,true,0)`,[leaderId]);
    const leaderConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,0) as result`,
      [leaderId]
    );
    assert.equal(leaderConfirm.rows[0].result.points,16);
    assert.equal(leaderConfirm.rows[0].result.faults,null);
    assert.equal(leaderConfirm.rows[0].result.refusals,1);
    assert.equal(leaderConfirm.rows[0].result.eliminated,false);
    const leaderVersion=leaderConfirm.rows[0].result.row_version;

    // Trailer: every fence knocked down, including the Joker -> 0 points, no doubling.
    for(const fenceNumber of [1,2,3,4,5]){
      await db.query(
        `select public.cce_show_office_toggle_fence($1,'first_round',$2::smallint,'knockdown',0)`,
        [trailerId,fenceNumber]
      );
    }
    const trailerConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',55000,false,false,false,0) as result`,
      [trailerId]
    );
    assert.equal(trailerConfirm.rows[0].result.points,0);

    const panel=await db.query(`select public.cce_show_office_judge_panel($1) as result`,[classId]);
    const panelClass=panel.rows[0].result.class;
    assert.equal(panelClass.scoring_format,'accumulator_joker');
    assert.equal(panelClass.joker_fence_number,5);
    const rows=panel.rows[0].result.rows;
    const leaderRowResult=rows.find(row=>row.start_number===1);
    const trailerRowResult=rows.find(row=>row.start_number===2);
    assert.equal(leaderRowResult.first_round.points,16);
    assert.equal(leaderRowResult.placing,1);
    assert.equal(trailerRowResult.first_round.points,0);
    assert.equal(trailerRowResult.placing,2);

    // A second refusal on the leader reaches the class's threshold of 2 and auto-eliminates,
    // exactly like Table A, even though this class ranks by points.
    await db.query(`select public.cce_show_office_toggle_fence($1,'first_round',2::smallint,'refusal',0)`,[leaderId]);
    const leaderEliminated=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [leaderId,leaderVersion]
    );
    assert.equal(leaderEliminated.rows[0].result.eliminated,true);
    assert.equal(leaderEliminated.rows[0].result.points,null);
    assert.equal(leaderEliminated.rows[0].result.time_ms,null);
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4150_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        (select count(*)::int from information_schema.columns
          where table_schema='public' and table_name='show_office_classes'
            and column_name in ('scoring_format','joker_fence_number')) as class_columns_kept,
        (select count(*)::int from information_schema.columns
          where table_schema='public' and table_name='show_office_entry_rounds' and column_name='points') as points_column_kept,
        (select scoring_format from public.show_office_classes where id=$1) as scoring_format_kept
    `,[classId]);
    assert.deepEqual({...rolledBack.rows[0]},{
      class_columns_kept:2,points_column_kept:1,scoring_format_kept:'accumulator_joker'
    });

    await db.exec(read('supabase/migrations/20260728_show_office_accumulator_joker_v4150.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const reapplied=await db.query(`select public.cce_show_office_judge_panel($1) as result`,[classId]);
    assert.equal(reapplied.rows[0].result.class.scoring_format,'accumulator_joker');
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.15.1 doubles only the Joker fence itself, not the round total, and rollback restores the old formula',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000066';
  const judge='00000000-0000-4000-8000-000000000067';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','joker-fix-manager@example.com'),
        ('${judge}','joker-fix-judge@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager') or (p.id='${judge}' and r.code='judge');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Joker Fix Cup','2027-08-03','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type,
        fence_count,scoring_format,joker_fence_number,refusals_before_elimination
      ) select id,'1',1,'Joker Fix Class','Accumulator with Joker',8,'accumulator_joker',8,9
        from public.show_office_competitions where competition_name='Joker Fix Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Joker Fix Class'),
        p_start_number=>1,p_rider_name=>'Clean Rider',p_horse_name=>'Clean Horse'
      );
    `);
    const entryRow=await db.query(`select id from public.show_office_entries where start_number=1`);
    const entryId=entryRow.rows[0].id;
    await db.exec('reset role');

    // Fences 1-7 clear (untouched), fence 8 (Joker) explicitly chosen and clear
    // (v4.16.0: the Joker fence is a selected alternative, not automatic):
    // 1+2+...+7 + (8*2) = 28+16 = 44.
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    await db.query(`select public.cce_show_office_choose_joker_fence($1,'first_round',8::smallint,true,0)`,[entryId]);
    const confirmed=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',50000,false,false,false,0) as result`,
      [entryId]
    );
    assert.equal(confirmed.rows[0].result.points,44);
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4151_compatibility.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const buggy=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',50000,false,false,false,$2) as result`,
      [entryId,confirmed.rows[0].result.row_version]
    );
    // The reverted v4.15.0 body doubles the whole total: (1+...+8)*2 = 72.
    assert.equal(buggy.rows[0].result.points,72);
    await db.exec('reset role');

    await db.exec(read('supabase/migrations/20260729_show_office_accumulator_joker_fix_v4151.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const fixed=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',50000,false,false,false,$2) as result`,
      [entryId,buggy.rows[0].result.row_version]
    );
    assert.equal(fixed.rows[0].result.points,44);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.16.0 the Joker fence is a chosen alternative, rejects mismatched fences and rollback restores the old formula',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000068';
  const judge='00000000-0000-4000-8000-000000000069';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','joker-alt-manager@example.com'),
        ('${judge}','joker-alt-judge@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager') or (p.id='${judge}' and r.code='judge');
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Joker Alt Cup','2027-08-04','Running');
      insert into public.show_office_classes(
        competition_id,class_number,sort_order,class_name,competition_type,
        fence_count,scoring_format,joker_fence_number,refusals_before_elimination
      ) select id,'1',1,'Joker Alt Class','Accumulator with Joker',8,'accumulator_joker',8,9
        from public.show_office_competitions where competition_name='Joker Alt Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Joker Alt Class'),
        p_start_number=>1,p_rider_name=>'Choice Rider',p_horse_name=>'Choice Horse'
      );
    `);
    const entryRow=await db.query(`select id from public.show_office_entries where start_number=1`);
    const entryId=entryRow.rows[0].id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);

    // Fence 8 untouched defaults to the normal (non-Joker) alternative: 1+..+7+8=36.
    const normalConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,0) as result`,
      [entryId]
    );
    assert.equal(normalConfirm.rows[0].result.points,36);

    // Choosing the Joker alternative is rejected on any fence other than the class's configured Joker fence.
    await assert.rejects(
      db.query(`select public.cce_show_office_choose_joker_fence($1,'first_round',3::smallint,true,0)`,[entryId]),
      /Joker choice only applies/i
    );

    // Explicitly choosing the Joker alternative at fence 8 doubles that fence: 1+..+7+16=44.
    const jokerChosen=await db.query(
      `select public.cce_show_office_choose_joker_fence($1,'first_round',8::smallint,true,0) as result`,
      [entryId]
    );
    assert.equal(jokerChosen.rows[0].result.joker_chosen,true);
    assert.equal(jokerChosen.rows[0].result.incident,'clear');
    const jokerConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [entryId,normalConfirm.rows[0].result.row_version]
    );
    assert.equal(jokerConfirm.rows[0].result.points,44);

    // Cycling Knockdown/Refusal on the already-chosen Joker fence via the plain toggle RPC
    // leaves joker_chosen untouched: knocking it down scores 0 for that fence only, 28 total.
    const jokerKnockdown=await db.query(
      `select public.cce_show_office_toggle_fence($1,'first_round',8::smallint,'knockdown',$2) as result`,
      [entryId,jokerChosen.rows[0].result.row_version]
    );
    assert.equal(jokerKnockdown.rows[0].result.joker_chosen,true);
    const jokerKnockdownConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [entryId,jokerConfirm.rows[0].result.row_version]
    );
    assert.equal(jokerKnockdownConfirm.rows[0].result.points,28);

    // Switching back to the normal alternative resets that fence to clear: 36 again.
    const normalAgain=await db.query(
      `select public.cce_show_office_choose_joker_fence($1,'first_round',8::smallint,false,$2) as result`,
      [entryId,jokerKnockdown.rows[0].result.row_version]
    );
    assert.equal(normalAgain.rows[0].result.joker_chosen,false);
    assert.equal(normalAgain.rows[0].result.incident,'clear');
    const normalAgainConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [entryId,jokerKnockdownConfirm.rows[0].result.row_version]
    );
    assert.equal(normalAgainConfirm.rows[0].result.points,36);
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4160_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        to_regprocedure('public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)') is null
          as choose_joker_fence_removed,
        to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null
          as toggle_fence_kept,
        (select count(*)::int from information_schema.columns
          where table_schema='public' and table_name='show_office_entry_fences' and column_name='joker_chosen') as joker_column_kept
    `);
    assert.deepEqual({...rolledBack.rows[0]},{
      choose_joker_fence_removed:true,toggle_fence_kept:true,joker_column_kept:1
    });
    // The reverted formula doubles by fence position again, ignoring the stored joker_chosen
    // flag entirely: fence 8 is clear (normal alternative) so 1+..+7+8*2=44 either way.
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const afterRollback=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [entryId,normalAgainConfirm.rows[0].result.row_version]
    );
    assert.equal(afterRollback.rows[0].result.points,44);
    await db.exec('reset role');

    await db.exec(read('supabase/migrations/20260730_show_office_joker_alternate_fence_v4160.sql'));
    const reapplied=await db.query(`
      select to_regprocedure('public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)') is not null
        as choose_joker_fence_restored
    `);
    assert.equal(reapplied.rows[0].choose_joker_fence_restored,true);
    // The fixed formula reads joker_chosen again: fence 8 is still the normal alternative, so 36.
    await db.exec(`set "request.jwt.claim.sub"='${judge}'; set role authenticated`);
    const finalConfirm=await db.query(
      `select public.cce_save_show_office_fence_score($1,'first_round',60000,false,false,false,$2) as result`,
      [entryId,afterRollback.rows[0].result.row_version]
    );
    assert.equal(finalConfirm.rows[0].result.points,36);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.17.0 booking payment deadline expires stale requests, frees capacity and rollback restores the old submit function',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000070';
  const trainer='00000000-0000-4000-8000-000000000071';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','payment-deadline-manager@example.com'),
        ('${trainer}','payment-deadline-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager') or (p.id='${trainer}' and r.code='trainer');
      insert into public.horses(horse_name,owner,status) values('Deadline Horse','CC','Available');
    `);

    await db.exec('set role anon');
    const submitted=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Deadline Rider',
        p_phone=>'39009001',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'08:00'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DL1',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    const bookingId=submitted.rows[0].result.booking_request_id;
    assert.equal(submitted.rows[0].result.status,'Requested');
    assert.ok(submitted.rows[0].result.payment_due_at);

    // The unpaid Requested booking holds the only horse's capacity for that slot.
    await assert.rejects(
      db.query(`
        select public.cce_public_submit_booking(
          p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Second Rider',
          p_phone=>'39009002',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
          p_start_time=>'08:00'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DL2',
          p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
        )
      `),
      /No horse capacity is available/
    );
    await db.exec('reset role');

    const due=await db.query(`select payment_due_at from public.booking_requests where id=${bookingId}`);
    assert.ok(new Date(due.rows[0].payment_due_at).getTime()-Date.now()>23*3600*1000);

    await db.exec(`set "request.jwt.claim.sub"='${trainer}'; set role authenticated`);
    await assert.rejects(db.query(`select public.cce_expire_stale_booking_requests()`),/Permission denied/);
    await assert.rejects(db.query(`select * from public.cce_list_booking_requests()`),/Permission denied/);
    await db.exec('reset role');

    // Not yet due: listing (which runs the expiry sweep first) leaves it Requested.
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const beforeDue=await db.query(`select status from public.cce_list_booking_requests() where id=${bookingId}`);
    assert.equal(beforeDue.rows[0].status,'Requested');
    await db.exec('reset role');

    // Backdate the deadline (test setup only — bypasses RLS as the db owner, mirroring
    // the fixture-setup pattern used throughout this file).
    await db.exec(`update public.booking_requests set payment_due_at=now()-interval '1 hour' where id=${bookingId}`);

    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const afterDue=await db.query(`select status from public.cce_list_booking_requests() where id=${bookingId}`);
    assert.equal(afterDue.rows[0].status,'Cancelled');
    const auditRow=await db.query(`
      select after_data from public.audit_logs
      where table_name='booking_requests' and record_id='${bookingId}' and action='update_status'
      order by id desc limit 1
    `);
    assert.equal(auditRow.rows[0].after_data.status,'Cancelled');
    await db.exec('reset role');

    // Capacity is freed: the same slot can be booked again.
    await db.exec('set role anon');
    const secondSubmit=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Second Rider',
        p_phone=>'39009003',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'08:00'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DL3',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    assert.equal(secondSubmit.rows[0].result.status,'Requested');
    const secondBookingId=secondSubmit.rows[0].result.booking_request_id;
    await db.exec('reset role');

    // Confirmed bookings are never auto-cancelled even past their deadline.
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const confirmedStatus=await db.query(`select public.cce_update_booking_status(${secondBookingId},'Confirmed') as result`);
    assert.equal(confirmedStatus.rows[0].result.status,'Confirmed');
    await db.exec('reset role');
    await db.exec(`update public.booking_requests set payment_due_at=now()-interval '1 hour' where id=${secondBookingId}`);
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const stillConfirmed=await db.query(`select status from public.cce_list_booking_requests() where id=${secondBookingId}`);
    assert.equal(stillConfirmed.rows[0].status,'Confirmed');
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4170_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        to_regprocedure('public.cce_expire_stale_booking_requests()') is null as expire_removed,
        to_regprocedure('public.cce_list_booking_requests()') is null as list_removed,
        (select count(*)::int from information_schema.columns
          where table_schema='public' and table_name='booking_requests' and column_name='payment_due_at') as column_kept,
        (select status from public.booking_requests where id=${bookingId}) as booking_status_kept
    `);
    assert.deepEqual({...rolledBack.rows[0]},{
      expire_removed:true,list_removed:true,column_kept:1,booking_status_kept:'Cancelled'
    });

    await db.exec('set role anon');
    const afterRollbackSubmit=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Post Rollback Rider',
        p_phone=>'39009004',p_requested_date=>(timezone('Asia/Bahrain',now())::date+2),
        p_start_time=>'09:30'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DL4',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    assert.equal(afterRollbackSubmit.rows[0].result.status,'Requested');
    assert.ok(!('payment_due_at' in afterRollbackSubmit.rows[0].result));
    await db.exec('reset role');
    const postRollbackDue=await db.query(
      `select payment_due_at from public.booking_requests where id=${afterRollbackSubmit.rows[0].result.booking_request_id}`
    );
    assert.equal(postRollbackDue.rows[0].payment_due_at,null);

    await db.exec(read('supabase/migrations/20260731_booking_payment_deadline_v4170.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const reapplied=await db.query(`select to_regprocedure('public.cce_list_booking_requests()') is not null as list_restored`);
    assert.equal(reapplied.rows[0].list_restored,true);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.18.0 manager can delete a booking request with its income row, enforces permission and rollback removes the RPC',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000072';
  const trainer='00000000-0000-4000-8000-000000000073';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','delete-booking-manager@example.com'),
        ('${trainer}','delete-booking-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager') or (p.id='${trainer}' and r.code='trainer');
      insert into public.horses(horse_name,owner,status) values('Delete Test Horse','CC','Available');
    `);

    await db.exec('set role anon');
    const submitted=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Delete Me Rider',
        p_phone=>'39009005',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'10:15'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DEL1',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    const bookingId=submitted.rows[0].result.booking_request_id;
    const incomeId=submitted.rows[0].result.income_id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${trainer}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_delete_booking_request(${bookingId})`),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_delete_booking_request(999999999)`),
      /not found/i
    );
    const deleted=await db.query(`select public.cce_delete_booking_request(${bookingId}) as result`);
    assert.deepEqual({...deleted.rows[0].result},{
      booking_request_id:bookingId,income_rows_deleted:1,deleted:true
    });
    await db.exec('reset role');

    const remaining=await db.query(`
      select
        (select count(*)::int from public.booking_requests where id=${bookingId}) as booking_rows,
        (select count(*)::int from public.income where id=${incomeId}) as income_rows,
        (select count(*)::int from public.booking_private_details where booking_request_id=${bookingId}) as private_rows
    `);
    assert.deepEqual({...remaining.rows[0]},{booking_rows:0,income_rows:0,private_rows:0});

    const audit=await db.query(`
      select before_data from public.audit_logs
      where table_name='booking_requests' and record_id='${bookingId}' and action='delete'
      order by id desc limit 1
    `);
    assert.equal(audit.rows[0].before_data.customer_name,'Delete Me Rider');

    await db.exec(read('supabase/rollback/rollback_v4180_compatibility.sql'));
    const rolledBack=await db.query(`
      select to_regprocedure('public.cce_delete_booking_request(bigint)') is null as delete_removed
    `);
    assert.equal(rolledBack.rows[0].delete_removed,true);

    await db.exec(read('supabase/migrations/20260801_booking_delete_request_v4180.sql'));
    await db.exec('set role anon');
    const secondSubmit=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Delete Me Again',
        p_phone=>'39009006',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'11:00'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-DEL2',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    await db.exec('reset role');
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const reapplied=await db.query(
      `select public.cce_delete_booking_request(${secondSubmit.rows[0].result.booking_request_id}) as result`
    );
    assert.equal(reapplied.rows[0].result.deleted,true);
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('cce_delete_booking_request still removes an orphaned booking request whose income row was already deleted directly',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000077';
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','orphan-delete-manager@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      insert into public.horses(horse_name,owner,status) values('Orphan Test Horse','CC','Available');
    `);

    await db.exec('set role anon');
    const submitted=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'Orphan Rider',
        p_phone=>'39009008',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'09:30'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-ORPH1',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    const bookingId=submitted.rows[0].result.booking_request_id;
    const incomeId=submitted.rows[0].result.income_id;
    await db.exec('reset role');

    // Simulate the income row being removed some other way (e.g. a direct
    // delete of a duplicate/legacy row), leaving booking_requests orphaned —
    // still "Requested", still counted as a pending-booking alert, but
    // previously invisible (and therefore undeletable) in the Bookings
    // dashboard because it built its list purely from income rows.
    await db.exec(`delete from public.income where id=${incomeId};`);

    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const deleted=await db.query(`select public.cce_delete_booking_request(${bookingId}) as result`);
    assert.deepEqual({...deleted.rows[0].result},{
      booking_request_id:bookingId,income_rows_deleted:0,deleted:true
    });
    await db.exec('reset role');

    const remaining=await db.query(`
      select count(*)::int as booking_rows from public.booking_requests where id=${bookingId}
    `);
    assert.equal(remaining.rows[0].booking_rows,0);
  }finally{
    await db.close();
  }
});

test('v4.19.0 monthly livery income creation covers Full Livery and AC Livery, is idempotent, unreachable by client roles, and rollback removes the function',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000074';
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','livery-cron-manager@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      insert into public.horses(horse_name,owner,status,livery_bd,ac_livery_bd) values
        ('Full Livery Horse','Owner One','Available',80,0),
        ('AC Livery Horse','Owner Two','Available',0,150),
        ('Both Set Horse','Owner Three','Available',80,150),
        ('Not Available Horse','Owner Four','Occupied',80,0);
    `);

    const created=await db.query(`select public.cce_create_monthly_livery_income() as rows_created`);
    assert.equal(created.rows[0].rows_created,3);

    const rows=await db.query(`
      select horse_name,customer_name,amount_bd::text,status
      from public.income
      where activity='Livery' and notes ilike '%Automatic monthly livery payment%'
      order by horse_name
    `);
    assert.deepEqual(rows.rows.map(r=>({...r})),[
      {horse_name:'AC Livery Horse',customer_name:'Owner Two',amount_bd:'150.000',status:'Pending'},
      {horse_name:'Both Set Horse',customer_name:'Owner Three',amount_bd:'150.000',status:'Pending'},
      {horse_name:'Full Livery Horse',customer_name:'Owner One',amount_bd:'80.000',status:'Pending'}
    ]);

    // Idempotent: running again the same month creates nothing further.
    const secondRun=await db.query(`select public.cce_create_monthly_livery_income() as rows_created`);
    assert.equal(secondRun.rows[0].rows_created,0);
    const countAfter=await db.query(`select count(*)::int as rows from public.income where activity='Livery'`);
    assert.equal(countAfter.rows[0].rows,3);

    // Not callable by any client role — no permission granted, cron only.
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_create_monthly_livery_income()`),
      /permission denied/i
    );
    await db.exec('reset role');
    await db.exec('set role anon');
    await assert.rejects(
      db.query(`select public.cce_create_monthly_livery_income()`),
      /permission denied/i
    );
    await db.exec('reset role');

    await db.exec(read('supabase/rollback/rollback_v4190_compatibility.sql'));
    const rolledBack=await db.query(`
      select to_regprocedure('public.cce_create_monthly_livery_income()') is null as function_removed
    `);
    assert.equal(rolledBack.rows[0].function_removed,true);

    await db.exec(read('supabase/migrations/20260802_livery_income_cron_v4190.sql'));
    const reapplied=await db.query(`
      select to_regprocedure('public.cce_create_monthly_livery_income()') is not null as function_restored
    `);
    assert.equal(reapplied.rows[0].function_restored,true);
  }finally{
    await db.close();
  }
});

test('v4.21.0 manager can sync a booking request customer name, enforces permission and rollback removes the RPC',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000075';
  const trainer='00000000-0000-4000-8000-000000000076';
  try{
    await db.exec(`
      insert into auth.users(id,email) values
        ('${manager}','sync-name-manager@example.com'),
        ('${trainer}','sync-name-trainer@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where (p.id='${manager}' and r.code='manager') or (p.id='${trainer}' and r.code='trainer');
      insert into public.horses(horse_name,owner,status) values('Sync Name Horse','CC','Available');
    `);

    await db.exec('set role anon');
    const submitted=await db.query(`
      select public.cce_public_submit_booking(
        p_request_type=>'ride',p_service_code=>'ride_half_hour',p_customer_name=>'اسم قديم',
        p_phone=>'39009007',p_requested_date=>(timezone('Asia/Bahrain',now())::date+1),
        p_start_time=>'09:30'::time,p_rider_level=>'beginner',p_personal_id=>'CPR-SYNC1',
        p_terms_accepted=>true,p_terms_version=>'2026-07-v1'
      ) as result
    `);
    const bookingId=submitted.rows[0].result.booking_request_id;
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${trainer}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_update_booking_customer(${bookingId},'New Name')`),
      /Permission denied/
    );
    await db.exec('reset role');

    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    await assert.rejects(
      db.query(`select public.cce_update_booking_customer(999999999,'New Name')`),
      /not found/i
    );
    await assert.rejects(
      db.query(`select public.cce_update_booking_customer(${bookingId},'   ')`),
      /required/i
    );
    const updated=await db.query(
      `select public.cce_update_booking_customer(${bookingId},'New Name') as result`
    );
    assert.equal(updated.rows[0].result.customer_name,'New Name');
    await db.exec('reset role');

    const row=await db.query(`select customer_name from public.booking_requests where id=${bookingId}`);
    assert.equal(row.rows[0].customer_name,'New Name');

    const audit=await db.query(`
      select before_data,after_data from public.audit_logs
      where table_name='booking_requests' and record_id='${bookingId}' and action='update_customer_name'
      order by id desc limit 1
    `);
    assert.equal(audit.rows[0].before_data.customer_name,'اسم قديم');
    assert.equal(audit.rows[0].after_data.customer_name,'New Name');

    await db.exec(read('supabase/rollback/rollback_v4210_compatibility.sql'));
    const rolledBack=await db.query(`
      select to_regprocedure('public.cce_update_booking_customer(bigint,text)') is null as sync_removed
    `);
    assert.equal(rolledBack.rows[0].sync_removed,true);

    await db.exec(read('supabase/migrations/20260803_booking_customer_sync_v4210.sql'));
    await db.exec(`set "request.jwt.claim.sub"='${manager}'; set role authenticated`);
    const reapplied=await db.query(
      `select public.cce_update_booking_customer(${bookingId},'Restored Name') as result`
    );
    assert.equal(reapplied.rows[0].result.customer_name,'Restored Name');
    await db.exec('reset role');
  }finally{
    await db.close();
  }
});

test('v4.11 compatibility rollback preserves entries and Sprint 3 can be re-applied',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000045';
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','entry-rollback@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      set "request.jwt.claim.sub"='${manager}'; set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Entry Rollback Cup','2027-03-01','Draft');
      insert into public.show_office_classes(competition_id,class_number,sort_order,class_name,competition_type)
      select id,'1',1,'Preserved entry class','Table A' from public.show_office_competitions
      where competition_name='Entry Rollback Cup';
      select public.cce_save_show_office_entry(
        p_class_id=>(select id from public.show_office_classes where class_name='Preserved entry class'),
        p_start_number=>1,p_rider_name=>'Preserved Rider',p_horse_name=>'Preserved Horse'
      );
      reset role;
    `);
    await db.exec(read('supabase/rollback/rollback_v4110_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        (select count(*)::int from public.show_office_entries) as entry_rows,
        to_regprocedure('public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text)') is null as save_removed,
        to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as core_restore_ready,
        (select count(*)::int from pg_policies where schemaname='public' and tablename='show_office_entries') as policies,
        (select bool_and(allowed is false) from public.role_permissions where permission_code like 'show_office.entries.%') as defaults_disabled
    `);
    assert.deepEqual({...rolledBack.rows[0]}, {
      entry_rows:1,save_removed:true,core_restore_ready:true,policies:0,defaults_disabled:true
    });
    await db.exec(read('supabase/migrations/20260723_show_office_sprint3_entries_v4110.sql'));
    const reapplied=await db.query(`
      select
        (select count(*)::int from public.show_office_entries) as entry_rows,
        to_regprocedure('public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text)') is not null as save_ready,
        (select count(*)::int from pg_policies where schemaname='public' and tablename='show_office_entries') as policies,
        (select count(*)::int from public.role_permissions rp join public.app_roles r on r.id=rp.role_id
          where r.code in ('manager','super_admin') and rp.permission_code like 'show_office.entries.%' and rp.allowed) as defaults_enabled
    `);
    assert.deepEqual({...reapplied.rows[0]}, {entry_rows:1,save_ready:true,policies:4,defaults_enabled:8});
  }finally{
    await db.close();
  }
});

test('v4.10 compatibility rollback preserves classes and Sprint 2 can be re-applied',async()=>{
  const db=await buildDatabase();
  const manager='00000000-0000-4000-8000-000000000040';
  try{
    await db.exec(`
      insert into auth.users(id,email) values('${manager}','class-rollback@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r where p.id='${manager}' and r.code='manager';
      set "request.jwt.claim.sub"='${manager}';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Class Rollback Cup','2027-01-10','Draft');
      insert into public.show_office_classes(competition_id,class_number,sort_order,class_name,competition_type)
      select id,'1',1,'Preserved class','Table A'
      from public.show_office_competitions where competition_name='Class Rollback Cup';
      reset role;
    `);
    await db.exec(read('supabase/rollback/rollback_v4100_compatibility.sql'));
    const rolledBack=await db.query(`
      select
        (select count(*)::int from public.show_office_classes) as class_rows,
        to_regprocedure('public.cce_restore_show_office_module(jsonb)') is null as restore_removed,
        to_regprocedure('public.cce_show_office_class_competitions()') is null as directory_removed,
        (select count(*)::int from pg_policies where schemaname='public' and tablename='show_office_classes') as policies,
        (select bool_and(allowed is false) from public.role_permissions where permission_code like 'show_office.classes.%') as defaults_disabled
    `);
    assert.deepEqual({...rolledBack.rows[0]}, {
      class_rows:1,restore_removed:true,directory_removed:true,policies:0,defaults_disabled:true
    });

    await db.exec(read('supabase/migrations/20260722_show_office_sprint2_classes_v4100.sql'));
    const reapplied=await db.query(`
      select
        (select count(*)::int from public.show_office_classes) as class_rows,
        to_regprocedure('public.cce_restore_show_office_module(jsonb)') is not null as restore_ready,
        to_regprocedure('public.cce_show_office_class_competitions()') is not null as directory_ready,
        (select count(*)::int from pg_policies where schemaname='public' and tablename='show_office_classes') as policies,
        (select count(*)::int from public.role_permissions rp join public.app_roles r on r.id=rp.role_id
          where r.code in ('manager','super_admin') and rp.permission_code like 'show_office.classes.%' and rp.allowed) as defaults_enabled
    `);
    assert.deepEqual({...reapplied.rows[0]}, {
      class_rows:1,restore_ready:true,directory_ready:true,policies:4,defaults_enabled:8
    });
  }finally{
    await db.close();
  }
});

test('v4.9 compatibility rollbacks preserve competitions and are re-applicable',async()=>{
  const db=await buildDatabase();
  try{
    await db.exec(`
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Rollback Safety Cup','2026-09-01','Draft')
    `);
    await db.exec(read('supabase/rollback/rollback_v491_compatibility.sql'));
    const restoreRemoved=await db.query(`select to_regprocedure('public.cce_restore_show_office_competitions(jsonb)') is null as removed`);
    assert.equal(restoreRemoved.rows[0].removed,true);
    await db.exec(read('supabase/migrations/20260721_show_office_sprint1_v491_backup_restore.sql'));
    await db.exec(read('supabase/rollback/rollback_v490_compatibility.sql'));
    const preserved=await db.query(`
      select competition_name,status from public.show_office_competitions
      where competition_name='Rollback Safety Cup'
    `);
    assert.deepEqual({...preserved.rows[0]},{competition_name:'Rollback Safety Cup',status:'Draft'});

    await db.exec(read('supabase/migrations/20260721_show_office_sprint1_v490.sql'));
    await db.exec(`
      insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000010','showoffice@example.com');
      update public.profiles p set is_active=true,role_id=r.id
      from public.app_roles r
      where p.id='00000000-0000-4000-8000-000000000010' and r.code='manager';
      set "request.jwt.claim.sub"='00000000-0000-4000-8000-000000000010';
      set role authenticated;
      insert into public.show_office_competitions(competition_name,competition_date,status)
      values('Reapplied Cup','2026-09-02','Open');
      reset role;
    `);
    const restored=await db.query(`select count(*)::int as rows from public.show_office_competitions`);
    assert.equal(restored.rows[0].rows,2);
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
