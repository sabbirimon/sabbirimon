import { WEATHER_CARDS, weatherIcon } from './weather-icons.js';
import { initSoundMixer } from './sound-mixer.js';
import { initWorld, WORLD_ART } from './world.js';
import { initWeather, WEATHER_TYPES } from './weather.js';
import { initAmbient } from './ambient.js';
import { initLocalContext, phaseForHour } from './local-context.js';
import { playSound, setSound, isSoundEnabled } from './audio.js';

const SCENES=['riverbend-mills','neon-coast','energy-ridge','waterfall-valley','twilight-lake','neon-forest','islands','forest','beach','desert','mountains','city','sakura','cave','space','cyberpunk'];
const LIVE_SCENES={morning:['waterfall-valley','twilight-lake'],daylight:['waterfall-valley','neon-forest'],sunset:['twilight-lake','neon-forest','waterfall-valley'],twilight:['neon-forest','twilight-lake']};
const PHASES={morning:'Morning',daylight:'Daylight',sunset:'Sunset',twilight:'Night'};
const NAMES={clear:'Clear / calm','glass-rain':'Rain on glass','glass-fog':'Fogged glass',cloudy:'Cloudy',drizzle:'Light rain',rain:'Medium rain','heavy-rain':'Heavy rain',lightning:'Lightning',storm:'Thunderstorm','light-snow':'Light snow',snow:'Medium snow','heavy-snow':'Heavy snow',blizzard:'Blizzard',fog:'Fog',wind:'Wind',hail:'Hailstorm',stars:'Starlight',sandstorm:'Sandstorm',cyclone:'Cyclone',flood:'Rising water',earthquake:'Pixel earthquake',aurora:'Aurora',meteors:'Meteor shower',fireflies:'Fireflies',leaves:'Falling leaves'};
export const WORLD_PRESETS=[
 ['Riverbend Mills','riverbend-mills','daylight','wind'],['Mist at the Watermill','riverbend-mills','morning','fog'],
 ['Neon Coast Drive','neon-coast','sunset','clear'],['Coastal Midnight Rain','neon-coast','twilight','drizzle'],
 ['Solar Valley','energy-ridge','daylight','wind'],['Fusion After Dark','energy-ridge','twilight','aurora'],['Metro Aftershock','city','twilight','earthquake'],['Neon Express','cyberpunk','twilight','glass-rain'],
 ['Valley Awakens','waterfall-valley','morning','clear'],['Waterfall Wanderer','waterfall-valley','daylight','wind'],['Misty Cascades','waterfall-valley','morning','fog'],
 ['Lake at Dusk','twilight-lake','sunset','clear'],['Firefly Reflections','twilight-lake','twilight','fireflies'],['Quiet Rainfall','twilight-lake','twilight','drizzle'],
 ['Neon Sanctuary','neon-forest','twilight','clear'],['Electric Rain','neon-forest','twilight','rain'],['Aurora Grove','neon-forest','twilight','aurora'],
 ['Morning Meadow','islands','morning','clear'],['Moonlit Isles','islands','twilight','fireflies'],['Golden Wanderer','islands','sunset','clear'],['Cloud Drifter','islands','daylight','wind'],
 ['Forest Dawn','forest','morning','fog'],['Firefly Forest','forest','twilight','fireflies'],['Woodland Rain','forest','daylight','drizzle'],['Autumn Walk','forest','sunset','leaves'],
 ['Ocean Escape','beach','daylight','clear'],['Deep Blue Tide','beach','twilight','flood'],['Sunset Shore','beach','sunset','wind'],['Dune Runner','desert','daylight','sandstorm'],
 ['Desert Stars','desert','twilight','meteors'],['Canyon Glow','desert','sunset','clear'],['Alpine Morning','mountains','morning','snow'],['Blizzard Cabin','mountains','twilight','blizzard'],
 ['Aurora Peaks','mountains','twilight','aurora'],['City After Hours','city','twilight','rain'],['City Sparks','city','sunset','hail'],['Cherry Blossom','sakura','morning','leaves'],
 ['Sakura Moon','sakura','twilight','fireflies'],['Crystal Cavern','cave','twilight','fog'],['Cosmic Drift','space','twilight','meteors'],['Neon Dystopia','cyberpunk','twilight','rain']
].map(([name,scene,phase,weather])=>({name,scene,phase,weather}));
const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const validHex=value=>/^#[0-9a-f]{6}$/i.test(value||'');
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
function blend(a,b,t){const aa=rgb(a),bb=rgb(b);return '#'+aa.map((v,i)=>Math.round(v*(1-t)+bb[i]*t).toString(16).padStart(2,'0')).join('');}
function luminance(hex){return rgb(hex).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
export function readableAccent(hex,background='#030719'){if(!validHex(hex))return '#b6a1ff';for(let i=0;i<=10;i++){const color=blend(hex,'#ffffff',i/10);if((luminance(color)+.05)/(luminance(background)+.05)>=4.5)return color;}return '#ffffff';}
function presetArt(p){
 if(WORLD_ART[p.scene])return `<img src="./art/${WORLD_ART[p.scene].file}.webp" alt="" loading="lazy" decoding="async" width="480" height="270" class="studio-landscape-art">`;
 const sky={morning:'#82bad2',daylight:'#237cbd',sunset:'#75445f',twilight:'#15152e'}[p.phase],ground=p.phase==='twilight'?'#28665b':'#557f68';
 let s=`<rect width="240" height="95" fill="${sky}"/><rect x="174" y="15" width="16" height="16" fill="${p.phase==='twilight'?'#d5d2f3':'#ffe5a0'}"/>`;
 if(p.phase==='twilight')for(let i=0;i<12;i++)s+=`<rect x="${(i*43+13)%240}" y="${(i*17+5)%60}" width="2" height="2" fill="#dfd6ee"/>`;
 if(p.scene==='riverbend-mills'){s+='<path d="M0 67L55 45L103 62L168 37L240 57V95H0Z" fill="#52765a"/><path d="M98 61Q175 68 120 80T94 95H39Q65 83 98 79T93 61Z" fill="#77cfd0"/><path d="M163 78L167 51H177L182 78Z" fill="#e7c99a"/><path d="M170 54L153 43M170 54L181 37M170 54L187 65M170 54L159 71" stroke="#f4dfb3" stroke-width="4"/><circle cx="134" cy="70" r="9" stroke="#d1a574" stroke-width="3" fill="#815a44"/>';}
 else if(p.scene==='energy-ridge'){s+='<path d="M0 77L54 40L108 69L164 44L240 76V95H0Z" fill="#467c70"/><path d="M20 68h55l-7 14H13Z" fill="#4b9fc8"/><ellipse cx="161" cy="66" rx="27" ry="10" fill="#222d50" stroke="#8dfbea" stroke-width="4"/>';}
 else if(p.scene==='city'||p.scene==='cyberpunk'){for(let i=0;i<8;i++){const h=25+(i*17)%43,x=i*33;s+=`<rect x="${x}" y="${95-h}" width="26" height="${h}" fill="${p.scene==='cyberpunk'?'#182442':'#29374e'}"/>`;for(let j=0;j<3;j++)s+=`<rect x="${x+5+j*6}" y="${102-h}" width="3" height="10" fill="${p.scene==='cyberpunk'?(i%2?'#fa72df':'#68ecf3'):'#ffd694'}"/>`;}}
 else if(p.scene==='space'){s+='<rect x="59" y="32" width="30" height="30" fill="#b09ce7"/><rect x="45" y="44" width="63" height="5" fill="#e5b4dc"/><rect x="165" y="64" width="35" height="8" fill="#b7d2dc"/><rect x="174" y="58" width="12" height="7" fill="#f6dc99"/>';}
 else if(p.scene==='cave'){s+='<path d="M0 0H240V35L217 21L202 54L186 19L165 36L145 15L121 50L102 20L76 33L50 15L30 50L0 24Z" fill="#363251"/><path d="M0 95V77L48 64L89 80L137 63L186 77L240 61V95Z" fill="#353751"/><rect x="74" y="61" width="8" height="21" fill="#7fdfd7"/><rect x="155" y="56" width="9" height="24" fill="#b49bea"/>';}
 else if(p.scene==='desert'){s+='<path d="M0 70L43 48L90 73L140 44L190 66L240 48V95H0Z" fill="#c69677"/><path d="M0 86L58 65L130 89L205 65L240 77V95H0Z" fill="#9f715f"/><rect x="179" y="45" width="6" height="31" fill="#69745d"/><rect x="170" y="56" width="20" height="5" fill="#69745d"/>';}
 else if(p.scene==='beach'){s+='<rect y="61" width="240" height="34" fill="#4fa8bd"/><rect y="83" width="240" height="12" fill="#dbc59b"/><rect x="13" y="70" width="45" height="2" fill="#c4eff0"/><rect x="104" y="77" width="64" height="2" fill="#b7e6e7"/><rect x="196" y="44" width="5" height="39" fill="#8a725e"/><rect x="177" y="39" width="42" height="9" fill="#587f73"/>';}
 else{ s+=`<path d="M0 77L47 36L83 69L135 30L189 72L240 43V95H0Z" fill="${p.scene==='mountains'?'#889caf':'#426d79'}"/>`;if(p.scene==='mountains')s+='<path d="M31 50L47 36L64 51L48 47Z M116 47L135 30L153 48L135 42Z" fill="#d5e5ed"/>';s+=`<rect y="79" width="240" height="16" fill="${ground}"/>`;if(p.scene==='islands')s+='<rect x="72" y="58" width="84" height="8" fill="#9fcba0"/><path d="M76 66H151L135 88H97Z" fill="#765a71"/>';else if(p.scene!=='mountains')for(let i=0;i<4;i++)s+=`<rect x="${19+i*66}" y="58" width="5" height="25" fill="#715e67"/><rect x="${7+i*66}" y="43" width="29" height="22" fill="${p.scene==='sakura'?'#dfa4ca':'#6da78a'}"/>`;}
 if(['rain','drizzle','hail','snow','blizzard'].includes(p.weather))for(let i=0;i<16;i++)s+=`<rect x="${(i*29+8)%240}" y="${(i*13+6)%85}" width="${p.weather==='snow'?2:1}" height="${p.weather==='rain'?7:2}" fill="#d4edee77"/>`;
 if(p.weather==='aurora')s+='<path d="M0 20L60 13L120 28L180 10L240 23V36L180 22L120 41L60 25L0 33Z" fill="#81eac64d"/>';
 return `<svg viewBox="0 0 240 95" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${s}</svg>`;
}

export function initExperience(){
 if(document.getElementById('world-studio'))return;
 const $=selector=>document.querySelector(selector),root=document.documentElement,canvas=$('#pixel-world');if(!canvas)return;
 const parent=$('.world-toolbar')||canvas.parentElement;
 function ensure(id,tag,label){let el=document.getElementById(id);if(!el){el=document.createElement(tag);el.id=id;if(tag==='button')el.type='button';el.textContent=label;parent.append(el);}return el;}
 const settingsButton=ensure('world-settings','button','World Studio'),cyberButton=ensure('cyber-mode','button','Cyberpunk'),clockLabel=ensure('visitor-time','span','Local time'),conditionsLabel=ensure('conditions','span','Checking weather…'),ambientButton=ensure('ambient-toggle','button','Ambient: off'),sfxButton=ensure('sfx-toggle','button','Game sound: off'),motionButton=ensure('motion-toggle','button','Motion: on');
 let prefs={};try{prefs=JSON.parse(read('imon-world-prefs-v1','{}'))||{};}catch{}
 if(read('imon-art-worlds-v2','')!=='ready'){if(!prefs.scene||prefs.scene==='islands')prefs.scene='waterfall-valley';write('imon-art-worlds-v2','ready');}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let wantsMotion=read('imon-motion',read('sabbir-motion','on'))!=='off';
 const state={mode:'live',rotorSpeed:Number.isFinite(prefs.rotorSpeed)?Math.max(0,Math.min(3,prefs.rotorSpeed)):1,autoScene:prefs.autoScene!==false,scene:SCENES.includes(prefs.scene)?prefs.scene:'waterfall-valley',phase:phaseForHour(new Date().getHours()),weather:'clear',intensity:['gentle','normal','vivid'].includes(prefs.intensity)?prefs.intensity:'vivid',density:Number(prefs.density)>=.25&&Number(prefs.density)<=2?Number(prefs.density):1,power:Number(prefs.power)>=.25&&Number(prefs.power)<=2?Number(prefs.power):1,minutes:[1,5,15,60].includes(prefs.minutes)?prefs.minutes:5,accent:validHex(prefs.accent)?prefs.accent:null,background:validHex(prefs.background)?prefs.background:null,cyber:false};
 if(state.autoScene)state.scene=LIVE_SCENES[state.phase][0];
 let rotationRemaining=state.minutes*60000,rotationDue=0;
 let livePhase=state.phase,liveWeather='clear',liveMeta={status:'unavailable',description:'Checking local weather…'},location={city:'',status:'loading',source:'browser'},coinCount=0,loopTimer=null,loopIndex=0,beforeCyber=null,localContext=null,oldOverflow='',opener=null;
 const toast=message=>document.dispatchEvent(new CustomEvent('imon:toast',{detail:message}));
 const ambient=initAmbient();ambient.setEnabled(read('imon-ambient-v2','off')==='on');
 const weather=initWeather({onThunder:delay=>ambient.thunder(delay),onHailImpact:size=>ambient.hailImpact(size)});
 const world=initWorld(canvas,{onCollect(count){coinCount=count;const counter=$('#coin-count');if(counter)counter.textContent=`${count} / 5`;const button=$('#collect-coin');if(button)button.setAttribute('aria-label',count===5?'Reset coin quest':`Collect a coin. ${count} of 5 found`);if(count){playSound(count===5?'win':'coin');toast(count===5?'QUEST COMPLETE! All five coins found.':`Coin found! ${count} of 5.`);}}});
 const dialog=document.createElement('dialog');dialog.id='world-studio';dialog.className='world-studio';dialog.setAttribute('aria-labelledby','world-studio-title');
 dialog.innerHTML=`<div class="studio-shell"><header class="studio-header"><div><span class="studio-eyebrow">IMON · YOUR LITTLE UNIVERSE</span><h2 id="world-studio-title">Weather & worlds</h2><p>A living pixel sky. Make it yours.</p></div><button type="button" class="studio-close" aria-label="Close World Studio">×</button></header><div class="studio-modes" role="group" aria-label="World mode"><button type="button" data-world-mode="live"><strong>Live</strong><span>Your time & weather</span></button><button type="button" data-world-mode="custom"><strong>Custom</strong><span>Make it your own</span></button><button type="button" data-world-mode="loop"><strong>Loop</strong><span>A changing collection</span></button></div><section class="studio-local"><div><span class="studio-live-dot" aria-hidden="true"></span><strong class="studio-clock"></strong><span class="studio-zone"></span></div><p class="studio-local-status">Checking local weather…</p><button type="button" class="studio-location">Use my location</button><small>Optional browser permission. Weather uses rounded coordinates.</small></section><div class="studio-weather-preview" aria-label="Animated weather preview"><span>LIVE ANIMATION PREVIEW</span></div><div class="studio-preview-tools"><button type="button" class="preview-motion">Pause animation</button><button type="button" class="preview-ambient">Music & ambience: off</button><label>Intensity <select class="preview-intensity"><option value="gentle">Gentle</option><option value="normal">Normal</option><option value="vivid">Vivid</option></select></label></div><div class="studio-controls"><label>Landscape<select id="studio-scene">${SCENES.map(s=>`<option value="${s}">${WORLD_ART[s]?.name||(s==='riverbend-mills'?'Riverbend Mills':s==='energy-ridge'?'Energy Ridge':s==='sakura'?'Cherry blossom':s==='cyberpunk'?'Cyberpunk':s[0].toUpperCase()+s.slice(1))}</option>`).join('')}</select></label><label for="studio-rotor-speed">Rotor speed <input id="studio-rotor-speed" type="range" min="0" max="3" step="0.1" value="1"><output for="studio-rotor-speed" id="studio-rotor-value">1.0×</output></label><label>Time of day<select id="studio-phase">${Object.entries(PHASES).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label><label>Atmosphere<select id="studio-weather">${WEATHER_TYPES.map(v=>`<option value="${v}">${NAMES[v]}</option>`).join('')}</select></label><label>Scenery changes every<select id="studio-period">${[1,5,15,60].map(v=>`<option value="${v}">${v===60?'1 hour':`${v} minute${v>1?'s':''}`}</option>`).join('')}</select></label></div><p class="studio-mode-note" aria-live="polite"></p><div class="studio-section-title"><h3>Pick a little escape</h3><span>${WORLD_PRESETS.length} PRESETS · ${SCENES.length} LANDSCAPES</span></div><div class="studio-presets">${WORLD_PRESETS.map((p,i)=>`<button type="button" class="studio-preset" data-preset="${i}" aria-pressed="false">${presetArt(p)}<strong>${p.name}</strong><span>${PHASES[p.phase]} · ${NAMES[p.weather]}</span></button>`).join('')}</div><p class="studio-art-note">Presets and custom effects are playful artwork. Storms, rising water, and tremors here are not real-world alerts.</p><div class="studio-bottom-grid"><section class="studio-panel"><h3>Make it your palette</h3><div class="studio-color-row"><label>Accent<input id="studio-accent" type="color" value="#b6a1ff"></label><label>Background<input id="studio-background" type="color" value="#030719"></label><button type="button" id="studio-reset-colors">Reset colors</button></div><p>Backgrounds stay dark and accents stay readable.</p></section><section class="studio-panel"><h3>Move the explorer</h3><div class="studio-explorer"><button type="button" data-explorer="left" aria-label="Move explorer left">←</button><button type="button" data-explorer="up" aria-label="Move explorer up">↑</button><button type="button" data-explorer="down" aria-label="Move explorer down">↓</button><button type="button" data-explorer="right" aria-label="Move explorer right">→</button><button type="button" data-explorer="reset">Reset</button></div><p>Drag the character in the landscape, or use these controls.</p></section></div><div class="studio-switches"><button type="button" class="studio-auto-scene" aria-pressed="true">Live auto scenery: on</button><button type="button" class="studio-motion"></button><button type="button" class="studio-ambient"></button><button type="button" class="studio-sfx"></button><button type="button" class="studio-cyber">CYBERPUNK MODE</button></div><p class="studio-audio-note">Music and ambience are off until you enable them. Game effects have their own switch.</p><footer class="studio-footer"><span>Live conditions are best-effort; your local clock always works.</span><span>Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Approximate location: <a href="https://ipapi.co/" target="_blank" rel="noopener noreferrer">ipapi</a></span></footer></div>`;
 dialog.querySelectorAll('.studio-landscape-art').forEach(image=>image.addEventListener('error',()=>{if(!image.dataset.fallback){image.dataset.fallback='true';image.src=image.src.replace(/\.webp$/,'.png');}}));
 document.body.append(dialog);const q=selector=>dialog.querySelector(selector);
 const weatherPreview=initWeather({mount:q('.studio-weather-preview'),id:'studio-weather-layer'});weatherPreview.setMotion(false);
 const gallery=document.createElement('section');gallery.className='world-quick-gallery';gallery.setAttribute('aria-label','Choose an illustrated world');gallery.innerHTML=`<div class="quick-world-intro"><span>YOUR NEXT ESCAPE</span><strong>A world for your mood.</strong><button type="button" class="quick-world-studio">ALL ${SCENES.length} LANDSCAPES ↗</button></div><div class="quick-world-choices">${Object.entries(WORLD_ART).map(([id,art])=>`<button type="button" data-quick-world="${id}" aria-pressed="false"><img src="./art/${art.file}.webp" alt="" loading="lazy" width="240" height="135"><span>${art.name}</span></button>`).join('')}</div>`;canvas.closest('.hero')?.after(gallery);
 gallery.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{if(!image.dataset.fallback){image.dataset.fallback='true';image.src=image.src.replace(/\.webp$/,'.png');}}));
 gallery.querySelectorAll('[data-quick-world]').forEach(button=>button.addEventListener('click',()=>{leaveCyber();state.autoScene=false;stopLoop();state.scene=button.dataset.quickWorld;if(state.mode==='loop'){state.mode='custom';stopLoop();}apply();playSound('click');}));gallery.querySelector('.quick-world-studio').addEventListener('click',showStudio);
 const quickWeather=document.createElement('section');quickWeather.className='quick-weather';quickWeather.setAttribute('aria-label','Weather control deck');quickWeather.innerHTML=`<div class="weather-deck-heading"><h2>Weather effects</h2><span class="weather-running" role="status"></span></div><div class="weather-choices" role="group" aria-label="Choose an animated effect">${WEATHER_CARDS.map(([id,label])=>`<button type="button" data-quick-weather="${id}" aria-pressed="false">${weatherIcon(id)}<span class="weather-name">${label}</span></button>`).join('')}</div><div class="weather-deck-tools"><button type="button" class="quick-motion">Pause animation</button><button type="button" class="quick-ambient">Music & ambience: off</button><label>Intensity <select class="quick-intensity"><option value="gentle">Gentle</option><option value="normal">Normal</option><option value="vivid">Vivid</option></select></label><button type="button" data-quick-weather="live" aria-pressed="true">↻ Local weather</button><button type="button" class="quick-weather-settings">All settings ↗</button></div>`;gallery.before(quickWeather);
 function resumeWeather(){if(!reduced.matches){setMotion(true);write('imon-motion','on');}}
 quickWeather.addEventListener('click',event=>{const button=event.target.closest('[data-quick-weather]');if(!button)return;const value=button.dataset.quickWeather;if(value==='live'){chooseMode('live');return;}leaveCyber();state.mode='custom';state.weather=value;if(value==='stars')state.phase='twilight';if(value==='earthquake'){state.scene='city';state.autoScene=false;}stopLoop();resumeWeather();apply();playSound('click');});
 quickWeather.querySelector('.quick-weather-settings').addEventListener('click',showStudio);
 const sliderMarkup='<label>Density <input data-weather-adjust="density" type="range" min="0.25" max="2" step="0.05" value="1"><output data-weather-value="density">100%</output></label><label>Strength <input data-weather-adjust="power" type="range" min="0.25" max="2" step="0.05" value="1"><output data-weather-value="power">100%</output></label><label>Sound volume <input data-ambient-volume type="range" min="0" max="1" step="0.05" value="0.35"><output class="ambient-volume-value">35%</output></label>';
 for(const host of [quickWeather,q('.studio-preview-tools')]){const sliders=document.createElement('div');sliders.className='weather-sliders';sliders.innerHTML=sliderMarkup;host.append(sliders);}
 let soundVolume=Math.max(0,Math.min(1,Number(read('imon-ambient-volume','0.35'))||0));
 ambient.setVolume(soundVolume);
 const dialogWorlds = new Map();
 function syncDialogWorld(entry) {
   const open = entry.dialog.open;
   if (!open) { entry.world.setMotion(false); return; }
   entry.world.setRotorSpeed(state.rotorSpeed); entry.world.setTheme(state.phase); entry.world.setScene(state.scene);
   entry.world.setMotion(wantsMotion && !reduced.matches);
 }
 function syncDialogWorlds() { for (const entry of dialogWorlds.values()) syncDialogWorld(entry); }
 function decorateGameDialog(gameDialog) {
   if (gameDialog === dialog || dialogWorlds.has(gameDialog)) return;
   if (!['arcade-modal','ludo-modal','puzzle-modal','imon-slots-dialog','racer-modal','quiz-modal'].includes(gameDialog.id)) return;
   const style = getComputedStyle(gameDialog);
   const panel = document.createElement('div'); panel.className = 'dialog-game-panel';
   panel.style.background = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#0b1026' : style.backgroundColor;
   panel.style.border = style.border; panel.style.borderRadius = style.borderRadius;
   panel.style.boxShadow = style.boxShadow; panel.style.padding = style.padding;
   while (gameDialog.firstChild) panel.append(gameDialog.firstChild);
   const scenery = document.createElement('div'); scenery.className = 'dialog-world-layer'; scenery.setAttribute('aria-hidden','true');
   const backdropCanvas = document.createElement('canvas'); backdropCanvas.className = 'dialog-world-canvas';
   const shade = document.createElement('div'); shade.className = 'dialog-world-shade';
   scenery.append(backdropCanvas, shade); gameDialog.append(scenery,panel);gameDialog.classList.add('scene-dialog');
   const backdropWorld = initWorld(backdropCanvas);backdropWorld.setMotion(false);backdropWorld.setTheme(state.phase);backdropWorld.setScene(state.scene);
   for (let i=0;i<5;i++) backdropWorld.collectNext();
   const entry = {dialog:gameDialog,world:backdropWorld};dialogWorlds.set(gameDialog,entry);syncDialogWorld(entry);
 }
 const dialogObserver = new MutationObserver(records => {
   for (const record of records) {
     if (record.type === 'attributes' && record.target.tagName === 'DIALOG') {
       decorateGameDialog(record.target);const entry=dialogWorlds.get(record.target);if(entry)syncDialogWorld(entry);
     } else for (const node of record.addedNodes) {
       if (node.nodeType !== 1) continue;
       if (node.matches('dialog')) decorateGameDialog(node);
       else node.querySelectorAll('dialog').forEach(decorateGameDialog);
     }
   }
 });
 document.querySelectorAll('dialog').forEach(decorateGameDialog);
 dialogObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 function save(){if(state.cyber)return;write('imon-world-prefs-v1',JSON.stringify({scene:state.scene,rotorSpeed:state.rotorSpeed,autoScene:state.autoScene,minutes:state.minutes,intensity:state.intensity,density:state.density,power:state.power,accent:state.accent,background:state.background}));}
 function applyColors(){const bg=state.background?blend(state.background,'#030719',.84):'#030719';if(state.background){root.style.setProperty('--bg',bg);root.style.setProperty('--surface',blend(bg,'#ffffff',.04));root.style.setProperty('--line',blend(bg,'#ffffff',.16));}else for(const name of ['--bg','--surface','--line'])root.style.removeProperty(name);if(state.accent){const accent=readableAccent(state.accent,bg);root.style.setProperty('--accent',accent);root.style.setProperty('--accent-rgb',rgb(accent).join(','));}else{root.style.removeProperty('--accent');root.style.removeProperty('--accent-rgb');}}
 function weatherText(){if(location.status==='loading'||liveMeta.description==='Checking local weather…')return 'Checking local weather…';if(liveMeta.status==='unavailable')return `${location.city?`${location.city} · `:''}Weather unavailable · decorative ${livePhase==='twilight'?'fireflies':'wind'}`;return `${location.city||'Approximate area'} · ${liveMeta.description}${liveMeta.status==='cached'?' (cached)':''}`;}
 function syncConditions(){conditionsLabel.textContent=state.mode==='live'?weatherText():`${state.mode==='loop'?'Preset loop':'Custom world'} · ${PHASES[state.phase]} · ${NAMES[state.weather]}`;q('.studio-local-status').textContent=weatherText();}
 function syncSound(){const enabled=ambient.isEnabled();for(const el of [ambientButton,q('.studio-ambient'),q('.preview-ambient'),quickWeather.querySelector('.quick-ambient')]){el.textContent=`Ambience ${enabled?'on':'off'}`;el.setAttribute('aria-pressed',String(enabled));}const sfx=isSoundEnabled();for(const el of [sfxButton,q('.studio-sfx')]){el.textContent=`Game sound ${sfx?'on':'off'}`;el.setAttribute('aria-pressed',String(sfx));}}
 function sync(){
   q('#studio-rotor-speed').value=String(state.rotorSpeed);
   q('#studio-rotor-value').textContent=state.rotorSpeed===0?'Stopped':state.rotorSpeed.toFixed(1)+'×';
   const moving=wantsMotion&&!reduced.matches;
   document.body.dataset.weatherPower=String(state.power);
   for(const host of [quickWeather,dialog]){for(const key of ['density','power']){host.querySelector(`[data-weather-adjust="${key}"]`).value=String(state[key]);host.querySelector(`[data-weather-value="${key}"]`).textContent=Math.round(state[key]*100)+'%';}host.querySelector('[data-ambient-volume]').value=String(soundVolume);host.querySelector('.ambient-volume-value').textContent=Math.round(soundVolume*100)+'%';}
   quickWeather.dataset.moving=String(moving);
   quickWeather.querySelector('.weather-running').textContent=reduced.matches?'Still · device reduced motion':moving?'Animation playing':'Animation paused';
   for(const el of [quickWeather.querySelector('.quick-motion'),q('.preview-motion')]){el.textContent=reduced.matches?'Reduced motion':moving?'Ⅱ Pause animation':'▶ Play animation';el.setAttribute('aria-pressed',String(moving));}
 for(const el of [quickWeather.querySelector('.quick-intensity'),q('.preview-intensity')])el.value=state.intensity;
   q('.studio-weather-preview').style.backgroundImage=`linear-gradient(#06112633,#06112655),url('./art/${WORLD_ART[state.scene]?.file||'twilight-lake'}.webp')`;
   weatherPreview.setDensity(state.density);weatherPreview.setPower(state.power);weatherPreview.setIntensity(state.intensity);weatherPreview.setWeather(state.weather);weatherPreview.setMotion(dialog.open&&moving);
   quickWeather.querySelectorAll('[data-quick-weather]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.quickWeather==='live'?state.mode==='live':state.mode!=='live'&&button.dataset.quickWeather===state.weather)));gallery.querySelectorAll('[data-quick-world]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.quickWorld===state.scene)));dialog.querySelectorAll('[data-world-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.worldMode===state.mode)));q('#studio-scene').value=state.scene;q('#studio-phase').value=state.phase;q('#studio-weather').value=state.weather;q('#studio-period').value=String(state.minutes);q('#studio-period').disabled=state.mode!=='loop'&&!(state.mode==='live'&&state.autoScene);q('.studio-auto-scene').textContent=`Live auto scenery: ${state.autoScene?'on':'off'}`;q('.studio-auto-scene').setAttribute('aria-pressed',String(state.autoScene));q('#studio-accent').value=state.accent||({morning:'#b1d98d',daylight:'#9eda68',sunset:'#ffae8a',twilight:'#b6a1ff'}[state.phase]);q('#studio-background').value=state.background||'#030719';dialog.querySelectorAll('[data-preset]').forEach(b=>{const p=WORLD_PRESETS[Number(b.dataset.preset)];b.setAttribute('aria-pressed',String(p.scene===state.scene&&p.phase===state.phase&&p.weather===state.weather));});for(const b of [cyberButton,q('.studio-cyber')]){b.setAttribute('aria-pressed',String(state.cyber));b.textContent=state.cyber?'Cyberpunk on':'Cyberpunk mode';}q('.studio-mode-note').textContent=state.mode==='live'?(state.autoScene?`Live follows your local time and weather. Scenery changes every ${state.minutes===60?'hour':`${state.minutes} minute${state.minutes>1?'s':''}`}${!wantsMotion||reduced.matches?' (paused while motion is off)':''}.`:'Live follows your local time and weather. Your chosen scenery stays in place.'):state.mode==='loop'?`Worlds change every ${state.minutes===60?'hour':`${state.minutes} minute${state.minutes>1?'s':''}`}.`:'You choose the time and atmosphere. Return to Live whenever you like.';syncConditions();syncSound();document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===state.phase)));}
 function syncSceneLink(){try{const url=new URL(window.location.href);if(url.searchParams.has('scene')&&url.searchParams.get('scene')!==state.scene){url.searchParams.set('scene',state.scene);history.replaceState(null,'',url);}}catch{}}
 function apply(){syncSceneLink();root.dataset.theme=state.phase;root.dataset.scene=state.scene;document.body.dataset.worldMode=state.mode;world.setRotorSpeed(state.rotorSpeed);world.setTheme(state.phase);world.setScene(state.scene);weather.setDensity(state.density);weather.setPower(state.power);weather.setIntensity(state.intensity);weather.setWeather(state.weather);ambient.setScene(state.scene==='neon-forest'?'cyberpunk':state.scene==='twilight-lake'?'beach':state.scene);ambient.setWeather(state.weather);applyColors();sync();save();syncDialogWorlds();}
 function stopLoop(){if(loopTimer)clearTimeout(loopTimer);loopTimer=null;}
 function scheduleLoop(reset=true){
   if(loopTimer&&!reset)rotationRemaining=Math.max(1000,rotationDue-performance.now());
   stopLoop();if(reset)rotationRemaining=state.minutes*60000;
   if(document.hidden||!wantsMotion||reduced.matches||!(state.mode==='loop'||state.mode==='live'&&state.autoScene))return;
   rotationDue=performance.now()+rotationRemaining;
   loopTimer=setTimeout(()=>{
     loopTimer=null;
     if(state.mode==='live'&&state.autoScene){const scenes=LIVE_SCENES[livePhase];state.scene=scenes[(scenes.indexOf(state.scene)+1)%scenes.length];state.phase=livePhase;state.weather=liveWeather;}
     else if(state.mode==='loop'){loopIndex=(loopIndex+1)%WORLD_PRESETS.length;Object.assign(state,WORLD_PRESETS[loopIndex]);}
     apply();scheduleLoop();
   },rotationRemaining);
 }
 document.addEventListener('visibilitychange',()=>scheduleLoop(false));
 function leaveCyber(){if(state.cyber){state.cyber=false;beforeCyber=null;}}
 function chooseMode(mode){leaveCyber();state.mode=mode;if(mode==='live'){state.phase=livePhase;state.weather=liveWeather;if(state.autoScene)state.scene=LIVE_SCENES[livePhase][0];}if(mode==='loop'){const found=WORLD_PRESETS.findIndex(p=>p.scene===state.scene&&p.phase===state.phase&&p.weather===state.weather);loopIndex=found>=0?found:0;Object.assign(state,WORLD_PRESETS[loopIndex]);}scheduleLoop();apply();}
 function cyber(){if(state.cyber&&beforeCyber){const snapshot=beforeCyber;beforeCyber=null;Object.assign(state,snapshot.state);}else{beforeCyber={state:{...state}};Object.assign(state,{mode:'custom',scene:'cyberpunk',phase:'twilight',weather:'drizzle',intensity:'gentle',density:.45,power:.65,accent:'#66f4ff',background:'#120721',cyber:true});resumeWeather();}scheduleLoop();apply();toast(state.cyber?'NEON DYSTOPIA · Cyberpunk world online.':'Your previous world is back.');}
 function setMotion(value){wantsMotion=Boolean(value);const enabled=wantsMotion&&!reduced.matches;document.body.dataset.motion=enabled?'on':'off';root.style.scrollBehavior=enabled?'smooth':'auto';world.setMotion(enabled);weather.setMotion(enabled);for(const button of [motionButton,q('.studio-motion')]){button.textContent=`Motion: ${enabled?'on':reduced.matches?'reduced':'off'}`;button.setAttribute('aria-pressed',String(enabled));}document.dispatchEvent(new CustomEvent('imon:motion',{detail:{enabled}}));scheduleLoop(false);syncDialogWorlds();sync();}
 const toggleMotion=()=>{if(reduced.matches){toast('Your device prefers reduced motion. Animations stay still.');return;}setMotion(!wantsMotion);write('imon-motion',wantsMotion?'on':'off');};
 const toggleAmbient=()=>{ambient.setEnabled(!ambient.isEnabled());write('imon-ambient-v2',ambient.isEnabled()?'on':'off');syncSound();};
 const toggleSfx=()=>{setSound(!isSoundEnabled());syncSound();if(isSoundEnabled())playSound('coin');};
 function showStudio(){opener=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();sync();q('.studio-close').focus({preventScroll:true});}
 settingsButton.addEventListener('click',showStudio);q('.studio-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{weatherPreview.setMotion(false);document.body.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
 dialog.querySelectorAll('[data-world-mode]').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.worldMode)));
 q('#studio-rotor-speed').addEventListener('input',event=>{
   state.rotorSpeed=Number(event.target.value);
   world.setRotorSpeed(state.rotorSpeed);
   for(const entry of dialogWorlds.values())entry.world.setRotorSpeed(state.rotorSpeed);
   q('#studio-rotor-value').textContent=state.rotorSpeed===0?'Stopped':state.rotorSpeed.toFixed(1)+'×';
   save();
 });
 q('#studio-scene').addEventListener('change',event=>{leaveCyber();state.autoScene=false;stopLoop();state.scene=event.target.value;if(state.mode==='loop'){state.mode='custom';stopLoop();}apply();});
 for(const [id,key] of [['#studio-phase','phase'],['#studio-weather','weather']])q(id).addEventListener('change',event=>{leaveCyber();state.mode='custom';state[key]=event.target.value;if(key==='weather'&&state.weather==='earthquake'){state.scene='city';state.autoScene=false;}stopLoop();if(key==='weather')resumeWeather();apply();});
 q('.studio-auto-scene').addEventListener('click',()=>{leaveCyber();state.autoScene=!state.autoScene;if(state.autoScene){state.mode='live';state.phase=livePhase;state.weather=liveWeather;state.scene=LIVE_SCENES[livePhase][0];}scheduleLoop();apply();});
 q('#studio-period').addEventListener('change',event=>{state.minutes=Number(event.target.value);scheduleLoop();apply();});
 dialog.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{leaveCyber();loopIndex=Number(b.dataset.preset);Object.assign(state,WORLD_PRESETS[loopIndex],{mode:'custom',autoScene:false});stopLoop();apply();playSound('click');}));
 for(const [id,key] of [['#studio-accent','accent'],['#studio-background','background']])q(id).addEventListener('input',event=>{state[key]=event.target.value;applyColors();save();});
 q('#studio-reset-colors').addEventListener('click',()=>{state.accent=null;state.background=null;applyColors();sync();save();syncDialogWorlds();});
 dialog.querySelectorAll('[data-explorer]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.explorer==='reset')world.resetObjects();else{const [x,y]={left:[-9,0],right:[9,0],up:[0,-7],down:[0,7]}[b.dataset.explorer];world.nudgeExplorer(x,y);}}));
 for(const b of [cyberButton,q('.studio-cyber')])b.addEventListener('click',cyber);
 for(const b of [motionButton,q('.studio-motion'),q('.preview-motion'),quickWeather.querySelector('.quick-motion')])b.addEventListener('click',toggleMotion);
 for(const b of [ambientButton,q('.studio-ambient'),q('.preview-ambient'),quickWeather.querySelector('.quick-ambient')])b.addEventListener('click',toggleAmbient);
 for(const b of [sfxButton,q('.studio-sfx')])b.addEventListener('click',toggleSfx);
 document.addEventListener('imon:sound',syncSound);document.addEventListener('imon:ambient',()=>{soundVolume=ambient.getVolume();sync();});reduced.addEventListener('change',()=>setMotion(wantsMotion));
 $('#collect-coin')?.addEventListener('click',()=>coinCount>=5?world.resetCoins():world.collectNext());
 document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{leaveCyber();state.mode='custom';state.phase=b.dataset.themeChoice;stopLoop();apply();}));
 $('#auto-theme')?.addEventListener('click',()=>chooseMode(state.mode==='live'?'loop':'live'));
 q('.studio-location').addEventListener('click',async()=>{if(!localContext)return;const button=q('.studio-location');button.disabled=true;button.textContent='Locating…';const result=await localContext.locatePrecisely();button.disabled=false;button.textContent='Use my location';if(result.status==='unavailable')toast('Location unavailable. Your local clock still works.');});
 for(const host of [quickWeather,dialog]){
   host.querySelectorAll('[data-weather-adjust]').forEach(el=>el.addEventListener('input',()=>{state[el.dataset.weatherAdjust]=Number(el.value);apply();}));
   host.querySelector('[data-ambient-volume]').addEventListener('input',event=>{soundVolume=Number(event.target.value);ambient.setVolume(soundVolume);write('imon-ambient-volume',String(soundVolume));sync();});
 }
 for(const el of [quickWeather.querySelector('.quick-intensity'),q('.preview-intensity')])el.addEventListener('change',()=>{state.intensity=el.value;apply();});
 const unlock=event=>{if(!ambient.isEnabled()||!event.isTrusted||event.type==='keydown'&&['Shift','Control','Alt','Meta','Escape'].includes(event.key))return;void ambient.unlock().then(ok=>{if(ok){document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);}});};
 document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
 const initialQuery=new URLSearchParams(window.location.search);
 if(SCENES.includes(initialQuery.get('scene'))){state.scene=initialQuery.get('scene');state.autoScene=false;state.mode='custom';}
 if(Object.hasOwn(PHASES,initialQuery.get('phase'))){state.phase=initialQuery.get('phase');state.mode='custom';}
 world.setMotion(false);apply();setMotion(wantsMotion);
 if(initialQuery.get('world')==='cyberpunk')cyber();
 if(WEATHER_TYPES.includes(initialQuery.get('weather'))){state.mode='custom';state.weather=initialQuery.get('weather');apply();}
 void initLocalContext({onPhase(phase){const changed=phase!==livePhase;livePhase=phase;if(liveMeta.status==='unavailable'&&liveMeta.description!=='Checking local weather…')liveWeather=phase==='twilight'?'fireflies':'wind';if(state.mode==='live'){state.phase=phase;state.weather=liveWeather;if(changed&&state.autoScene&&wantsMotion&&!reduced.matches&&!document.hidden)state.scene=LIVE_SCENES[phase][0];apply();}},onWeather(value,meta){liveMeta=meta;liveWeather=meta.status==='unavailable'?(livePhase==='twilight'?'fireflies':'wind'):value;if(state.mode==='live'){state.weather=liveWeather;apply();}else syncConditions();},onLocation(value){location=value;syncConditions();},onClock({time,zone}){clockLabel.textContent=`${time} · ${zone.replaceAll('_',' ')}`;q('.studio-clock').textContent=time;q('.studio-zone').textContent=zone.replaceAll('_',' ');}}).then(controller=>{localContext=controller;});
 initSoundMixer(ambient);
 return{world,ambient,weather,showStudio,getState:()=>({...state}),setMode:chooseMode};
}
