import test from 'node:test';
import assert from 'node:assert/strict';
import { STATS_DATA, STAT_FIELDS, LANGUAGE_LIMIT, statEntries, formatCount, languageRows, describeAge, memberYears, buildStats, initGitHubStats } from '../docs/github-stats.js';

const SNAPSHOT = {
  updated: '2026-11-22T06:15:00+00:00',
  source: 'GitHub REST API',
  profile: { login: 'sabbirimon', name: 'Sabbir Hassan Imon', url: 'https://github.com/sabbirimon' },
  stats: { followers: 6, repositories: 55, stars: 57, forks: 8, watchers: 57, membersSince: '2017-08-05' },
  topLanguages: [
    { name: 'Kotlin', share: 72 },
    { name: 'Web', share: 19 },
    { name: 'Python', share: 5 },
    { name: 'Rust', share: 3 },
    { name: 'C++', share: 1 }
  ]
};

test('the strip reads a local snapshot file',()=>{
 assert.equal(STATS_DATA,'data/github-stats.json');
});

test('every counter has a label and an accent',()=>{
 for(const field of STAT_FIELDS){
  assert.equal(typeof field.key,'string');
  assert.ok(field.label.length>2,field.key);
  assert.ok(['cyan','violet','pink','lime'].includes(field.accent),field.key);
 }
});

test('statEntries keeps the counters in order',()=>{
 const entries=statEntries(SNAPSHOT.stats);
 assert.equal(entries.length,STAT_FIELDS.length);
 assert.deepEqual(entries.map(entry=>entry.key),STAT_FIELDS.map(field=>field.key));
 assert.equal(entries[0].display,'55');
 assert.equal(entries[1].display,'57');
});

test('a missing number is a dash and never a zero',()=>{
 const entries=statEntries({repositories:0,stars:undefined,followers:null,forks:8});
 assert.equal(entries[0].display,'0','a real zero stays a zero');
 assert.equal(entries[1].display,'—','an unknown value is not a zero');
 assert.equal(entries[2].display,'—');
 assert.equal(entries[3].display,'8');
 assert.equal(entries[1].value,null);
});

test('statEntries survives rubbish',()=>{
 assert.equal(statEntries(null).length,STAT_FIELDS.length);
 assert.equal(statEntries(undefined).length,STAT_FIELDS.length);
 assert.equal(statEntries('nope')[0].display,'—');
});

test('formatCount shortens the big numbers',()=>{
 assert.equal(formatCount(0),'0');
 assert.equal(formatCount(57),'57');
 assert.equal(formatCount(999),'999');
 assert.equal(formatCount(1000),'1k');
 assert.equal(formatCount(1250),'1.3k');
 assert.equal(formatCount(1234),'1.2k');
 assert.equal(formatCount(9999),'10k');
 assert.equal(formatCount(1000000),'1M');
 assert.equal(formatCount(2500000),'2.5M');
 assert.equal(formatCount(-500),'-500');
 assert.equal(formatCount('nope'),'—');
});

test('languageRows keeps the biggest languages and folds the rest',()=>{
 const rows=languageRows(SNAPSHOT.topLanguages);
 assert.equal(rows.length,5);
 assert.equal(rows[0].name,'Kotlin');
 assert.equal(rows[0].share,72);
 // Five languages or fewer are all shown, with no "Other" row invented.
 assert.ok(!rows.some(row=>row.name==='Other'));
});

test('languageRows folds the tail into one Other row',()=>{
 const many=[
  {name:'Kotlin',share:50},{name:'Rust',share:20},{name:'Go',share:10},
  {name:'Python',share:8},{name:'Ruby',share:6},{name:'C',share:4},{name:'Shell',share:2}
 ];
 const rows=languageRows(many,LANGUAGE_LIMIT);
 assert.equal(rows.length,LANGUAGE_LIMIT);
 assert.equal(rows[rows.length-1].name,'Other');
 assert.equal(rows[rows.length-1].share,12,'the folded share is the sum of the tail');
 const total=rows.reduce((sum,row)=>sum+row.share,0);
 assert.equal(total,100,'the rows add up to the whole');
});

test('languageRows sorts by share before it folds',()=>{
 const rows=languageRows([{name:'Small',share:1},{name:'Big',share:90},{name:'Mid',share:9}]);
 assert.equal(rows[0].name,'Big');
 assert.equal(rows[1].name,'Mid');
});

test('languageRows survives rubbish',()=>{
 assert.deepEqual(languageRows(null),[]);
 assert.deepEqual(languageRows(undefined),[]);
 assert.deepEqual(languageRows('nope'),[]);
 assert.deepEqual(languageRows([null,{share:5}]),[]);
});

test('describeAge names the age of the snapshot honestly',()=>{
 const now=Date.parse('2026-11-22T12:00:00Z');
 assert.equal(describeAge('2026-11-22T11:59:00Z',now),'updated just now');
 assert.equal(describeAge('2026-11-22T09:00:00Z',now),'updated 3 hours ago');
 assert.equal(describeAge('2026-11-22T10:00:00Z',now),'updated 2 hours ago');
 assert.equal(describeAge('2026-11-21T06:00:00Z',now),'updated yesterday');
 assert.equal(describeAge('2026-11-19T06:00:00Z',now),'updated 3 days ago');
 assert.ok(describeAge('2026-01-01T06:00:00Z',now).includes('2026-01-01'));
 assert.equal(describeAge(null,now),'snapshot unavailable');
 assert.equal(describeAge('nonsense',now),'snapshot unavailable');
});

test('memberYears counts the years since the account was made',()=>{
 const now=Date.parse('2026-11-22T00:00:00Z');
 assert.equal(memberYears('2017-08-05',now),9);
 assert.equal(memberYears('2025-01-01',now),1);
 assert.equal(memberYears('nonsense',now),null);
 assert.equal(memberYears(undefined,now),null);
});

test('buildStats assembles the whole strip',()=>{
 const now=Date.parse('2026-11-22T12:00:00Z');
 const model=buildStats(SNAPSHOT,now);
 assert.equal(model.stats.length,STAT_FIELDS.length);
 assert.equal(model.languages.length,5);
 assert.equal(model.age,'updated 5 hours ago');
 assert.equal(model.years,9);
 assert.equal(model.source,'GitHub REST API');
 assert.equal(model.profile.login,'sabbirimon');
});

test('buildStats survives an empty snapshot',()=>{
 const model=buildStats(null);
 assert.equal(model.stats.length,STAT_FIELDS.length);
 assert.equal(model.languages.length,0);
 assert.equal(model.age,'snapshot unavailable');
 assert.equal(model.years,null);
});

test('buildStats does not turn a missing number into a zero',()=>{
 const model=buildStats({stats:{repositories:12}});
 const stars=model.stats.find(stat=>stat.key==='stars');
 assert.equal(stars.display,'—');
 assert.equal(stars.value,null);
});

/* -- the strip on the page ---------------------------------------- */

/**
 * A very small DOM stand-in.
 *
 * The site has no npm dependencies, so the tests cannot reach for a real
 * DOM library. This builds just enough of one for the strip to draw into:
 * an element with children, a dataset, and a querySelector that finds a
 * child by its data attribute. The module creates its elements through
 * the global `document`, so that is installed for the duration of each
 * test that needs it.
 */
function makeElement(){
 const element={
  children:[],
  dataset:{},
  style:{},
  className:'',
  textContent:'',
  parentNode:null,
  setAttribute(){},
  append(...nodes){
   for(const node of nodes){
    node.parentNode=element;
    element.children.push(node);
   }
  },
  querySelector(){ return null; }
 };
 return element;
}

/** Install a global document whose createElement makes the same elements. */
function withDocument(){
 const previous=globalThis.document;
 globalThis.document={ createElement:()=>makeElement() };
 return ()=>{ globalThis.document=previous; };
}

/**
 * A root element that holds the strip's parts.
 *
 * The parts are found by the same attribute selectors the module uses,
 * so a typo in a selector shows up here as a test failure rather than
 * as an empty panel in production. The strip element itself answers the
 * same queries, because the module looks inside it for the counters,
 * the language list, the meta line and the note.
 */
function makeRoot(parts=[]){
 const root=makeElement();
 const parts_={};
 const find=selector=>{
  const name=selector.replace(/^\[|\]$/g,'').replace(/^data-/,'');
  return parts_[name]||null;
 };
 for(const name of parts){
  const element=makeElement();
  element.dataset[name]='';
  parts_[name]=element;
  root.append(element);
 }
 root.querySelector=find;
 root.parts=parts_;
 for(const element of Object.values(parts_)) element.querySelector=find;
 return root;
}

test('the strip draws the counters and the languages',async()=>{
 const restore=withDocument();
 try{
  const root=makeRoot(['github-stats','stats-counters','stats-languages','stats-meta','stats-note']);
  const controller=initGitHubStats(root,{fetch:async()=>({ok:true,json:async()=>SNAPSHOT})});
  const model=await controller.load();
  assert.equal(root.parts['github-stats'].dataset.statsState,'ready');
  const counters=root.parts['stats-counters'];
  assert.equal(counters.children.length,STAT_FIELDS.length);
  assert.equal(counters.children[0].children[0].textContent,'55');
  assert.equal(counters.children[0].children[1].textContent,'Repositories');
  const languages=root.parts['stats-languages'];
  assert.equal(languages.children.length,5);
  assert.equal(languages.children[0].children[0].textContent,'Kotlin');
  assert.ok(root.parts['stats-meta'].textContent.includes('years on GitHub'));
  assert.equal(model.stats.length,STAT_FIELDS.length);
 } finally { restore(); }
});

test('a failed snapshot leaves the page working',async()=>{
 const restore=withDocument();
 try{
  const root=makeRoot(['github-stats','stats-counters','stats-note']);
  const controller=initGitHubStats(root,{fetch:async()=>{throw new Error('offline');}});
  const result=await controller.load();
  assert.equal(result,null);
  assert.equal(root.parts['github-stats'].dataset.statsState,'unavailable');
  assert.ok(root.parts['stats-note'].textContent.includes('could not be loaded'));
 } finally { restore(); }
});

test('a snapshot with no numbers is not drawn as zeros',async()=>{
 const restore=withDocument();
 try{
  const root=makeRoot(['github-stats','stats-counters','stats-note']);
  const controller=initGitHubStats(root,{fetch:async()=>({ok:true,json:async()=>({stats:{}})}),path:'data/github-stats.json'});
  await controller.load();
  assert.equal(root.parts['github-stats'].dataset.statsState,'unavailable');
  assert.equal(root.parts['stats-counters'].children.length,0,'nothing is drawn');
 } finally { restore(); }
});

test('a missing strip is not an error',()=>{
 assert.equal(initGitHubStats({querySelector(){return null;}}),null);
});

test('no network at all is reported, not thrown',async()=>{
 const restore=withDocument();
 try{
  const root=makeRoot(['github-stats','stats-counters','stats-note']);
  const controller=initGitHubStats(root,{fetch:null});
  const result=await controller.load();
  assert.equal(result,null);
  assert.equal(root.parts['github-stats'].dataset.statsState,'unavailable');
 } finally { restore(); }
});
