import { CARTRIDGES, STAGES, newStage, step } from './games.js';
import { setSound, playSound, isSoundEnabled } from '../audio.js';

const el = id => document.getElementById(id);
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
const overlay=document.querySelector('.overlay'), cabinet=document.querySelector('.cabinet');
const keys={left:false,right:false,jump:false,fire:false};
// Preserve short touchscreen presses until the simulation has taken a step.
const tapped = new Set();
const mapped={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'fire'};
const themes=[['#112c36','#245250','#70dcac'],['#22253c','#454168','#bda3ff'],['#2a2134','#5f3c53','#f5b88c'],['#142639','#284765','#8bdcf4'],['#242838','#4b5149','#dddb88'],['#261b34','#573963','#ff9fb9']];
let state, game, mode='ready', best=0, frame=0, last=0, accumulator=0;
function readBest(){try{return Number(localStorage.getItem('imon-arcade-'+game))||0;}catch{return 0;}}
function hud(){
  el('stage').textContent='Stage '+state.level+' / '+STAGES;
  el('score').textContent='Score '+state.score;
  el('lives').textContent='Lives '+state.lives;
  el('best').textContent='Best '+best;
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function sprite(pattern,x,y,colors,scale=2){
  pattern.forEach((row,iy)=>[...row].forEach((c,ix)=>{if(colors[c])rect(x+ix*scale,y+iy*scale,scale,scale,colors[c]);}));
}
const pilot=['  aaa  ',' abbba ','  acc  ','  ddd a',' adddda','  ddd  ','  e e  ',' ee ee '];
const drone=['  a  a  ',' aaaaaa ','abbcc bba'.replace(' ',''),' aaaaaa ','  d  d  '];
const ship=['    a    ','   aba   ','   aca   ',' aacccaa ','abcccccba','  b d b  '];
function draw(){
  const s=state,p=s.player, [sky,shade,light]=themes[s.level-1];
  rect(0,0,640,360,sky);
  for(let i=0;i<56;i++)rect((i*127+13)%640,(i*71)%313,i%5===0?2:1,1,i%4===0?light:shade);
  if(game==='runner'){
    for(let i=0;i<18;i++){
      const x=i*43-(s.camera*.24)%43,h=37+(i*17)%50;
      rect(x,318-h,35,h,shade);rect(x+3,313-h,28,5,shade);
      for(let j=0;j<3;j++)rect(x+6+j*8,329-h,3,5,light);
    }
    ctx.save();ctx.translate(-Math.round(s.camera),0);
    rect(s.camera,318,642,42,'#172d38');rect(s.camera,318,642,4,light);
    for(const b of s.platforms){rect(b.x,b.y,b.w,8,shade);rect(b.x,b.y,b.w,3,light);rect(b.x+9,b.y+8,4,310-b.y,'#233847');}
    rect(s.end-35,243,9,75,shade);rect(s.end-35,243,26,14,s.bots.some(b=>b.boss)?'#fa948d':light);
    if(!s.grace || Math.floor(s.t*7)%2)sprite(pilot,p.x,p.y,{a:'#8be6cd',b:'#233447',c:'#f6be87',d:'#50849e',e:'#dceeda'},3);
  }else if(game==='breaker'){
    for(const brick of s.bricks){
      const color=['#ffb7a0','#f9cf8c','#98e5c8','#8acdef','#bfadf6','#edabda','#bad1ff'][brick.row];
      rect(brick.x,brick.y,brick.w,brick.h,color);rect(brick.x+2,brick.y+2,brick.w-4,2,'#ffffffa0');
      if(brick.hp>1)rect(brick.x+3,brick.y+6,brick.w-6,2,shade);
    }
    rect(p.x,p.y,p.w,p.h,light);rect(p.x+4,p.y+2,p.w-8,2,'#effafa');rect(s.ball.x,s.ball.y,8,8,'#ffdc99');
    if(s.ball.held && mode==='playing'){ctx.fillStyle='#dce8f5';ctx.font='15px monospace';ctx.textAlign='center';ctx.fillText('Press Fire to launch',320,287);}
  }else{
    if(!s.grace||Math.floor(s.t*7)%2)sprite(ship,p.x,p.y,{a:'#70c6df',b:'#e9faff',c:'#6283b5',d:'#ffba7c'},3);
  }
  for(const b of s.bots){
    if(b.x<s.camera-45||b.x>s.camera+650)continue;
    sprite(drone,b.x,b.y,{a:b.boss?'#e6a0dc':light,b:'#2b3452',c:'#ffcb72',d:'#ccc0ed'},b.boss?5:3);
  }
  for(const bolt of s.bolts)rect(bolt.x,bolt.y,bolt.w,bolt.h,'#ff977c');
  for(const shot of s.shots)rect(shot.x,shot.y,shot.w,shot.h,'#a2ffe4');
  if(game==='runner')ctx.restore();
}
function resetKeys(){tapped.clear();for(const key of Object.keys(keys))keys[key]=false;}
function stop(next,title,button){
  mode=next;cancelAnimationFrame(frame);frame=0;last=0;accumulator=0;resetKeys();
  overlay.hidden=false;el('message').textContent=title;el('play').textContent=button;
  el('pause').disabled=true;el('announcement').textContent=title;draw();hud();
}
function tick(time){
  frame=0;if(mode!=='playing')return;
  accumulator+=last?Math.min((time-last)/1000,.1):0;last=time;
  const score=state.score,lives=state.lives;
  const firing=state.cooldown;
  while(accumulator>=1/120 && state.status==='playing'){if (tapped.size) {
      const input={...keys};
      for(const key of tapped) input[key]=true;
      tapped.clear();step(state,input,1/120);
    } else step(state,keys,1/120);
    accumulator-=1/120;}
  if(state.score!==score)playSound('coin');else if(state.lives<lives)playSound('hit');else if(state.cooldown>firing)playSound('pulse');
  if(state.score>best){best=state.score;try{localStorage.setItem('imon-arcade-'+game,String(best));}catch{}}
  draw();if(score!==state.score || lives!==state.lives)hud();
  if(state.status==='lost'){stop('over','Game over','Play again');return;}
  if(state.status==='cleared'){
    playSound('win');
    if(state.level===STAGES)stop('over','Campaign complete','Play again');
    else stop('advance','Stage '+state.level+' cleared','Next stage');
    return;
  }
  frame=requestAnimationFrame(tick);
}
function play(){
  if(mode==='playing')return;
  if(mode==='ready'||mode==='over')document.dispatchEvent(new CustomEvent('imon:metric',{detail:'game_start'}));
  if(mode==='over')state=newStage(game);
  if(mode==='advance')state=newStage(game,state.level+1,state.score,state.lives);
  document.dispatchEvent(new CustomEvent('imon:quest-find',{detail:game}));
  mode='playing';overlay.hidden=true;el('pause').disabled=false;last=0;accumulator=0;
  canvas.focus({preventScroll:true});playSound('start');hud();frame=requestAnimationFrame(tick);
}
function pause(){if(mode==='playing')stop('paused','Paused','Resume');}
function load(value){
  game=Object.hasOwn(CARTRIDGES,value)?value:'runner';
  state=newStage(game);best=readBest();el('cartridge').value=game;
  const info=CARTRIDGES[game];el('title').textContent=info.name;document.title=info.name+' · IMON Arcade';
  el('brief').textContent=info.brief;el('help').textContent=info.help;
  document.querySelector('[data-key=jump]').hidden=game!=='runner';
  document.querySelector('[data-key=fire]').textContent=game==='breaker'?'Launch':'Fire';
  stop('ready',info.name,'Start game');
}
el('cartridge').onchange=event=>{const game=event.target.value;history.pushState(null,'','?game='+game);load(game);};
window.addEventListener('popstate',()=>load(new URLSearchParams(location.search).get('game')));
el('play').onclick=play;el('pause').onclick=pause;
el('restart').onclick=()=>load(game);
el('sound').onclick=()=>{const on=setSound(!isSoundEnabled());el('sound').textContent=on?'Sound on':'Sound off';el('sound').setAttribute('aria-pressed',String(on));};
el('full').hidden=!document.fullscreenEnabled;
el('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await cabinet.requestFullscreen();}catch{el('announcement').textContent='Full screen is unavailable.';}};
document.addEventListener('fullscreenchange',()=>{el('full').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
window.addEventListener('keydown',e=>{
  if(e.code==='KeyP' && !e.repeat && !e.target.matches('select')){if(mode==='paused')play();else pause();return;}
  if(mode!=='playing'||e.target.matches('select,button'))return;
  if(mapped[e.code]){keys[mapped[e.code]]=true;e.preventDefault();}
});
window.addEventListener('keyup',e=>{if(mapped[e.code])keys[mapped[e.code]]=false;});
document.querySelectorAll('[data-key]').forEach(button=>{
  const key=button.dataset.key;
  button.onpointerdown=e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);keys[key]=true;tapped.add(key);};
  button.onpointercancel=()=>{tapped.delete(key);keys[key]=false};
  button.onlostpointercapture=()=>{keys[key]=false;};
});
function drag(e){if(mode!=='playing'||game==='runner')return;
  const box=canvas.getBoundingClientRect(),p=state.player;
  p.x=Math.max(0,Math.min(640-p.w,(e.clientX-box.left)/box.width*640-p.w/2));}
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag(e);};
canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId))drag(e);};
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
load(new URLSearchParams(location.search).get('game'));
