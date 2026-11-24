import fs from 'node:fs';
import {allExercises,addImportedExercises} from '../docs/lab.js';
import {toExercises} from '../docs/lab-curriculum.js';

import {scenarios} from '../docs/systems-models.js';

const docs=new URL('../docs/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL('data/'+name+'.json',docs),'utf8'));
const origin='https://imon.com.bd/';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
addImportedExercises(toExercises(read('lab-curriculum')));
const tracks=[
  ['code','Code Lab','lab.html','HTML, CSS and JavaScript',allExercises()],
  ['ai','AI Lab','ai-lab.html','Python, machine learning and system design',read('ai-course').exercises],
  ['circuits','Circuits & Signals','circuits.html','Electronics, logic and oscilloscope measurements',read('circuits-course').exercises],
  ['systems','Systems Lab','systems.html','Networking, cloud usage, device support, defensive security and digital signals',scenarios]
];
const courses=tracks.map(([id,title,page,subject,exercises])=>({
  id,title,subject,url:origin+page,quizUrl:origin+page+'#course-quiz',
  exercises:exercises.map(({id,title,chapter,brief})=>({id,title,chapter,brief,url:origin+page+'?exercise='+encodeURIComponent(id)}))
}));
const count=courses.reduce((total,c)=>total+c.exercises.length,0);
function courseSection(course){
  const chapters=new Map();
  for(const e of course.exercises){
    if(!chapters.has(e.chapter))chapters.set(e.chapter,[]);
    chapters.get(e.chapter).push(e);
  }
  return `<section id="${course.id}"><div class="course-cover"><img width="900" height="300" src="art/lab-${course.id==='systems'?'ai':course.id}.webp" alt="" loading="lazy"><canvas data-learning-art="${course.id}" width="480" height="160" aria-hidden="true"></canvas></div><div class="catalog-copy"><h2>${escape(course.title)}</h2><p>${escape(course.subject)} · ${course.exercises.length} exercises</p><a href="${new URL(course.quizUrl).pathname.slice(1)}#course-quiz">Take the ${escape(course.title)} quiz</a>
${[...chapters].map(([name,list])=>`<details><summary>${escape(name)} (${list.length})</summary><ol>${list.map(e=>`<li><a href="${escape(e.url.slice(origin.length))}">${escape(e.title)}</a></li>`).join('\n')}</ol></details>`).join('\n')}
</div></section>`;
}
const description='Browse '+count+' free browser exercises in web development, AI, electronics and systems, grouped by course and chapter. Open any lesson or take a course quiz.';
const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'IMON course catalog',url:origin+'courses.html',description,mainEntity:{'@type':'ItemList',itemListElement:courses.map((c,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Course','@id':c.url+'#course',name:c.title,url:c.url,description:c.subject,isAccessibleForFree:true}}))}};
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Course catalog · IMON.world</title><meta name="description" content="${description}">
<link rel="canonical" href="${origin}courses.html"><link rel="alternate" type="application/json" href="data/course-index.json" title="Course and exercise index">
<meta property="og:title" content="Course catalog · IMON.world"><meta property="og:description" content="${description}"><meta property="og:image" content="${origin}art/lab-code.webp"><meta property="og:url" content="${origin}courses.html">
<script type="module" src="learning-art.js"></script><link rel="icon" href="icon.svg"><link rel="stylesheet" href="studio.css"><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="stylesheet" href="quests.css"><script type="module" src="quests.js" data-quest-page="courses"></script>
<link rel="stylesheet" href="site-public.css"><script type="module" src="site-public.js" data-public-page="courses"></script></head>
<body class="catalog-page"><header><a href="./#learn">← IMON.world</a></header><main><h1>Course catalog</h1><p>${description}</p>
<nav aria-label="Courses"><a href="progress.html">My progress</a><a href="leaderboard.html">Practice leaderboard</a>${courses.map(c=>`<a href="#${c.id}">${escape(c.title)}</a>`).join('')}<button type="button" class="studio-control" data-cover-motion hidden>Pause cover animations</button></nav>
<div class="catalog-list">${courses.map(courseSection).join('\n')}</div><section><h2>Open practice materials</h2><p>Try the <a href="ai-lab.html?exercise=exercism-leapyear-leap">Python practice studio</a> or <a href="lab.html?exercise=mdn-spending-caption">HTML table workshop</a>. Each includes worked answers and checks in your browser.</p><p>Python cases adapted from Exercism (<a href="data/exercism-license.txt">MIT license</a>). Table examples adapted from MDN Learning Area (<a href="data/mdn-license.txt">CC0</a>).</p></section></main><nav class="site-utilities" aria-label="Site information"><a href="sitemap.html">Site map</a><a href="quests.html">Quest journal</a><a href="privacy.html">Privacy policy</a><button type="button" data-open-privacy>Cookie settings</button></nav></body></html>
`;
for(const [path,content] of [['courses.html',html],['data/course-index.json',JSON.stringify({language:'en',exerciseCount:count,courses},null,2)+'\n']]){
  const url=new URL(path,docs);
  if(process.argv.includes('--check')){
    if(fs.readFileSync(url,'utf8')!==content)throw Error('Stale catalog. Run node scripts/course-catalog.mjs');
  }else fs.writeFileSync(url,content);
}
const boardUrl=new URL('learning-board.sql',import.meta.url);
const board=fs.readFileSync(boardUrl,'utf8');
const keys={code:'imon-lab-progress-v1',ai:'imon-ai-lab-v1',circuits:'imon-circuits-v1',systems:'imon-systems-v1'};
const groups=courses.map(course=>{
  if(course.exercises.some(e=>!/^[a-z0-9_-]+$/i.test(e.id)))throw Error('Invalid exercise ID');
  const ids=course.exercises.map(e=>e.id).join(' ');
  return "select '"+keys[course.id]+"', unnest(string_to_array('"+ids+"',' '))";
});
const registry='-- BEGIN EXERCISE IDS\ndelete from public.learning_exercises;\ninsert into public.learning_exercises(track,exercise)\n'+groups.join('\nunion all\n')+';\n-- END EXERCISE IDS';
const nextBoard=board.replace(/-- BEGIN EXERCISE IDS[\s\S]*?-- END EXERCISE IDS/,registry);
if(process.argv.includes('--check')){
  if(nextBoard!==board)throw Error('Stale leaderboard exercise registry');
}else fs.writeFileSync(boardUrl,nextBoard);
console.log(count+' exercises in '+courses.length+' courses');
