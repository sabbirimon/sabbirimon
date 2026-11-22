import test from 'node:test';
import assert from 'node:assert/strict';
import { HTML_COURSE, CSS_COURSE, CHAPTERS, chapterMaterial, courseFor } from '../docs/lab-chapters.js';
import { NOTES, noteKey, notesFor, notesSummary } from '../docs/lab-notes.js';
import { stripComments, linesMatching, firstMatch, detectLanguage, fixExample, findMissingRule, locateProblem, buildFeedback, FILE_LABELS, RULES } from '../docs/lab-feedback.js';
import { buildBurst, rewardText, COIN_FACES } from '../docs/lab-reward.js';
import { chapterProgress, progressSummary } from '../docs/lab-progress.js';
import { buildQuery, pickDocs, lookupFailureText, lookupDocs, STACK_SEARCH, LOOKUP_LIMIT, CONCEPT_SEARCHES } from '../docs/lab-lookup.js';
import { EXERCISES } from '../docs/lab.js';

test('every chapter carries the four things the learner needs',()=>{
 for(const [name,chapter] of Object.entries(CHAPTERS)){
  assert.equal(typeof chapter.goal,'string',name+' needs a goal');
  assert.ok(chapter.goal.length>10,name+' goal is too short');
  assert.ok(Array.isArray(chapter.material),name+' needs material');
  assert.ok(chapter.material.length>0,name+' needs material');
  assert.equal(typeof chapter.exam,'string',name+' needs exam instructions');
  assert.equal(typeof chapter.outcome,'string',name+' needs an outcome');
 }
});

test('every study material entry has a title, a body and code',()=>{
 for(const [name,chapter] of Object.entries(CHAPTERS)){
  for(const entry of chapter.material){
   assert.equal(typeof entry.title,'string',name);
   assert.ok(entry.title.length>3,name);
   assert.equal(typeof entry.body,'string',name);
   assert.ok(entry.body.length>10,name);
   assert.equal(typeof entry.code,'string',name);
   assert.ok(entry.code.length>0,name);
  }
 }
});

test('the course cards carry the topics, the level and the time',()=>{
 for(const course of [HTML_COURSE,CSS_COURSE]){
  assert.equal(typeof course.name,'string');
  assert.equal(course.level,'Beginner');
  assert.ok(course.hours.length>3);
  assert.equal(course.free,true);
  assert.ok(course.topics.length>=4);
  assert.ok(course.outcome.length>20);
  assert.ok(course.needs.length>10);
 }
});

test('chapterMaterial finds a chapter by name and by casing',()=>{
 assert.equal(chapterMaterial('Markup basics').goal,CHAPTERS['Markup basics'].goal);
 assert.equal(chapterMaterial('markup basics').goal,CHAPTERS['Markup basics'].goal);
 assert.equal(chapterMaterial('  HTML · Elements  ').goal,CHAPTERS['HTML · Elements'].goal);
 assert.equal(chapterMaterial('Nope'),null);
 assert.equal(chapterMaterial(''),null);
 assert.equal(chapterMaterial(null),null);
});

test('courseFor maps a chapter to its course',()=>{
 assert.equal(courseFor('CSS · Flexbox'),CSS_COURSE);
 assert.equal(courseFor('HTML · Elements'),HTML_COURSE);
 assert.equal(courseFor('JavaScript · The Basics'),HTML_COURSE);
 assert.equal(courseFor('Markup basics'),null);
});

test('the notes library covers the tags a beginner meets',()=>{
 for(const key of ['h1','p','ul','li','img','a','div','span','form','input','label','button','table'])assert.ok(NOTES[key],key+' needs a note');
 for(const key of ['color','padding','margin','border','font-size','display','flex','position'])assert.ok(NOTES[key],key+' needs a note');
 for(const key of ['variable','function','loop','condition','array','object','console.log','querySelector','addEventListener'])assert.ok(NOTES[key],key+' needs a note');
});

test('every note has a title, a body and an example',()=>{
 for(const [key,note] of Object.entries(NOTES)){
  assert.equal(typeof note.title,'string',key);
  assert.ok(note.title.length>2,key);
  assert.equal(typeof note.body,'string',key);
  assert.ok(note.body.length>10,key);
  assert.equal(typeof note.example,'string',key);
  assert.ok(note.example.length>0,key);
 }
});

test('noteKey normalises a tag or property name',()=>{
 assert.equal(noteKey('H1'),'h1');
 assert.equal(noteKey('  <P>  '),'p');
 assert.equal(noteKey('console.log'),'console.log');
 assert.equal(noteKey('font-size'),'font-size');
 assert.equal(noteKey(''),'');
 assert.equal(noteKey(null),'');
});

test('notesFor falls back to the general note for the language',()=>{
 const matched=notesFor({language:'html',requirements:['h1','p']});
 assert.equal(matched.length,2);
 assert.equal(matched[0].key,'h1');
 assert.equal(matched[0].title,NOTES.h1.title);
 const css=notesFor({language:'css',requirements:['padding']});
 assert.equal(css[0].title,NOTES.padding.title);
 const js=notesFor({language:'js',requirements:['console.log']});
 assert.equal(js[0].title,NOTES['console.log'].title);
 const html=notesFor({language:'html',requirements:['zzz']});
 assert.ok(html.length>0,'the general notes should be used');
 const unknown=notesFor({language:'nonsense',requirements:['zzz']});
 assert.ok(unknown.length>0,'an unknown language still gets notes');
 assert.ok(notesFor(null).length>0);
});

test('notesSummary names what the exercise touches',()=>{
 const summary=notesSummary({language:'css',chapter:'CSS · Layout'});
 assert.equal(summary,'CSS · Layout');
 assert.equal(notesSummary({language:'html',chapter:'HTML · Elements'}),'HTML · Elements');
 assert.equal(notesSummary({language:'html',chapter:'Markup basics'}),'HTML · Markup basics');
 assert.ok(notesSummary({language:'js'}).includes('JavaScript'));
 assert.ok(notesSummary({}).length>0);
});

test('stripComments removes comments but keeps the line count',()=>{
 assert.equal(stripComments('<p>a</p><!-- <h1>x</h1> -->','html').includes('h1'),false);
 assert.equal(stripComments('a{}/* color: red */','css').includes('red'),false);
 assert.equal(stripComments('const a = 1; // note','js').includes('note'),false);
 assert.equal(stripComments('<p>a</p>','html').split('\n').length,1);
});

test('linesMatching reports the one-based line number',()=>{
 const source='<p>one</p>\n<p>two</p>\n<ul>x</ul>';
 const hits=linesMatching(source,/<p[\s>]/i,'html');
 assert.equal(hits.length,2);
 assert.equal(hits[0].line,1);
 assert.equal(hits[1].line,2);
 assert.equal(firstMatch(source,/<ul[\s>]/i,'html').line,3);
 assert.equal(firstMatch(source,/<table[\s>]/i,'html'),null);
});

test('detectLanguage reads the language out of the checker wording',()=>{
 assert.equal(detectLanguage('No <ul> found'),'html');
 assert.equal(detectLanguage('No padding found in the stylesheet'),'css');
 assert.equal(detectLanguage('Add a console.log call'),'js');
 assert.equal(detectLanguage('something else','css'),'css');
});

test('fixExample pulls the code out of the hint',()=>{
 const fix=fixExample({message:'No <ul> found.',hint:'Wrap each item in <li> and the items in <ul>.'});
 assert.equal(fix.code,'');
 assert.ok(fix.prose.includes('<li>'));
 const withCode=fixExample({message:'x',hint:'Try `const score = 42;` to fix it.'});
 assert.equal(withCode.code,'const score = 42;');
 assert.ok(withCode.prose.includes('to fix it'));
 assert.equal(fixExample({}).prose,'');
});

test('findMissingRule names the element that is missing',()=>{
 const missing=findMissingRule({html:'<p>Apples</p>'},{message:'No <ul> found. An unordered list needs a <ul> element.',hint:'Wrap each item in <li> and the items in <ul>.'});
 assert.ok(missing);
 assert.equal(missing.rule.id,'html-ul');
 assert.equal(missing.language,'html');
});

test('locateProblem points at the file and the line',()=>{
 const buffers={html:'<p>Apples</p>\n<p>Pears</p>',css:'',js:''};
 const where=locateProblem(buffers,{message:'No <ul> found.',hint:'x'});
 assert.equal(where.language,'html');
 assert.equal(where.file,FILE_LABELS.html);
 assert.ok(where.line>=1);
 assert.ok(where.line<=2);
});

test('buildFeedback explains what, where and how',()=>{
 const buffers={html:'<p>Apples</p>',css:'',js:''};
 const feedback=buildFeedback(buffers,{message:'No <ul> found.',hint:'Wrap each item in <li> and the items in <ul>.'});
 assert.equal(feedback.ok,false);
 assert.ok(feedback.problems.length>=1);
 assert.ok(feedback.problems[0].title.includes('<ul>'));
 assert.ok(feedback.problems[0].detail.length>10);
 assert.ok(feedback.where.file);
 assert.ok(feedback.fix.prose.length>0);
});

test('every rule has a language, a pattern and a want',()=>{
 for(const rule of RULES){
  assert.ok(['html','css','js'].includes(rule.language),rule.id);
  assert.ok(rule.pattern instanceof RegExp,rule.id);
  assert.ok(rule.want.length>2,rule.id);
  assert.ok(rule.label.length>2,rule.id);
 }
});

test('the coin burst spreads the coins over an arc',()=>{
 const burst=buildBurst(12);
 assert.equal(burst.length,12);
 const xs=new Set(burst.map(coin=>coin.x));
 assert.ok(xs.size>5,'the coins should not all travel the same way');
 for(const coin of burst){
  assert.ok(COIN_FACES.includes(coin.face));
  assert.ok(Number.isFinite(coin.x));
  assert.ok(Number.isFinite(coin.y));
 }
});

test('rewardText names the exercise and the XP',()=>{
 const text=rewardText({title:'Make a list'},15,140);
 assert.ok(text.includes('Make a list'));
 assert.ok(text.includes('15 XP'));
 assert.ok(text.includes('140 XP'));
});

test('chapterProgress reports each chapter state',()=>{
 const exercises=[{id:'a',chapter:'One'},{id:'b',chapter:'One'},{id:'c',chapter:'Two'}];
 const states=chapterProgress(['One','Two'],exercises,new Set(['a']),'One');
 assert.equal(states.length,2);
 assert.equal(states[0].done,1);
 assert.equal(states[0].total,2);
 assert.equal(states[0].percent,50);
 assert.equal(states[0].current,true);
 assert.equal(states[0].complete,false);
 assert.equal(states[1].done,0);
 assert.equal(states[1].current,false);
});

test('progressSummary counts the solved exercises and the XP',()=>{
 const exercises=[{id:'a',chapter:'One'},{id:'b',chapter:'One'}];
 const summary=progressSummary(['One'],exercises,new Set(['a']),20);
 assert.ok(summary.includes('1 of 2 solved'));
 assert.ok(summary.includes('50%'));
 assert.ok(summary.includes('20 XP'));
});

/* -- the documentation lookup ------------------------------------- */

test('buildQuery adds the language to every search',()=>{
 assert.equal(buildQuery('p','html'),'<p> tag html');
 assert.equal(buildQuery('padding','css'),'padding css property');
 assert.equal(buildQuery('querySelector','js'),'queryselector javascript method');
 assert.equal(buildQuery('  P  ','html'),'<p> tag html');
 assert.equal(buildQuery('<ul>','html'),'<ul> tag html');
 assert.equal(buildQuery('','html'),'');
 assert.equal(buildQuery(null,'html'),'');
 assert.ok(buildQuery('x','nonsense').includes('web'));
});

test('buildQuery searches for a concept by the thing that carries it',()=>{
 // A bare "variable" finds questions about variables in any language, so
 // the search goes after the keyword that declares one.
 assert.ok(buildQuery('variable','js').includes('declare'));
 assert.ok(buildQuery('loop','js').includes('for loop'));
 assert.ok(buildQuery('console.log','js').includes('console.log'));
 // Every concept in the map must produce a query that is not empty.
 for(const key of Object.keys(CONCEPT_SEARCHES)) assert.ok(buildQuery(key,'js').length>3,key);
});

test('pickDocs keeps only the questions that can be opened',()=>{
 const payload={items:[
  {title:'How do I prevent the &quot;padding&quot; property changing width?',link:'https://stackoverflow.com/questions/1',score:286,answer_count:9,tags:['html','css','padding']},
  {title:'Broken',answer_count:1},
  {title:'A question with a link',link:'https://stackoverflow.com/questions/2',score:1,answer_count:0,tags:[]}
 ]};
 const docs=pickDocs(payload);
 assert.equal(docs.length,2);
 assert.equal(docs[0].title,'How do I prevent the "padding" property changing width?');
 assert.equal(docs[0].url,'https://stackoverflow.com/questions/1');
 assert.equal(docs[0].score,286);
 assert.equal(docs[0].answers,9);
 assert.ok(docs[0].summary.includes('9 answers'));
 assert.ok(docs[0].summary.includes('#padding'));
 // A question with no answers still gets a title and a link.
 assert.equal(docs[1].url,'https://stackoverflow.com/questions/2');
 assert.equal(docs[1].summary,'upvoted 1');
});

test('pickDocs caps the list and survives rubbish',()=>{
 const many={items:Array.from({length:20},(_,i)=>({title:'T'+i,link:'https://stackoverflow.com/questions/'+i}))};
 assert.equal(pickDocs(many).length,LOOKUP_LIMIT);
 assert.equal(pickDocs(many,3).length,3);
 assert.deepEqual(pickDocs(null),[]);
 assert.deepEqual(pickDocs({}),[]);
 assert.deepEqual(pickDocs({items:'nope'}),[]);
});

test('lookupFailureText explains each way of failing',()=>{
 assert.ok(lookupFailureText('offline').includes('No connection'));
 assert.ok(lookupFailureText('timeout').includes('too long'));
 assert.ok(lookupFailureText('quota').includes('run out of requests'));
 assert.ok(lookupFailureText('http').includes('did not answer'));
 assert.ok(lookupFailureText('empty').length>0);
});

test('lookupDocs asks the free service and returns the questions',async()=>{
 let seen='';
 const result=await lookupDocs('padding','css',{
  fetch:async url=>{seen=url;return {ok:true,json:async()=>({quota_remaining:100,items:[{title:'CSS padding',link:'https://stackoverflow.com/questions/1',score:10,answer_count:3,tags:['css']}]})};}
 });
 assert.equal(result.ok,true);
 assert.equal(result.pages.length,1);
 assert.ok(seen.startsWith(STACK_SEARCH));
 assert.ok(seen.includes('q=padding%20css%20property'));
 assert.ok(seen.includes('site=stackoverflow'));
 assert.equal(result.query,'padding css property');
});

test('lookupDocs reports a failure instead of throwing',async()=>{
 const bad=await lookupDocs('p','html',{fetch:async()=>({ok:false,status:500,json:async()=>({})})});
 assert.equal(bad.ok,false);
 assert.equal(bad.error,'http');
 const empty=await lookupDocs('p','html',{fetch:async()=>({ok:true,json:async()=>({quota_remaining:100,items:[]})})});
 assert.equal(empty.ok,false);
 assert.equal(empty.error,'empty');
 const spent=await lookupDocs('p','html',{fetch:async()=>({ok:true,json:async()=>({quota_remaining:0,items:[]})})});
 assert.equal(spent.error,'quota');
 const noTerm=await lookupDocs('','html',{});
 assert.equal(noTerm.ok,false);
 assert.equal(noTerm.error,'empty');
 const noFetch=await lookupDocs('p','html',{fetch:null});
 assert.equal(noFetch.error,'offline');
});

test('lookupDocs turns a thrown error into an offline report',async()=>{
 const result=await lookupDocs('p','html',{fetch:async()=>{throw new Error('network down');}});
 assert.equal(result.ok,false);
 assert.equal(result.error,'offline');
 const aborted=await lookupDocs('p','html',{fetch:async()=>{const e=new Error('aborted');e.name='AbortError';throw e;}});
 assert.equal(aborted.error,'timeout');
});

test('every built-in exercise names what it is about',()=>{
 for(const exercise of EXERCISES){
  assert.ok(Array.isArray(exercise.requirements),exercise.id+' needs requirements');
  assert.ok(exercise.requirements.length>0,exercise.id+' needs at least one requirement');
 }
});

test('every built-in requirement has a note to show',()=>{
 for(const exercise of EXERCISES){
  for(const requirement of exercise.requirements){
   assert.ok(NOTES[noteKey(requirement)],exercise.id+' → '+requirement+' has no note');
  }
 }
});
