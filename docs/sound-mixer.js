/** Visitor-selected recorded and synthesized sound layers. Selecting a layer never enables audio. */
const STORAGE_KEY='imon-sound-layers-v1';
const SOURCES=[
 ['weather','☁','Follow weather','Match precipitation, wind and thunder to the current sky.'],
 ['camp','♨','Campfire ASMR','Wood fire, woodland ambience and occasional owl calls at Jungle Campfire.'],
 ['rain','☂','Rain','A soft, steady rainfall.'],
 ['wind','≋','Wind','Air moving through the trees.'],
 ['water','≈','Flowing water','A gentle stream and water texture.'],
 ['birds','♪','Birds','Small, spaced daytime chirps.'],
 ['crickets','✦','Crickets','A quiet evening chorus.'],
 ['music','♫','Ambient music','Slow, synthesized musical notes.']
];
const DEFAULT_LAYERS={camp:true,weather:true,rain:false,wind:false,water:false,birds:false,crickets:true,music:false};
const read=()=>{try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY));if(!value||typeof value!=='object'||Array.isArray(value))return {...DEFAULT_LAYERS};return Object.fromEntries(SOURCES.map(([key])=>[key,(value[key] ?? DEFAULT_LAYERS[key])===true]));}catch{return {...DEFAULT_LAYERS};}};
const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
export function initSoundMixer(ambient){
 if(!ambient||document.getElementById('sound-mixer-dialog'))return;
 let layers=read(),opener=null,oldOverflow='',unlocked=false;
 ambient.setLayers(layers);
 const dialog=document.createElement('dialog');dialog.id='sound-mixer-dialog';dialog.className='sound-mixer-dialog';dialog.setAttribute('aria-labelledby','sound-mixer-title');
 dialog.innerHTML=`<div class="sound-mixer-shell"><header class="sound-mixer-header"><div><span class="sound-mixer-kicker">IMON · SOUND STUDIO</span><h2 id="sound-mixer-title">Find your quiet.</h2><p>Choose a few sounds. Make them yours.</p></div><button type="button" class="sound-mixer-close" aria-label="Close sound mixer">×</button></header><div class="sound-mixer-status"><span class="sound-mixer-dot" aria-hidden="true"></span><strong role="status" class="sound-mixer-state">MASTER MUTED</strong><span class="sound-mixer-count">1 selected</span></div><fieldset class="sound-mixer-sources"><legend>Mix any combination of sounds</legend>${SOURCES.map(([key,icon,name,description])=>`<label class="sound-mixer-source" data-source="${key}"><input type="checkbox" name="sound-layer" value="${key}" ${layers[key]?'checked':''}><span class="sound-source-icon" aria-hidden="true">${icon}</span><span class="sound-source-copy"><strong>${name}</strong><small>${description}</small></span><span class="sound-source-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></label>`).join('')}</fieldset><div class="sound-mixer-volume"><label for="sound-mixer-volume">MASTER VOLUME <output id="sound-mixer-volume-value">35%</output></label><input id="sound-mixer-volume" type="range" min="0" max="1" step="0.05" value="0.35"></div><p class="sound-mixer-note">Turn on ambience to hear your selected layers. Jungle Campfire mixes wood fire and woodland recordings.</p><div class="sound-mixer-actions"><button type="button" class="sound-mixer-play">▶ PLAY SELECTED</button><button type="button" class="sound-mixer-mute">Ⅱ MUTE MASTER</button></div><a href="tools/#sounds" class="sound-library-link">Game sound library →</a> <a href="sounds/" class="sound-library-link">Field recordings →</a><p class="sound-mixer-tip">Mixing sounds changes the ambience only. Game sound effects have their own switch.</p></div>`;
 document.body.append(dialog);const q=selector=>dialog.querySelector(selector),triggers=[];
 function sync(){
   const current=ambient.getLayers();if(current&&typeof current==='object')layers=Object.fromEntries(SOURCES.map(([key])=>[key,current[key]===true]));
   const count=Object.values(layers).filter(Boolean).length,enabled=ambient.isEnabled();
   dialog.dataset.playing=enabled&&count>0?'true':'false';
   q('.sound-mixer-state').textContent=enabled?(count?'AMBIENCE ON':'NO LAYERS SELECTED'):'MASTER MUTED';
   q('.sound-mixer-count').textContent=`${count} selected`;
   q('.sound-mixer-play').disabled=count===0;q('.sound-mixer-play').textContent=enabled?'▶ PLAYING SELECTED':'▶ PLAY SELECTED';
   q('.sound-mixer-mute').disabled=!enabled;
   for(const input of dialog.querySelectorAll('[name="sound-layer"]')){input.checked=layers[input.value];input.closest('.sound-mixer-source').classList.toggle('selected',input.checked);}
   const volume=Math.min(1,Math.max(0,Number(ambient.getVolume())||0));q('#sound-mixer-volume').value=String(volume);q('#sound-mixer-volume-value').textContent=`${Math.round(volume*100)}%`;
   radio.textContent=enabled&&layers.music&&layers.wind&&layers.water?'Mute coastal radio':'Play coastal radio';
   triggers.forEach(button=>{button.dataset.playing=enabled?'true':'false';button.title=enabled?'Manage your playing sound layers':'Choose ambience layers; master is muted';});
 }
 function open(){if(dialog.open)return;opener=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';sync();dialog.showModal();q('.sound-mixer-close').focus({preventScroll:true});}
 function addTrigger(target,placement){if(!target)return;const button=document.createElement('button');button.type='button';button.className='sound-mixer-trigger';button.innerHTML='<span aria-hidden="true">♫</span> Sound mixer';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','sound-mixer-dialog');button.addEventListener('click',open);if(placement==='after')target.after(button);else target.append(button);triggers.push(button);}
 addTrigger(document.getElementById('ambient-toggle'),'after');addTrigger(document.querySelector('.weather-deck-tools'),'append');
 const radio=document.createElement('button');
 radio.type='button';radio.className='coastal-radio';radio.textContent='Play coastal radio';
 document.getElementById('ambient-toggle')?.after(radio);
 radio.addEventListener('click',async()=>{
   if(ambient.isEnabled() && layers.music && layers.wind && layers.water){
     ambient.setEnabled(false);write('imon-ambient-v2','off');
   }else{
     layers={...layers,music:true,wind:true,water:true,crickets:false};
     write(STORAGE_KEY,JSON.stringify(layers));ambient.setLayers(layers);
     ambient.setEnabled(true);write('imon-ambient-v2','on');
     unlocked=await ambient.unlock();
   }
   sync();
 });
 q('.sound-mixer-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
 dialog.addEventListener('change',event=>{if(event.target.name!=='sound-layer')return;layers={...layers,[event.target.value]:event.target.checked};write(STORAGE_KEY,JSON.stringify(layers));ambient.setLayers(layers);sync();});
 q('#sound-mixer-volume').addEventListener('input',event=>{const volume=Number(event.target.value);ambient.setVolume(volume);write('imon-ambient-volume',String(volume));sync();});
 q('.sound-mixer-play').addEventListener('click',async()=>{if(!Object.values(layers).some(Boolean))return;ambient.setEnabled(true);write('imon-ambient-v2','on');sync();unlocked=await ambient.unlock();if(!unlocked&&ambient.isEnabled())q('.sound-mixer-state').textContent='TAP PLAY TO RESUME';});
 q('.sound-mixer-mute').addEventListener('click',()=>{ambient.setEnabled(false);write('imon-ambient-v2','off');sync();});
 document.addEventListener('imon:ambient',event=>{unlocked=Boolean(event.detail?.unlocked);sync();});
 sync();return {open,close:()=>dialog.close()};
}
