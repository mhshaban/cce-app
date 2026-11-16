import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as core from '../supabase/functions/gait-analysis/gait-core.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const JPEG='/9j/4AAQSkZJRgABAQ==';

function gaitModule(extra={}){
  const context={window:{},console,currentLang:'en',...extra};
  context.window=context;
  vm.runInNewContext(read('src/modules/health/gait-analysis.js'),context,{filename:'gait-analysis.js'});
  return context.CCE.gait;
}

test('gait core: frames are validated and labelled with their time',()=>{
  assert.throws(()=>core.clampFrames([{t:0,data:JPEG}]),/At least 4/);
  assert.throws(()=>core.clampFrames(Array.from({length:41},(_,i)=>({t:i,data:JPEG}))),/At most 40/);
  assert.throws(()=>core.clampFrames([{t:0,data:JPEG},{t:1,data:'<script>'},{t:2,data:JPEG},{t:3,data:JPEG}]),/Frame 2/);
  const frames=core.clampFrames([0,0.333,0.666,1].map(t=>({t,data:'data:image/jpeg;base64,'+JPEG})));
  assert.deepEqual(frames.map(f=>f.t),[0,0.33,0.67,1]);
  assert.equal(frames[0].data,JPEG);
  const content=core.buildUserContent(frames,{horseName:'Blaze',gait:'trot',view:'side',limbs:['RF'],notes:'Short on RF'});
  assert.equal(content.filter(c=>c.type==='image').length,4);
  assert.equal(content[0].text,'Frame 1 — t=0.00s');
  assert.match(content.at(-1).text,/Horse: Blaze[\s\S]*trot[\s\S]*RF[\s\S]*Short on RF/);
});

test('gait core: the model result is mapped onto video times and cleaned',()=>{
  const frames=[0,0.5,1,1.5].map(t=>({t,data:JPEG}));
  const out=core.normalizeResult({
    grade:2,suspected_limbs:['RF','RF','XX'],confidence:'medium',recommendation:'vet',summary_ar:'ملخص',summary_en:'Summary',
    video_quality:{usable:true,issues_ar:'',issues_en:''},gait_observed:'trot',
    findings:[{metric:'head_nod',level:'concern',text_ar:'هز',text_en:'Head nod'}],
    annotations:[{frame:3,level:'concern',text_ar:'الراس يرتفع',text_en:'Head rises as RF lands',x:1.4,y:0.25},
      {frame:1,level:'weird',text_ar:'بداية',text_en:'Start',x:null,y:null},{frame:9,level:'info',text_ar:'x',text_en:'x',x:0,y:0}]
  },frames);
  assert.equal(out.grade,2);
  assert.deepEqual(out.suspected_limbs,['RF']);
  assert.equal(out.recommendation,'vet');
  assert.deepEqual(out.annotations.map(a=>[a.t,a.level,a.x]),[[0,'info',null],[1,'concern',1]]);
  assert.equal(out.result.findings[0].metric,'head_nod');
  const empty=core.normalizeResult(null,frames);
  assert.deepEqual([empty.grade,empty.confidence,empty.recommendation,empty.annotations.length],[null,'low','monitor',0]);
});

test('gait core: the schema is valid for structured outputs and the video must belong to the record',()=>{
  const walk=(node)=>{
    if(!node||typeof node!=='object')return;
    if(node.type==='object'){assert.equal(node.additionalProperties,false);assert.deepEqual([...node.required].sort(),Object.keys(node.properties).sort());}
    for(const k of ['minimum','maximum','minLength','maxLength'])assert.ok(!(k in node),`unsupported ${k}`);
    Object.values(node).forEach(walk);
  };
  walk(core.RESULT_SCHEMA);
  assert.equal(core.MODEL,'claude-opus-5-5');
  assert.match(core.SYSTEM_PROMPT,/not a veterinarian/);
  assert.ok(core.mediaListed([{path:'movement/1/a.mp4',type:'video'}],'movement/1/a.mp4'));
  assert.ok(!core.mediaListed([{path:'movement/1/a.jpg',type:'image'}],'movement/1/a.jpg'));
  assert.ok(!core.mediaListed([],'movement/1/a.mp4'));
});

test('gait UI: frame plan, overlay timing and letterbox maths',()=>{
  const {planFrameTimes,activeAnnotation,contentBox}=gaitModule()._test;
  const plan=planFrameTimes(30,5);
  assert.equal(plan.length,30);
  assert.deepEqual([plan[0],plan.at(-1)],[5,15]);
  const tail=planFrameTimes(12,11.5);
  assert.ok(tail[0]>=1.9&&tail.at(-1)<=12,'a start near the end slides back to a full window');
  const short=planFrameTimes(3,0);
  assert.ok(short.length>=4&&short.length<=9&&short.at(-1)<=3);
  assert.equal(planFrameTimes(0,0).length,0);
  const notes=[{t:1,text_en:'a'},{t:2,text_en:'b'},{t:6,text_en:'c'}];
  assert.equal(activeAnnotation(notes,0.5),null);
  assert.equal(activeAnnotation(notes,1.2).text_en,'a');
  assert.equal(activeAnnotation(notes,2.1).text_en,'b');
  assert.equal(activeAnnotation(notes,4),null);
  assert.deepEqual({...contentBox(400,400,1920,1080)},{x:0,y:87.5,w:400,h:225});
});

test('gait UI: chips show the latest analysis and only recorders get the analyse button',()=>{
  const g=gaitModule({canUser:()=>true});
  const {analyses,keyOf}=g._test;
  const log={kind:'log',id:7};
  const video={path:'movement/3/a.mp4',type:'video'};
  assert.equal(g.chip(log,{path:'x.jpg',type:'image'}),'');
  assert.match(g.chip(log,video),/Analyse movement/);
  analyses.set(keyOf('log',7,video.path),[{status:'failed',error:'x'},{status:'done',grade:2,suspected_limbs:['RF'],recommendation:'vet'}]);
  assert.match(g.chip(log,video),/Grade 2\/5 · RF · Ask the vet/);
  analyses.clear();
  const viewer=gaitModule({canUser:()=>false});
  assert.equal(viewer.chip(log,video),'');
});

test('gait analysis is wired into the movement log, page and edge function config',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('movement-log.js')<html.indexOf('gait-analysis.js'));
  assert.match(html,/src\/modules\/health\/gait-analysis\.css\?v=/);
  const mv=read('src/modules/health/movement-log.js');
  assert.match(mv,/CCE\.gait\.chip\(r,m\)/);
  assert.match(mv,/CCE\.gait\.load\(rows\)/);
  const fn=read('supabase/functions/gait-analysis/index.ts');
  assert.match(fn,/ANTHROPIC_API_KEY/);
  assert.match(fn,/cce_movement_can_record/);
  assert.match(fn,/fallbacks: 'default'/);
  assert.match(read('supabase/config.toml'),/\[functions\.gait-analysis\]/);
});
