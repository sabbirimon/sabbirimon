import {currentSession} from '../auth.js';
import {siteRequest} from '../site-services.js';
const $=selector=>document.querySelector(selector);
const status=$('#status');
async function request(path,options={}){
  const session=await currentSession();
  if(!session)throw Error('Sign in with the owner account to continue.');
  const r=await siteRequest(path,{...options,headers:{Authorization:'Bearer '+session.access_token,...options.headers}});
  if(!r.ok){
    const detail=await r.json().catch(()=>({}));
    throw Error(r.status===403||r.status===401?'Owner access is required.':detail.message||'The request failed. Try again.');
  }
  return r.json();
}
async function editor(){
  const slots=$('#slot'),title=$('#heading'),body=$('#body'),publish=$('#publish');
  let revision=null,requestId=0;
  function preview(){$('#preview h3').textContent=title.value;$('#preview p').textContent=body.value;}
  async function load(){
    const id=++requestId;publish.disabled=true;revision=null;
    try{
      const [row]=await request('site_content?select=heading,body,revision&slot=eq.'+slots.value);
      if(id!==requestId)return;
      if(!row)throw Error('Content slot unavailable.');
      title.value=row.heading;body.value=row.body;revision=row.revision;preview();status.textContent='Published revision '+revision;publish.disabled=false;
    }catch(e){status.textContent=e.message;}
  }
  slots.onchange=load;$('#reload').onclick=load;title.oninput=body.oninput=preview;
  publish.onclick=async()=>{
    if(revision===null)return;
    slots.disabled=publish.disabled=$('#reload').disabled=title.disabled=body.disabled=true;
    try{
      const rows=await request('site_content?slot=eq.'+slots.value+'&revision=eq.'+revision,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({heading:title.value.trim(),body:body.value.trim(),revision:revision+1})});
      if(!rows.length){revision=null;throw Error('Another editor published first. Copy your draft, then reload the published version.');}
      revision=rows[0].revision;status.textContent='Published revision '+revision+'.';
    }catch(e){status.textContent=e.message;}finally{slots.disabled=$('#reload').disabled=title.disabled=body.disabled=false;publish.disabled=revision===null;}
  };
  await load();
}
async function metrics(){
  const period=$('#period');
  async function load(){
    period.disabled=true;status.textContent='Loading report…';
    try{
      const since=new Date();since.setUTCDate(since.getUTCDate()-Number(period.value)+1);
      const filter='day=gte.'+since.toISOString().slice(0,10);
      const rows=[];
      for(let offset=0;;offset+=500){
        const batch=await request('usage_daily?'+filter+'&order=day.desc,page,event&limit=500&offset='+offset);rows.push(...batch);if(batch.length<500)break;
      }
      const groups=await request('audience_daily?'+filter);
      const sum=(list,match)=>list.filter(match).reduce((n,r)=>n+Number(r.total),0);
      $('#summary').textContent=sum(rows,r=>r.event==='page_view')+' page views · '+sum(rows,r=>r.event==='quiz_complete')+' completed quizzes · '+sum(rows,r=>r.event==='game_start')+' game starts · '+sum(rows,r=>r.event==='quest_complete')+' quest badges';
      $('#audience').textContent=sum(groups,r=>r.audience==='declared_automation')+' declared automation views · '+sum(groups,r=>r.audience==='unverified_browser')+' unverified browser views';
      const tbody=$('tbody');tbody.replaceChildren();
      for(const row of rows){const tr=tbody.insertRow();for(const value of [row.day,row.page,row.event.replaceAll('_',' '),row.total])tr.insertCell().textContent=value;}
      status.textContent=rows.length?'Report updated.':'No opt-in events in this period.';
    }catch(e){status.textContent=e.message;}finally{period.disabled=false;}
  }
  period.onchange=load;await load();
}
async function settings(){
  const palette=$('#palette'),featured=$('#featured'),metrics=$('#metrics-enabled'),save=$('#save-settings');
  let revision;
  async function load(){
    save.disabled=true;
    try{
      const [row]=await request('site_preferences?id=eq.true');
      palette.value=row.palette;featured.value=row.featured;metrics.checked=row.metrics_enabled;revision=row.revision;save.disabled=false;status.textContent='Current site settings loaded.';
    }catch(e){status.textContent=e.message;}
  }
  save.onclick=async()=>{
    save.disabled=true;$('#reload-settings').disabled=true;
    try{
      const rows=await request('site_preferences?id=eq.true&revision=eq.'+revision,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({palette:palette.value,featured:featured.value,metrics_enabled:metrics.checked,revision:revision+1})});
      if(!rows.length){status.textContent='Settings changed in another tab. Reload before saving.';return;}
      revision=rows[0].revision;save.disabled=false;status.textContent='Site settings saved.';
    }catch(e){status.textContent=e.message;save.disabled=false;}finally{$('#reload-settings').disabled=false;}
  };
  $('#reload-settings').onclick=load;await load();
}
try{
  if(!await request('rpc/can_edit_site',{method:'POST'}))throw Error('This account does not have site editor access.');
  $('#account').hidden=true;
  const loadingLibrary=document.body.dataset.admin==='library';
  $('#private').hidden=loadingLibrary;
  status.textContent=loadingLibrary?'Loading the content studio…':'Signed in as site editor.';
  if(['users','library','data','backups'].includes(document.body.dataset.admin)){
    const {setupManagement}=await import('./management.js');await setupManagement(document.body.dataset.admin,request);
    if(loadingLibrary)$('#private').hidden=false;
  }
  if(document.body.dataset.admin==='content')await editor();
  if(document.body.dataset.admin==='settings')await settings();
  if(document.body.dataset.admin==='metrics')await metrics();
}catch(e){status.textContent=e.message;}
