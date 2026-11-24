import {siteRequest} from './site-services.js';
import {playSound} from './audio.js';
const list=document.querySelector('#collection'),intro=document.querySelector('#description');
const slug=new URLSearchParams(location.search).get('item');
function node(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function showLesson(lesson){
  const section=node('section');section.className='library-lesson';
  section.append(node('h2',lesson.title));
  const body=node('p',lesson.body);body.className='library-material';section.append(body);
  if(lesson.question){
    const form=node('form'),label=node('label',lesson.question),answer=node('input'),button=node('button','Check answer'),result=node('p');
    answer.required=true;answer.maxLength=400;label.append(answer);result.setAttribute('role','status');
    button.className='studio-control';form.append(label,button,result);section.append(form);
    const details=node('details');details.append(node('summary','Show worked answer'),node('p',lesson.answer));section.append(details);
    const normalize=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
    form.onsubmit=event=>{
      event.preventDefault();const correct=normalize(answer.value)===normalize(lesson.answer);
      result.textContent=correct?'Correct.':'Try again. Review the lesson or open the worked answer.';
      playSound(correct?'correct':'retry');
    };
  }
  list.append(section);
}
try{
  const fields=slug?'slug,kind,title,summary,lessons':'slug,kind,title,summary';
  const rows=[];
  for(let offset=0;;offset+=100){
    const filter=slug?'&slug=eq.'+encodeURIComponent(slug):'';
    const response=await siteRequest('library_items?published=eq.true&select='+fields+filter+'&order=title,slug&limit=100&offset='+offset);
    if(!response.ok)throw Error('The learning library is unavailable. Reload to try again.');
    const page=await response.json();rows.push(...page);if(page.length<100)break;
  }
  if(slug && rows[0]){
    const item=rows[0];
    document.querySelector('link[rel=canonical]').href='https://imon.com.bd/library.html?item='+encodeURIComponent(item.slug);
    document.title=item.title+' · IMON.world';document.querySelector('h1').textContent=item.title;
    intro.textContent=item.summary;item.lessons.forEach(showLesson);
  }else if(slug){intro.textContent='This item is unavailable. Browse the learning library for published material.';}
  else{
    intro.textContent=rows.length?'Courses, labs and articles from IMON.':'New material will appear here when published. Explore the course catalog for the core labs.';
    for(const item of rows){
      const section=node('section'),a=node('a',item.title);a.href='library.html?item='+encodeURIComponent(item.slug);
      const h=node('h2');h.append(a);section.className='library-lesson';section.append(node('small',item.kind.toUpperCase()),h,node('p',item.summary));list.append(section);
    }
  }
}catch(error){intro.textContent=error.message;}
