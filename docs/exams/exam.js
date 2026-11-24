import {exams,grade} from './cases.js';
import {enablePictureMotion} from '../picture-motion.js';

enablePictureMotion(document.getElementById('exam-motion'));
const query=new URLSearchParams(location.search).get('track');
const track=Object.hasOwn(exams,query)?query:'code', exam=exams[track];
const paper=document.querySelector('#paper'),report=document.querySelector('#report');
document.querySelector('#tracks [data-track="'+track+'"]').setAttribute('aria-current','page');
document.getElementById('track-title').textContent=exam.name;
const key='imon-practice-exam-v1-'+track;
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
function best(){try{const n=localStorage.getItem(key);return n===null?null:Number(n)}catch{return null}}
function record(){const score=best();document.querySelector('#record').textContent=Number.isFinite(score)?'Best on this device: '+score+'%':'First attempt on this device'}
record();
const questions=[];
for(const study of exam.cases){
 const section=el('section','');section.append(el('h3',study.title),el('p',study.brief));
 for(const task of study.tasks){
  const name='task-'+questions.length,field=el('fieldset','');questions.push({task,name});
  field.append(el('legend',task.prompt));
  if(task.options){
   for(const [index,answer] of task.options.entries()){
    const label=el('label',''),input=document.createElement('input');input.type=task.correct.length>1?'checkbox':'radio';input.name=name;input.value=index;label.append(input,' '+answer);field.append(label);
   }
  }else{const input=document.createElement('input');input.type='number';input.step='any';input.name=name;input.setAttribute('aria-label',task.prompt);field.append(input)}
  section.append(field);
 }
 paper.append(section);
}
const submit=el('button','Submit for evaluation');submit.type='submit';paper.append(submit);
paper.addEventListener('submit',event=>{
 event.preventDefault();
 const data=new FormData(paper);
 const results=questions.map(({task,name})=>{
  const response=task.options?data.getAll(name).map(Number):data.get(name);
  return {task,response,points:grade(task,response)};
 });
 const missing=results.findIndex(r=>r.response===null||r.response.length===0);
 if(missing!==-1){const input=paper.querySelector('[name="'+questions[missing].name+'"]');input.focus();input.setCustomValidity('Answer this question before submitting.');input.reportValidity();input.setCustomValidity('');return}
 const total=results.reduce((n,r)=>n+r.points,0),percent=Math.round(100*total/results.length);
 try{localStorage.setItem(key,String(Math.max(best()||0,percent)))}catch{}
 paper.hidden=true;report.hidden=false;report.replaceChildren(el('h2',percent+'% · '+(percent>=75?'Passed':'Keep practising')),el('p',total+' of '+results.length+' points. Multiple selections earn partial credit; incorrect selections reduce it.'));
 for(const {task,response,points} of results){
  const row=el('article','');row.append(el('h3',task.skill+' · '+points+' / 1'),el('p',task.prompt),el('p','Your answer: '+(task.options?response.map(i=>task.options[i]).join(', '):response)),el('p','Expected: '+(task.options?task.correct.map(i=>task.options[i]).join(', '):task.answer)),el('p',task.why));report.append(row);
 }
 const lab=el('a','Practise in the lab');lab.href='../'+exam.lab;
 const retry=el('button','Try again');retry.type='button';retry.onclick=()=>{report.hidden=true;paper.hidden=false;paper.reset();paper.querySelector('input').focus()};
 report.append(lab,' · ',retry);record();report.focus();
});
