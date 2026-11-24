const $ = selector => document.querySelector(selector);
const state = message => { $('#status').textContent = message; };
function download(name, data) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='imon-'+name+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function control(selector, handler) {
  const el=$(selector);
  el.addEventListener(el.tagName==='FORM'?'submit':'click',async event=>{
    event.preventDefault();
    if(el.dataset.busy)return;
    el.dataset.busy='yes';
    try { await handler(event); } catch(error) { state(error.message); }
    finally { delete el.dataset.busy; }
  });
}
function confirmInput(input,button,test) {
  const update=()=>{$(button).disabled=!test();};
  $(input).oninput=update;update();
  return update;
}
export async function setupManagement(page,request) {
  const rpc=(op,args={})=>request('rpc/manage_site',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,args})});
  async function all(path,fields) {
    const rows=[];
    for(let offset=0;;offset+=500){
      const part=await request(path+'?select='+fields+'&order=day.desc,'+(path==='usage_daily'?'page,event':'audience')+'&limit=500&offset='+offset);
      rows.push(...part);if(part.length<500)return rows;
    }
  }
  if(page==='users'){
    let offset=0,selected=null;
    const refreshDelete=confirmInput('#confirm-email','#delete-member',()=>selected && !selected.protected && $('#confirm-email').value===selected.email);
    async function select(row) {
      selected=row;$('#email').value=row.email;$('#name').value=row.name||'';$('#confirm-email').value='';refreshDelete();
      const details=$('#details');details.replaceChildren();
      const progress=await rpc('results',{email:row.email});
      if(selected!==row)return;
      for(const [key,course] of Object.entries({'imon-lab-progress-v1':'Code Lab','imon-ai-lab-v1':'AI Lab','imon-circuits-v1':'Circuits','imon-systems-v1':'Systems Lab'})){
        const line=document.createElement('p');line.textContent=course+' · '+progress[key].solved+' solved · quiz '+(progress[key].quiz??'unattempted');details.append(line);
      }
    }
    async function search() {
      const rows=await rpc('users',{query:$('#query').value,offset});$('tbody').replaceChildren();
      for(const row of rows){
        const tr=$('tbody').insertRow();
        for(const val of [[row.name,row.email].filter(Boolean).join(' · '),row.protected?'Owner':row.state,
          'Last sign-in '+(row.last_sign_in?.slice(0,10)||'—')+' · Last save '+(row.last_save?.slice(0,10)||'—')])tr.insertCell().textContent=val;
        const open=document.createElement('button');open.textContent='Select';open.onclick=()=>select(row).catch(e=>state(e.message));tr.insertCell().append(open);
      }
      $('#previous').disabled=offset===0;$('#more').disabled=rows.length<30;
      state(rows.length+' members on this page.');
    }
    control('#search-form',()=>{offset=0;return search();});
    control('#previous',()=>{offset=Math.max(0,offset-30);return search();});
    control('#more',()=>{offset+=30;return search();});
    control('#member',async event=>{await rpc(event.submitter.value,{email:$('#email').value,name:$('#name').value});await search();state('Member saved.');});
    control('#delete-member',async()=>{if(!selected)return;await rpc('delete-user',{email:selected.email,confirm:$('#confirm-email').value});selected=null;$('#details').replaceChildren();$('#member').reset();$('#confirm-email').value='';refreshDelete();await search();state('Member deleted.');});
    await search();
  } else if(page==='data'){
    async function storage(){
      const data=await rpc('storage'), list=$('#tables');
      $('#size').textContent='Database '+(data.databaseBytes/1048576).toFixed(2)+' MiB · '+data.buckets+' file buckets · '+data.objects+' objects · '+(data.fileBytes/1048576).toFixed(2)+' MiB of files.';
      const ul=document.createElement('ul');
      for(const tab of data.tables){const li=document.createElement('li');li.textContent=tab.name+' · '+(tab.bytes/1024).toFixed(1)+' KiB';ul.append(li);}
      list.replaceChildren(ul);state('Storage report loaded.');
    }
    control('#reload',storage);
    control('#export-metrics',async()=>{const [usage,audience]=await Promise.all([all('usage_daily','day,page,event,total'),all('audience_daily','day,audience,total')]);download('usage',{usage,audience});state('Usage export downloaded.');});
    control('#export-audit',async()=>{const rows=[];for(let offset=0;;offset+=100){const batch=await rpc('logs',{offset});rows.push(...batch);if(batch.length<100)break;}download('management-log',rows);state('Management log downloaded.');});
    const today=new Date().toISOString().slice(0,10);$('#cutoff').max=today;
    const ready=confirmInput('#confirm-date','#purge',()=>$('#cutoff').value && $('#cutoff').value<=today && $('#confirm-date').value===$('#cutoff').value);
    $('#cutoff').oninput=ready;
    control('#purge',async()=>{await rpc('prune',{type:$('#log-type').value,before:$('#cutoff').value,confirm:$('#confirm-date').value});$('#confirm-date').value='';ready();state('Selected logs cleared before the cutoff.');});
    await storage();
  } else if(page==='backups'){
    let uploaded=null, previewVersion=null;
    const restoreReady=confirmInput('#confirm-restore','#restore',()=>uploaded && previewVersion && $('#confirm-restore').value==='RESTORE SITE CONTENT');
    const resetReady=confirmInput('#confirm-reset','#reset',()=>$('#confirm-reset').value==='RESET SITE CONTENT');
    control('#download',async()=>{const data=await rpc('snapshot');download('site-snapshot',data.snapshot);state('Site snapshot downloaded.');});
    $('#file').onchange=async()=>{
      uploaded=null;previewVersion=null;restoreReady();
      try{
        const file=$('#file').files[0];if(!file || file.size>5000000)throw Error('Choose a site snapshot under 5 MB.');
        const doc=JSON.parse(await file.text());
        if(doc.format!=='imon-site-v1'||!Array.isArray(doc.items)||!Array.isArray(doc.notices)||!doc.preferences)throw Error('Invalid site snapshot.');
        const current=await rpc('snapshot');
        uploaded=doc;previewVersion=current.version;
        $('#preview').textContent='Replace '+current.snapshot.items.length+' current library items with '+doc.items.length+' from the snapshot. Restore '+doc.notices.length+' notices and the saved preferences.';
      }catch(e){$('#preview').textContent=e.message;}restoreReady();
    };
    for(const op of ['restore','reset'])control('#'+op,async()=>{
      const current=await rpc('snapshot');
      if(new Blob([JSON.stringify(current.snapshot,null,2)]).size>5000000)throw Error('The safe restore limit is 5 MB. Download the snapshot and archive individual library items before replacing site content.');
      if(op==='restore' && current.version!==previewVersion)throw Error('Site changed. Choose the backup file again to refresh the preview.');
      download('before-'+op,current.snapshot);
      await rpc(op,{snapshot:op==='restore'?uploaded:undefined,version:current.version,confirm:$('#confirm-'+op).value});
      $('#confirm-restore').value=$('#confirm-reset').value='';$('#file').value='';uploaded=null;previewVersion=null;restoreReady();resetReady();$('#preview').textContent='Choose a file to preview its contents.';state(op==='reset'?'Editable site content reset.':'Site snapshot restored.');
    });
  } else if(page==='library'){
    let revision=0,slug='',items=[];
    const removeReady=confirmInput('#confirm-slug','#delete-item',()=>slug && $('#confirm-slug').value===slug);
    function addLesson(item={}){
      const block=document.createElement('fieldset');
      for(const [key,label,max] of [['title','Lesson title',120],['body','Study material',12000],['question','Practice question (optional)',500],['answer','Expected short answer',400]]){
        const caption=document.createElement('label'),field=document.createElement(key==='body'?'textarea':'input');
        caption.textContent=label;field.dataset.field=key;field.maxLength=max;field.value=item[key]||'';field.required=['title','body'].includes(key);caption.append(field);block.append(caption);
      }
      const rm=document.createElement('button');rm.type='button';rm.textContent='Remove lesson';rm.onclick=()=>{if($('#lessons').childElementCount>1)block.remove();else state('An item needs at least one lesson.');};block.append(rm);$('#lessons').append(block);
    }
    function open(row){
      revision=row?.revision||0;slug=row?.slug||'';$('#slug').value=slug;$('#slug').readOnly=!!slug;
      for(const key of ['kind','title','summary'])$('#'+key).value=row?.[key]||(key==='kind'?'course':'');
      $('#published').checked=!!row?.published;$('#lessons').replaceChildren();(row?.lessons||[{}]).forEach(addLesson);
      $('#view').hidden=!row?.published;$('#view').href='../../library.html?item='+encodeURIComponent(slug);
      $('#confirm-slug').value='';removeReady();
    }
    async function load(id=''){
      items=[];
      for(let offset=0;;offset+=100){const batch=await request('library_items?select=*&order=slug&limit=100&offset='+offset);items.push(...batch);if(batch.length<100)break;}
      $('#items').replaceChildren(new Option('Create new',''),...items.map(r=>new Option(r.title+(r.published?' · published':' · draft'),r.slug)));
      $('#items').value=id;open(items.find(r=>r.slug===id));state('Content studio ready.');
    }
    $('#items').onchange=()=>open(items.find(r=>r.slug===$('#items').value));
    $('#add-lesson').onclick=()=>{if($('#lessons').childElementCount<40)addLesson();};
    control('#author',async()=>{
      const lessons=[...$('#lessons').children].map(block=>Object.fromEntries([...block.querySelectorAll('[data-field]')].map(f=>[f.dataset.field,f.value.trim()])));
      const key=$('#slug').value;
      await rpc('save-item',{slug:key,revision,item:{kind:$('#kind').value,title:$('#title').value.trim(),summary:$('#summary').value.trim(),published:$('#published').checked,lessons}});
      await load(key);state('Saved revision '+revision+( $('#published').checked?' · published.':' · draft.'));
    });
    control('#delete-item',async()=>{await rpc('delete-item',{slug,revision,confirm:$('#confirm-slug').value});await load();state('Item deleted.');});
    await load();
  }
}
