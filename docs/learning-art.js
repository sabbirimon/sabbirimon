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
// The valley sprites use a logical pixel grid that follows the banner's aspect ratio.
function valley(g,t) {
  const {width:w,height:h}=g.canvas;
  // Wind carries loose leaves from the two near banks across the skyline.
  for(let i=0;i<14;i++){
    const life=(t*.065+i*.271)%1, side=i%2?1:-1;
    const x=side>0?w*life:w*(1-life), y=h*(.08+((i*17)%29)/100)+Math.sin(t*.9+i)*3;
    const shade=['#fff1ad','#d5eb95','#f3bd87'][i%3];
    box(g,x,y,3,1,shade);
    box(g,x+(Math.sin(t*2+i)>0?2:0),y-1,2,1,shade);
  }
  // Small flocks stay in the sky. Separate drift speeds establish depth.
  for(let i=0;i<7;i++){
    const x=((t*(2+i%2)+i*37)%(w+20))-10, y=h*(.12+(i%3)*.043)+Math.sin(i+t*.65)*2;
    const wing=Math.floor(t*3+i)%3-1;
    box(g,x-3,y+wing,2,1,'#37576a');box(g,x-1,y,3,1,'#37576a');box(g,x+2,y+wing,2,1,'#37576a');
  }
  for(let i=0;i<36;i++){
    const x=(i*107)%w, y=h-2-(i*23)%Math.max(8,Math.round(h*.10));
    const sway=Math.round(Math.sin(t*2+i)*1.5);
    box(g,x,y,1,4,'#284759');box(g,x+sway,y-1,2,3,'#63865e');
    if(i%3===0){
      box(g,x+sway-1,y-2,4,2,'#e8a9a1');box(g,x+sway,y-3,2,3,'#fff0aa');
    }
  }
  // In portrait the painted computer falls outside the crop. Keep the field terminal in view.
  if(w/h<1.2){
    const x=Math.round(w*.08),y=h-30;
    box(g,x-4,y+22,36,3,'#27454c');box(g,x,y+16,28,6,'#605d69');box(g,x+2,y+15,25,3,'#b2a59a');
    box(g,x+2,y-4,20,19,'#423f52');box(g,x+4,y-5,16,1,'#dbc9a4');box(g,x+3,y-3,17,17,'#b6a99d');
    box(g,x+6,y,12,10,'#345566');box(g,x+7,y+1,10,8,'#54a99a');
    box(g,x+8,y+3,2,1,'#b8f1b9');box(g,x+9,y+4,2,1,'#b8f1b9');box(g,x+8,y+5,2,1,'#b8f1b9');
    if(Math.floor(t*1.8)%2===0)box(g,x+12,y+6,3,1,'#d6edac');
    for(let key=0;key<6;key++)box(g,x+3+key*3,y+17,2,1,'#4f5561');
  }
  // Two sizes of butterflies thread the foreground; their wings fold in discrete steps.
  for(let i=0;i<8;i++){
    const side=i%2?1:-1, a=t*.52+i*1.13;
    const x=(side>0?w*.86:w*.14)+Math.sin(a)*w*.09, y=h*(.68+(i%3)*.07)+Math.cos(a*1.7)*7;
    const wings=Math.floor(t*5+i)%3, span=1+wings;
    const tone=i%3===0?'#eab0dd':'#e6a052';
    box(g,x-span,y-2,span,3,tone);box(g,x+1,y-2,span,3,tone);
    box(g,x-span,y-3,1,2,'#fff2c3');box(g,x+span,y-3,1,2,'#fff2c3');box(g,x,y,1,2,'#4b3b49');
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
const draw={code,ai,circuits,valley,systems};
const scenes=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,last=0,time=0,paused=false;
function fitValley(canvas){
  const area=canvas.getBoundingClientRect();
  const grid=Math.max(2,Math.round(area.width/450));
  const width=Math.max(1,Math.round(area.width/grid)),height=Math.max(1,Math.round(area.height/grid));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
}
function paint(canvas){
  const g=canvas.getContext('2d');
  if(!g)return;
  g.clearRect(0,0,canvas.width,canvas.height);
  draw[canvas.dataset.learningArt](g,time);
}
function enabled(){return !paused&&!document.hidden&&!reduced.matches&&document.body.dataset.motion!=='off'&&[...scenes.values()].some(Boolean);}
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
function updateMotion(){
  if(!motionButton)return;
  const globalOff=document.body.dataset.motion==='off';
  motionButton.hidden=false;
  motionButton.disabled=reduced.matches||globalOff;
  motionButton.textContent=reduced.matches?'Reduced motion':globalOff?'World motion off':paused?'Play animation':'Pause animation';
}
motionButton?.addEventListener('click',()=>{
  paused=!paused;
  updateMotion();sync();
});
const canvases=[...document.querySelectorAll('[data-learning-art]')].filter(canvas=>draw[canvas.dataset.learningArt]);
const hero=canvases.find(canvas=>canvas.dataset.learningArt==='valley');
if(hero){
  fitValley(hero);paint(hero);
  if(typeof ResizeObserver!=='undefined') new ResizeObserver(()=>{fitValley(hero);paint(hero);}).observe(hero);
}
if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{
    for(const {target,isIntersecting} of entries){scenes.set(target,isIntersecting);if(isIntersecting)paint(target);}
    sync();
  });
  for(const canvas of canvases)observer.observe(canvas);
}else{
  for(const canvas of canvases){scenes.set(canvas,true);paint(canvas);}
  sync();
}
updateMotion();
reduced.addEventListener('change',()=>{updateMotion();sync();});
document.addEventListener('visibilitychange',sync);
document.addEventListener('imon:motion',()=>{updateMotion();sync();});
