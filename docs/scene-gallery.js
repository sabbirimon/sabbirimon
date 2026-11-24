const landscapeNames = {
  'riverbend-mills':'Riverbend Mills','energy-ridge':'Energy Ridge', islands:'Floating Islands',
  forest:'Woodland', beach:'Ocean Shore', desert:'Canyon Desert', mountains:'Alpine Peaks',
  city:'Metro City', sakura:'Cherry Grove', cave:'Crystal Cavern', space:'Outer Space', cyberpunk:'Cyberpunk City'
};
const perPage = 6;

export function setSceneCover(element, index, total) {
  // Each captured animation frame occupies a separate four-column sheet.
  const rows = Math.ceil(total / 4), row = Math.floor(index / 4);
  element.style.setProperty('--cover-x', (index % 4) * 100 / 3 + '%');
  for (let frame=0; frame<3; frame++) {
    element.style.setProperty('--cover-y'+frame,(row+rows*frame)*100/(rows*3-1)+'%');
  }
  element.style.setProperty('--sheet-height',rows*3*100+'%');
}

export function initSceneGallery({ presets, scenes, art, phases, weatherNames, canvas, select, showStudio, toggleMotion }) {
  const gallery = document.querySelector('#worlds');
  if (!gallery?.querySelector('.scene-cards')) return null;
  const get = selector => gallery.querySelector(selector);
  const search = get('#scene-query'), family = get('#scene-family'), phase = get('#scene-phase');
  const cards = get('.scene-cards'), nav = get('.scene-navigation');
  const name = id => art[id]?.name || landscapeNames[id] || id;
  for (const scene of scenes) family.add(new Option(name(scene),scene));
  for (const [key,label] of Object.entries(phases)) phase.add(new Option(label,key));
  const dialog = document.createElement('dialog');
  dialog.className = 'landscape-viewer';
  dialog.setAttribute('aria-labelledby','viewing-scene-name');
  dialog.innerHTML = `<div class="viewer-stage"></div><header><div><h2 id="viewing-scene-name"></h2><p class="viewer-weather"></p></div><button type="button" data-scene-close autofocus>Close ×</button></header>
    <div class="viewer-controls"><button type="button" data-scene-prev aria-label="Previous scenario">◀</button><button type="button" data-view-motion>Pause animation</button><button type="button" data-scene-forward aria-label="Next scenario">▶</button></div>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.viewer-stage'), landscape = canvas.parentElement;
  const home = document.createComment('landscape position');
  landscape.before(home);
  let selected = -1, page = 0, showAll = false, filtered = [], opener, beforeOverflow;

  const items = presets.map((p,index) => {
    const link = document.createElement('a');
    link.className = 'scene-card';
    link.href = '?' + new URLSearchParams({scene:p.scene,phase:p.phase,weather:p.weather,view:'scenery'}) + '#scene-stage';
    link.dataset.sceneIndex = index;
    const thumb = document.createElement('span');
    thumb.className = 'scene-cover'; thumb.setAttribute('aria-hidden','true');
    setSceneCover(thumb,index,presets.length);
    const title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = p.name; detail.textContent = phases[p.phase] + ' · ' + weatherNames[p.weather];
    link.append(thumb,title,detail);
    return {link, index, p, keywords:[p.name,name(p.scene),phases[p.phase],weatherNames[p.weather]].join(' ').toLowerCase()};
  });
  cards.append(...items.map(item=>item.link));
  function render() {
    const text=search.value.trim().toLowerCase();
    filtered=items.filter(({p,keywords})=>(!family.value||p.scene===family.value) && (!phase.value||p.phase===phase.value) && keywords.includes(text));
    const pages=Math.ceil(filtered.length/perPage);
    page=Math.max(0,Math.min(page,pages-1));
    const visible=new Set(showAll?filtered:filtered.slice(page*perPage,(page+1)*perPage));
    for(const item of items) item.link.hidden=!visible.has(item);
    get('#scene-count').textContent=filtered.length ? filtered.length + (filtered.length===1?' scenario':' scenarios') : 'No matching scenarios. Try another search or landscape.';
    nav.hidden=pages<2;
    get('[data-scene-back]').disabled=showAll||page===0;
    get('[data-scene-next]').disabled=showAll||page+1>=pages;
    get('[data-scene-page]').textContent=showAll?'':(page+1)+' / '+pages;
    get('[data-scene-all]').textContent=showAll?'Show fewer':'Show all '+filtered.length;
    get('[data-scene-all]').setAttribute('aria-expanded',String(showAll));
  }
  for(const el of [search,family,phase]) el.addEventListener(el===search?'input':'change',()=>{page=0;showAll=false;render();});
  get('[data-scene-back]').onclick=()=>{page--;render();};
  get('[data-scene-next]').onclick=()=>{page++;render();};
  get('[data-scene-all]').onclick=()=>{showAll=!showAll;page=0;render();};
  get('.scene-studio').onclick=showStudio;
  function open(button) {
    if(dialog.open) return;
    opener=button;
    beforeOverflow=document.body.style.overflow;
    dialog.showModal();
    stage.append(landscape);
    document.body.style.overflow='hidden';
  }
  cards.addEventListener('click',event=>{
    const link=event.target.closest('[data-scene-index]');
    if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();select(Number(link.dataset.sceneIndex));open(link);
  });
  document.querySelector('[data-view-scene]')?.addEventListener('click',event=>open(event.currentTarget));
  dialog.querySelector('[data-scene-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    home.after(landscape);
    document.body.style.overflow=beforeOverflow;
    const url=new URL(window.location.href);
    if(url.searchParams.get('view')==='scenery') {
      url.searchParams.delete('view'); history.replaceState(null,'',url);
    }
    opener?.focus({preventScroll:true});
  });
  function advance(direction) {
    const list=filtered.length?filtered:items;
    const position=list.findIndex(item=>item.index===selected);
    const next = position < 0 ? (direction > 0 ? 0 : list.length-1) : (position+direction+list.length)%list.length;
    select(list[next].index);
  }
  dialog.querySelector('[data-scene-prev]').onclick=()=>advance(-1);
  dialog.querySelector('[data-scene-forward]').onclick=()=>advance(1);
  dialog.querySelector('[data-view-motion]').onclick=toggleMotion;
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1);}
  });
  render();
  if(new URLSearchParams(window.location.search).get('view')==='scenery') {
    requestAnimationFrame(()=>open(document.querySelector('[data-view-scene]')));
  }
  return {sync(state,moving){
    selected=presets.findIndex(p=>p.scene===state.scene && p.phase===state.phase && p.weather===state.weather);
    const title=presets[selected]?.name||name(state.scene);
    dialog.querySelector('h2').textContent=title;
    dialog.querySelector('.viewer-weather').textContent=phases[state.phase]+' · '+weatherNames[state.weather];
    dialog.querySelector('[data-view-motion]').textContent=moving?'Pause animation':'Resume animation';
    for(const item of items) {
      if(item.index===selected) item.link.setAttribute('aria-current','true');
      else item.link.removeAttribute('aria-current');
    }
  }};
}
