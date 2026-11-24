import {choices,saveChoices} from './site-choices.js';
import {siteRequest} from './site-services.js';
const script=document.querySelector('script[data-public-page]');
const page=script.dataset.publicPage;
const base=new URL('./',import.meta.url);
const panel=document.createElement('aside');
panel.className='consent-panel';
panel.setAttribute('aria-label','Cookie and privacy choices');
panel.innerHTML='<strong>Cookie & privacy choices</strong><p>Choose which optional features to enable on this device.</p><label><input type="checkbox" name="weather"> Approximate location for weather and the map</label><label><input type="checkbox" name="metrics"> Anonymous usage counts for the site owner</label><div><button type="button" data-essential>Essential only</button><button type="button" data-save>Save choices</button><a data-policy>Privacy policy</a></div>';
panel.querySelector('[data-policy]').href=new URL('privacy.html',base).href;
function show(){
  panel.hidden=false;
  const prefs=choices();
  panel.querySelector('[name=weather]').checked=!!prefs?.weather;
  panel.querySelector('[name=metrics]').checked=!!prefs?.metrics;
}
panel.querySelector('[data-essential]').onclick=()=>saveChoices(false,false);
panel.querySelector('[data-save]').onclick=()=>saveChoices(panel.querySelector('[name=weather]').checked,panel.querySelector('[name=metrics]').checked);
document.body.append(panel);
const open=document.querySelector('[data-open-privacy]');
open?.addEventListener('click',()=>{show();panel.querySelector('input').focus();});
document.addEventListener('imon:open-privacy',()=>{show();panel.querySelector('input').focus();});
if(choices())panel.hidden=true;else show();
const counted=new Set();
async function record(event){
  if(!choices()?.metrics||navigator.globalPrivacyControl===true||!['page_view','game_start','quiz_complete','quest_complete','map_explore'].includes(event))return;
  if(page==='account'||(event==='page_view'||event==='map_explore')&&counted.has(event))return;
  counted.add(event);
  const audience=navigator.webdriver||/bot\b|crawler|headless|spider/i.test(navigator.userAgent)?'declared_automation':'unverified_browser';
  try{await siteRequest('rpc/record_site_event',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({page_name:page,event_name:event,audience_name:audience})});}catch{}
}
document.addEventListener('imon:privacy',()=>{panel.hidden=true;void record('page_view');});
document.addEventListener('imon:metric',event=>void record(event.detail));
void record('page_view');
const content=document.querySelector('[data-published-content]');
if(content){
  siteRequest('site_content?select=heading,body&slot=eq.'+page).then(r=>r.ok?r.json():[]).then(rows=>{
    if(!rows[0]?.heading&&!rows[0]?.body)return;
    const h=document.createElement('h2'),p=document.createElement('p');h.textContent=rows[0].heading;p.textContent=rows[0].body;
    if(h.textContent)content.append(h);if(p.textContent)content.append(p);content.hidden=false;
  }).catch(()=>{});
}
if(page==='home'){
  const destinations={courses:['courses.html','Explore the course catalog'],quests:['quests.html','Explore mystery quests'],arcade:['arcade/','Play the arcade'],tools:['tools/','Open the toolbox']};
  siteRequest('site_preferences?id=eq.true&select=palette,featured').then(r=>r.ok?r.json():[]).then(([row])=>{
    if(!row)return;
    document.dispatchEvent(new CustomEvent('imon:default-palette',{detail:row.palette}));
    const destination=destinations[row.featured],link=document.querySelector('[data-featured-destination]');
    if(link&&destination){link.href=destination[0];link.textContent=destination[1]+' →';}
  }).catch(()=>{});
}
