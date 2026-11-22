import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_PROGRESS_KEY,
  LAB_LANGUAGES,
  CONSOLE_HISTORY,
  EXERCISES,
  exercisesInChapter,
  labChapters,
  findExercise,
  neighbourExercise,
  readLabProgress,
  mergeLabProgress,
  writeLabProgress,
  earnedXp,
  buildPreviewDocument,
  buildScriptFrame,
  formatConsoleEntry
} from '../docs/lab.js';

test('the lab ships exercises for every language it offers',()=>{
 assert.ok(EXERCISES.length>=9);
 for(const language of LAB_LANGUAGES)assert.ok(EXERCISES.some(exercise=>exercise.language===language),language);
 assert.equal(new Set(EXERCISES.map(exercise=>exercise.id)).size,EXERCISES.length);
});

test('every exercise is complete and its checker never throws',()=>{
 for(const exercise of EXERCISES){
  assert.equal(typeof exercise.id,'string');
  assert.equal(typeof exercise.title,'string');
  assert.equal(typeof exercise.brief,'string');
  assert.equal(typeof exercise.chapter,'string');
  assert.ok(exercise.xp>0,exercise.id);
  for(const language of LAB_LANGUAGES)assert.equal(typeof exercise.starter[language],'string',exercise.id);
  assert.equal(typeof exercise.check,'function');
  // The checker must return a usable verdict for empty buffers.
  const result=exercise.check({html:'',css:'',js:''});
  assert.equal(typeof result.ok,'boolean',exercise.id);
  assert.equal(typeof result.message,'string',exercise.id);
 }
});

test('every checker accepts its own starter solution',()=>{
 // The starters are deliberately incomplete, so a checker that accepts them
 // would be broken. Each check must reject the blank or stubbed starter.
 for(const exercise of EXERCISES){
  const result=exercise.check({...exercise.starter});
  assert.equal(result.ok,false,exercise.id);
 }
});

test('the checkers accept the shapes they are meant to accept',()=>{
 assert.equal(findExercise('html-first-tag').check({html:'<p>a</p><p>b</p>',css:'',js:''}).ok,true);
 assert.equal(findExercise('html-heading').check({html:'<h1>T</h1><p>a</p>',css:'',js:''}).ok,true);
 assert.equal(findExercise('html-list').check({html:'<ul><li>a</li><li>b</li><li>c</li></ul>',css:'',js:''}).ok,true);
 assert.equal(findExercise('css-colour').check({html:'',css:'h1 { color: #14adff; }',js:''}).ok,true);
 assert.equal(findExercise('css-box').check({html:'',css:'p { padding: 12px; background: #eee; }',js:''}).ok,true);
 assert.equal(findExercise('css-selector').check({html:'',css:'li { font-weight: bold; }',js:''}).ok,true);
 assert.equal(findExercise('js-variable').check({html:'',css:'',js:'const score = 42; console.log(score);'}).ok,true);
 assert.equal(findExercise('js-condition').check({html:'',css:'',js:'if (n > 10) { console.log("big"); } else { console.log("small"); }'}).ok,true);
 assert.equal(findExercise('js-loop').check({html:'',css:'',js:'for (let i = 0; i < 5; i++) { console.log("tick"); }'}).ok,true);
 assert.equal(findExercise('js-function').check({html:'',css:'',js:'function double(n) { return n * 2; } console.log(double(21));'}).ok,true);
});

test('a failed check explains itself and offers a hint',()=>{
 for(const exercise of EXERCISES){
  const result=exercise.check({html:'',css:'',js:''});
  assert.ok(result.message.length>0,exercise.id);
  assert.equal(typeof result.hint,'string',exercise.id);
 }
});

test('exercises are grouped into chapters in a stable order',()=>{
 const chapters=labChapters();
 assert.ok(chapters.length>=3);
 assert.deepEqual(chapters,[...new Set(chapters)]);
 for(const chapter of chapters)assert.ok(exercisesInChapter(chapter).length>0,chapter);
 assert.deepEqual(exercisesInChapter('no-such-chapter'),[]);
});

test('findExercise and neighbourExercise never throw and stop at the ends',()=>{
 assert.equal(findExercise('nope'),null);
 assert.equal(findExercise(''),null);
 const first=EXERCISES[0];
 const last=EXERCISES[EXERCISES.length-1];
 assert.equal(neighbourExercise(first.id,'prev'),null);
 assert.equal(neighbourExercise(last.id,'next'),null);
 assert.equal(neighbourExercise(first.id,'next').id,EXERCISES[1].id);
 assert.equal(neighbourExercise(last.id,'prev').id,EXERCISES[EXERCISES.length-2].id);
 assert.equal(neighbourExercise('nope','next'),null);
});

test('readLabProgress returns an empty shape when storage is unavailable',()=>{
 assert.deepEqual(readLabProgress(),{solved:[],xp:0});
});

test('mergeLabProgress keeps solved exercises unique and the best XP',()=>{
 assert.deepEqual(mergeLabProgress({solved:['a'],xp:10},{solved:['a'],xp:10}),{solved:['a'],xp:10});
 assert.deepEqual(mergeLabProgress({solved:['a'],xp:10},{solved:['b'],xp:5}),{solved:['a','b'],xp:10});
 assert.deepEqual(mergeLabProgress({solved:[],xp:0},{solved:['a'],xp:5}),{solved:['a'],xp:5});
 assert.deepEqual(mergeLabProgress(null,null),{solved:[],xp:0});
 assert.deepEqual(mergeLabProgress({solved:[1,'a'],xp:'x'},{solved:['a']}),{solved:['a'],xp:0});
 assert.deepEqual(mergeLabProgress({solved:[],xp:5},{solved:[],xp:9}),{solved:[],xp:9});
});

test('writeLabProgress never throws when storage refuses the write',()=>{
 assert.equal(writeLabProgress({solved:[],xp:0}),true);
});

test('earnedXp only counts exercises that really exist and were solved',()=>{
 const all=EXERCISES.map(exercise=>exercise.id);
 const total=EXERCISES.reduce((sum,exercise)=>sum+exercise.xp,0);
 assert.equal(earnedXp({solved:all}),total);
 assert.equal(earnedXp({solved:[]}),0);
 assert.equal(earnedXp({solved:['not-a-real-exercise']}),0);
 assert.equal(earnedXp(null),0);
 assert.equal(earnedXp({solved:[firstId()]}),EXERCISES[0].xp);
});

function firstId(){return EXERCISES[0].id;}

test('the preview document embeds the markup and the stylesheet',()=>{
 const doc=buildPreviewDocument('<h1>Hi</h1>','h1 { color: red; }');
 assert.ok(doc.includes('<h1>Hi</h1>'));
 assert.ok(doc.includes('h1 { color: red; }'));
 assert.ok(doc.startsWith('<!doctype html>'));
 assert.ok(doc.includes('</html>'));
 assert.ok(buildPreviewDocument('','').includes('<body>'));
});

test('the script frame forwards console output and catches errors',()=>{
 const frame=buildScriptFrame('console.log("hi");');
 assert.ok(frame.includes("source: 'imon-lab'"));
 assert.ok(frame.includes('payload: payload'));
 assert.ok(frame.includes("['log', 'info', 'warn', 'error']"));
 assert.ok(frame.includes("window.addEventListener('error'"));
 assert.ok(frame.includes("unhandledrejection"));
 assert.ok(frame.includes('console.log("hi");'));
 assert.ok(buildScriptFrame('').includes('<!doctype html>'));
 assert.ok(buildScriptFrame(null).includes('<!doctype html>'));
});

test('the script frame indents the learner code inside the try block',()=>{
 const frame=buildScriptFrame('const a = 1;\nconst b = 2;');
 assert.ok(frame.includes('  const a = 1;'));
 assert.ok(frame.includes('  const b = 2;'));
});

test('formatConsoleEntry marks each level with its own glyph',()=>{
 assert.equal(formatConsoleEntry({level:'log',args:['x']}).prefix,'›');
 assert.equal(formatConsoleEntry({level:'info',args:['x']}).prefix,'ℹ');
 assert.equal(formatConsoleEntry({level:'warn',args:['x']}).prefix,'▲');
 assert.equal(formatConsoleEntry({level:'error',args:['x']}).prefix,'✖');
 assert.equal(formatConsoleEntry({level:'log',args:['a','b']}).text,'a b');
 assert.equal(formatConsoleEntry({level:'log',args:[]}).text,'');
 assert.equal(formatConsoleEntry(null).level,'log');
});

test('the progress key and the console history are stable',()=>{
 assert.equal(LAB_PROGRESS_KEY,'imon-lab-progress-v1');
 assert.ok(CONSOLE_HISTORY>0);
});
