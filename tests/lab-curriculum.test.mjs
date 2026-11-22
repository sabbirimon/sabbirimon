import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CURRICULUM_URL,
  hasTag,
  countTag,
  hasProperty,
  hasSelector,
  makeChecker,
  toExercise,
  toExercises,
  loadCurriculum
} from '../docs/lab-curriculum.js';

const payload=JSON.parse(await readFile(new URL('../docs/data/lab-curriculum.json',import.meta.url),'utf8'));

test('every imported exercise can be solved by writing its requirements',()=>{
 // The checker must accept a solution that really uses what the brief
 // asks for, so a learner is never stuck on an impossible exercise.
 for(const entry of payload.exercises){
  if(entry.freeform)continue;
  const exercise=toExercise(entry);
  let solution='';
  for(const requirement of entry.requirements||[]){
   if(exercise.language==='html')solution+=`<${requirement}>text</${requirement}>`;
   // A CSS requirement is either a property or a selector, so the
   // solution has to cover both shapes.
   else if(exercise.language==='css'){
    solution+=`${requirement} { color: red; }`;
    solution+=`p { ${requirement}: 1px; }`;
   }
   else solution+=`${requirement}; ${requirement};`;
  }
  const buffers={html:'',css:'',js:''};
  buffers[exercise.language]=solution;
  const result=exercise.check(buffers);
  assert.equal(result.ok,true,`${exercise.id}: ${result.message}`);
 }
});

test('the shipped curriculum file is valid and every entry converts',()=>{
 assert.ok(payload.exercises.length>=60,payload.exercises.length);
 assert.equal(payload.license,'MIT');
 const exercises=toExercises(payload);
 assert.equal(exercises.length,payload.exercises.length);
 for(const exercise of exercises){
  assert.equal(typeof exercise.check,'function',exercise.id);
  assert.ok(exercise.title.length>0,exercise.id);
  assert.ok(exercise.brief.length>0,exercise.id);
  assert.ok(exercise.xp>0,exercise.id);
 }
});

test('every imported checker rejects its own starter and names what is missing',()=>{
 for(const entry of payload.exercises){
  if(entry.freeform)continue;
  const exercise=toExercise(entry);
  const result=exercise.check({...exercise.starter});
  assert.equal(result.ok,false,exercise.id);
  assert.ok(result.message.length>0,exercise.id);
  assert.equal(typeof result.hint,'string',exercise.id);
 }
});

test('the imported starters have the target element removed',()=>{
 const entry=payload.exercises.find(item=>item.id==='cx-1-elements-01-star');
 assert.ok(entry);
 assert.equal(hasTag(entry.starter.html,'h2'),false);
 const done=toExercise(entry).check({html:'<h2>December 25th, 2025</h2><p>Hi</p>',css:'',js:''});
 assert.equal(done.ok,true);
});

test('hasTag and countTag find elements and ignore non-elements',()=>{
 assert.equal(hasTag('<h1>Hi</h1>','h1'),true);
 assert.equal(hasTag('<h1>Hi</h1>','h2'),false);
 assert.equal(hasTag('<p>Hi','p'),true);
 assert.equal(hasTag('','p'),false);
 assert.equal(hasTag('<p>Hi</p>',''),false);
 assert.equal(countTag('<li>a</li><li>b</li>','li'),2);
 assert.equal(countTag('<p>a</p>','li'),0);
});

test('hasProperty accepts a property, a shorthand and rejects a lookalike',()=>{
 assert.equal(hasProperty('p { color: red; }','color'),true);
 assert.equal(hasProperty('p { margin-top: 4px; }','margin'),true);
 assert.equal(hasProperty('p { margin: 0; }','margin-top'),true);
 assert.equal(hasProperty('p { color: red; }','background'),false);
 assert.equal(hasProperty('p { mycolor: red; }','color'),false);
 assert.equal(hasProperty('','color'),false);
});

test('hasSelector matches tags, ids and classes',()=>{
 assert.equal(hasSelector('h1 { color: red; }','h1'),true);
 assert.equal(hasSelector('#hero { color: red; }','#hero'),true);
 assert.equal(hasSelector('.card { color: red; }','.card'),true);
 assert.equal(hasSelector('p { color: red; }','h1'),false);
 assert.equal(hasSelector('','h1'),false);
});

test('makeChecker rejects an empty editor and explains what to add',()=>{
 const check=makeChecker({language:'html',requirements:['h1','p']});
 const blank=check({html:'',css:'',js:''});
 assert.equal(blank.ok,false);
 assert.ok(blank.message.includes('empty'));
 const partial=check({html:'<h1>Hi</h1>',css:'',js:''});
 assert.equal(partial.ok,false);
 assert.ok(partial.message.includes('p'));
 assert.equal(check({html:'<h1>Hi</h1><p>There</p>',css:'',js:''}).ok,true);
});

test('makeChecker rejects a forbidden element',()=>{
 const check=makeChecker({language:'html',requirements:['div'],forbidden:['marquee']});
 assert.equal(check({html:'<div>a</div>',css:'',js:''}).ok,true);
 const bad=check({html:'<div><marquee>a</marquee></div>',css:'',js:''});
 assert.equal(bad.ok,false);
 assert.ok(bad.message.includes('marquee'));
});

test('a freeform challenge only needs the learner to have written something',()=>{
 const check=makeChecker({language:'html',freeform:true});
 assert.equal(check({html:'<p>hi</p>',css:'',js:''}).ok,false);
 assert.equal(check({html:'<p>'.padEnd(50,'x')+'</p>',css:'',js:''}).ok,true);
});

test('toExercise skips a malformed entry instead of throwing',()=>{
 assert.equal(toExercise(null),null);
 assert.equal(toExercise({}),null);
 assert.equal(toExercise({id:'a'}),null);
 assert.equal(toExercise({id:'a',title:'T'}).id,'a');
 assert.deepEqual(toExercises({exercises:[null,{}, {id:'a',title:'T'}]}).length,1);
 assert.deepEqual(toExercises(null),[]);
});

test('toExercise carries the requirements through the import',()=>{
 const exercise=toExercise({id:'a',title:'T',requirements:['h1','p']});
 assert.deepEqual(exercise.requirements,['h1','p']);
 // A missing or malformed list is an empty list, never a crash.
 assert.deepEqual(toExercise({id:'a',title:'T'}).requirements,[]);
 assert.deepEqual(toExercise({id:'a',title:'T',requirements:'nope'}).requirements,[]);
 assert.deepEqual(toExercise({id:'a',title:'T',requirements:['h1','',null,7]}).requirements,['h1']);
});

test('every imported exercise keeps its requirements',()=>{
 const withRequirements=payload.exercises.filter(entry=>Array.isArray(entry.requirements)&&entry.requirements.length);
 assert.ok(withRequirements.length>0,'the curriculum should name what the exercises are about');
 for(const entry of withRequirements){
  const exercise=toExercise(entry);
  assert.ok(exercise.requirements.length>0,entry.id+' lost its requirements');
 }
});

test('loadCurriculum returns an empty course when the file cannot be read',async()=>{
 const empty=await loadCurriculum(async()=>({ok:false}));
 assert.deepEqual(empty.exercises,[]);
 const broken=await loadCurriculum(async()=>({ok:true,json:async()=>{throw new Error('bad');}}));
 assert.deepEqual(broken.exercises,[]);
 const ok=await loadCurriculum(async()=>({ok:true,json:async()=>({exercises:[{id:'a',title:'T'}]})}));
 assert.equal(ok.exercises.length,1);
 assert.equal(CURRICULUM_URL,'./data/lab-curriculum.json');
});
