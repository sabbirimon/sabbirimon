// The posters and text render without script. Only visible scenes request frames.
function box(g,x,y,w,h,color) {
  g.fillStyle=color;
  g.fillRect(Math.round(x),Math.round(y),w,h);
}
function code(g,t) {
  box(g,201,32,78,50,'#083729');
  const inks=['#76f1ac','#4aa98e','#a3dcd4','#f2bf80'];
  for(let row=0;row<9;row++){
    const width=12+(row*17)%48;
    const count=Math.min(width,Math.max(0,(t*24+95)%255-row*19));
    for(let x=0;x<count;x+=4) box(g,205+x+(row%2)*4,35+row*5,3,2,inks[(row+Math.floor(x/19))%4]);
    if(count<width && count>0) box(g,209+count,35+row*5,2,3,'#f6ffdf');
  }
  for(let i=0;i<5;i++) box(g,132+Math.sin(t*2+i)*3,104-(t*8+i*4)%23,2,3,'#f3dda9');
}
function ai(g,t) {
  const nodes=[];
  for(let i=0;i<9;i++){
    const a=t*.75+i*Math.PI*2/9;
    const x=280+Math.cos(a)*32, y=82+Math.sin(a)*13+Math.sin(a*2)*9;
    nodes.push([x,y]);
  }
  g.strokeStyle='#bb89f5';g.lineWidth=1;
  nodes.forEach(([x,y],i)=>{
    const next=nodes[(i+3)%nodes.length];
    g.beginPath();g.moveTo(x,y);g.lineTo(...next);g.stroke();
    box(g,x-2,y-2,4,4,i%2?'#f8dcff':'#90f8ff');
  });
  for(let i=0;i<4;i++) box(g,269+i*7,110-(t*12+i*6)%22,2,2,'#eabcdc');
}
function circuits(g,t) {
  box(g,153,45,84,46,'#143a2b');
  for(let x=154;x<237;x+=10) box(g,x,45,1,46,'#21523a');
  for(let y=48;y<91;y+=8) box(g,153,y,84,1,'#21523a');
  let last=68;
  for(let x=0;x<82;x++){
    const y=Math.round(68+Math.sin(x*.17+t*3)*13);
    box(g,154+x,Math.min(y,last),1,Math.abs(y-last)+2,'#a7ff80');last=y;
  }
}
function meadow(g,t) {
  // Small foreground sprites and drifting mist sit over the painted meadow.
  for(let i=0;i<6;i++){
    const x=205+(i*61+t*(1+i%3))%370, y=14+(i*13)%28;
    box(g,x,y,12,1,'#edfdf184');box(g,x+4,y-1,6,1,'#ffffff80');
    const flap=Math.floor(t*3+i)%2;
    box(g,x-10,y+14,2,1,'#346a74');box(g,x-12,y+13+flap,2,1,'#346a74');box(g,x-8,y+13+flap,2,1,'#346a74');
  }
  for(let i=0;i<35;i++){
    const x=(i*131)%600,y=139+i*37%41,sway=Math.round(Math.sin(t*2+i));
    box(g,x,y,1,3,'#4b8465');box(g,x+sway,y-1,2,2,['#ffd083','#e5a9bc','#b7e3a1'][i%3]);
  }
  for(let i=0;i<7;i++){
    const phase=(t*.5+i*.21)%1;
    box(g,205+i*8+phase*4,142+i%4,1+Math.floor(phase*4),1,'#e9ffffae');
  }
  const x=432,y=127+Math.round(Math.sin(t*2));
  box(g,x-2,155,34,4,'#3f836f');box(g,x+3,y+20,5,7,'#454866');box(g,x+18,y+20,5,7,'#454866');
  box(g,x,y,26,21,'#38435a');box(g,x+2,y+1,22,17,'#e5cfad');box(g,x+4,y+3,18,12,'#24585f');
  box(g,x+7,y+7,3,Math.cos(t*2)>.96?1:4,'#9af5d9');box(g,x+16,y+7,3,Math.cos(t*2)>.96?1:4,'#9af5d9');
  for(let i=0;i<5;i++){
    const a=t*.8+i*1.3,bx=364+i*38+Math.sin(a)*8,by=129+Math.cos(a*2)*7;
    box(g,bx,by,2,2,'#e2ab56');box(g,bx+2,by-(Math.floor(t*5+i)%2),2,2,'#ffe7a3');
  }
}
function systems(g,t){
  for(let i=0;i<7;i++){
    const x=42+i*62,y=i%2?63:98;
    box(g,x,y,18,11,'#123c52');box(g,x+2,y+2,14,5,'#65ddcf');
    if(i<6){for(let n=0;n<10;n++)box(g,x+18+n*5,y+5+(i%2?1:-1)*n*3,3,2,'#94b7cd');
      const step=Math.floor(t*4+i)%10;box(g,x+18+step*5,y+5+(i%2?1:-1)*step*3,4,3,'#ffe084');}
  }
}
const draw={code,ai,circuits,meadow,systems};
const scenes=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,last=0,time=0;
function paint(canvas){
  const g=canvas.getContext('2d');
  if(!g)return;
  g.clearRect(0,0,canvas.width,canvas.height);
  draw[canvas.dataset.learningArt](g,time);
}
function enabled(){return !document.hidden&&!reduced.matches&&document.body.dataset.motion!=='off'&&[...scenes.values()].some(Boolean);}
function tick(now){
  if(!last||now-last>=90){
    if(last)time+=Math.min(150,now-last)/1000;
    last=now;
    for(const [canvas,visible] of scenes)if(visible)paint(canvas);
  }
  frame=requestAnimationFrame(tick);
}
function sync(){
  if(enabled()&&!frame){last=0;frame=requestAnimationFrame(tick);}
  if(!enabled()&&frame){cancelAnimationFrame(frame);frame=0;}
}
const motionButton=document.querySelector('[data-cover-motion]');
if(motionButton){
  function showMotion(){
    motionButton.hidden=false;
    motionButton.disabled=reduced.matches;
    const playing=!reduced.matches&&document.body.dataset.motion!=='off';
    motionButton.textContent=reduced.matches?'Reduced motion enabled':playing?'Pause cover animations':'Play cover animations';
    motionButton.setAttribute('aria-pressed',String(!playing));
  }
  motionButton.onclick=()=>{document.body.dataset.motion=document.body.dataset.motion==='off'?'on':'off';showMotion();sync();};
  reduced.addEventListener('change',showMotion);showMotion();
}
const observer=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries){scenes.set(target,isIntersecting);if(isIntersecting)paint(target);}
  sync();
});
for(const canvas of document.querySelectorAll('[data-learning-art]')) observer.observe(canvas);
reduced.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);
document.addEventListener('imon:motion',sync);
