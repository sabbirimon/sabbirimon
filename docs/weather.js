/** Lightweight decorative weather, never a weather-alert system. */
export const WEATHER_TYPES = ['clear','drizzle','rain','storm','snow','blizzard','fog','wind','hail','sandstorm','cyclone','flood','earthquake','aurora','meteors','fireflies','leaves'];
export function initWeather({ onThunder = () => {} } = {}) {
  const canvas = document.createElement('canvas');canvas.id='weather-layer';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'6',opacity:'.7',imageRendering:'pixelated'});
  const ctx=canvas.getContext('2d'),hero=document.getElementById('pixel-world'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let type='clear',motion=true,frame=0,last=0,width=0,height=0,lastFlash=0,flashUntil=0,destroyed=false;
  const particles=Array.from({length:130},(_,i)=>({x:Math.random(),y:Math.random(),speed:.05+Math.random()*.24,size:i%4?1:2,phase:Math.random()*Math.PI*2}));
  function resize(){width=canvas.width=Math.ceil(innerWidth/2);height=canvas.height=Math.ceil(innerHeight/2);if(!motion||reduced.matches)draw(0,true);}
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  function draw(time,still=false){
    frame=0;if(!ctx||destroyed)return;ctx.clearRect(0,0,width,height);if(hero)hero.style.translate='0px 0px';
    if(type==='clear'||document.hidden)return;
    const dt=still?0:Math.min(.045,(time-(last||time))/1000);last=time;const seconds=time/1000;
    const snow=['snow','blizzard'].includes(type),wet=['drizzle','rain','storm','hail','cyclone'].includes(type);
    if(wet||snow||['sandstorm','leaves','fireflies','wind','earthquake'].includes(type)){
      const count={drizzle:42,rain:85,storm:115,hail:62,cyclone:125,snow:55,blizzard:125,sandstorm:100,leaves:27,fireflies:38,wind:28,earthquake:25}[type]||60;
      for(let i=0;i<count;i++){
        const p=particles[i];let vx=0,vy=p.speed;
        if(wet){vx=type==='cyclone'?-.35:-.08;vy*=type==='drizzle'?1.4:type==='hail'?2.2:3;}
        if(snow){vx=type==='blizzard'?.25:Math.sin(seconds+p.phase)*.025;vy*=type==='blizzard'?.6:.24;}
        if(['wind','sandstorm'].includes(type)){vx=type==='sandstorm'?.6:.4;vy=.02;}
        if(type==='leaves'){vx=Math.sin(seconds*.6+p.phase)*.08;vy*=.23;}
        if(type==='fireflies'){vx=Math.cos(seconds*.25+p.phase)*.012;vy=Math.sin(seconds*.3+p.phase)*.012;}
        p.x=(p.x+vx*dt+1)%1;p.y=(p.y+vy*dt+1)%1;
        const x=p.x*width,y=type==='earthquake'?height*.8+p.y*height*.2:p.y*height;
        if(type==='wind'){rect(x,y,18+p.size*7,1,'#c4ddf05a');rect(x+8,y+3,8,1,'#c4ddf038');}
        else if(type==='sandstorm')rect(x,y,p.size*3,1,'#e2b26a8c');
        else if(type==='fireflies'){const a=.3+(Math.sin(seconds+p.phase)+1)*.3;ctx.globalAlpha=a;rect(x-2,y,5,1,'#ffe58e55');rect(x,y-2,1,5,'#ffe58e55');rect(x,y,1,1,'#fff5bd');ctx.globalAlpha=1;}
        else if(type==='leaves'){rect(x,y,3,2,i%2?'#edb06dbb':'#e99283bb');rect(x+1,y-1,1,4,'#e7b57699');}
        else if(type==='earthquake')rect(x,y,p.size,1,'#c7b69966');
        else if(type==='hail'){rect(x,y,2,2,'#eaf8ffb5');rect(x-2,y-4,1,3,'#c6e7fc44');}
        else if(snow){rect(x,y,p.size,p.size,'#eef7ffbb');if(p.size===2){rect(x-1,y,4,1,'#eef7ff80');rect(x,y-1,1,4,'#eef7ff80');}}
        else {rect(x,y,1,type==='drizzle'?4:type==='storm'?12:8,'#a8d6f18a');}
      }
    }
    if(['fog','sandstorm','cyclone'].includes(type)){
      for(let i=0;i<6;i++){const y=height*(.13+i*.15)+Math.sin(seconds*.09+i)*10;rect(0,y,width,14+i*2,type==='sandstorm'?'#dbb2730c':'#ccdce715');}
    }
    if(type==='flood'){
      for(let i=0;i<7;i++){const y=height*(.88+i*.02)+Math.sin(seconds*.55+i)*3;rect(0,y,width,height-y,i%2?'#3586b917':'#6ebddf16');for(let j=0;j<10;j++)rect((j*79+seconds*(i%2?6:-5)+width)%width,y,19,1,'#92e5eb60');}
    }
    if(type==='aurora'){
      for(let i=0;i<45;i++){const x=i*width/44,y=height*.1+Math.sin(i*.14+seconds*.12)*height*.09;rect(x,y,width/42,25+Math.sin(i*.2)*20,i%3?'#78ebcb24':'#b79cff20');rect(x,y+27,width/42,14,'#88dce91c');}
    }
    if(type==='meteors'){
      for(let i=0;i<4;i++){const phase=(seconds*.13+i*.27)%1;if(phase>.24)continue;const x=width*(.15+i*.23)+phase*width,y=height*(.03+i*.08)+phase*height*.75;for(let j=0;j<8;j++)rect(x-j*4,y-j*2,3,1,`rgba(194,219,255,${(8-j)/11})`);rect(x,y,2,2,'#e8f8ff');}
    }
    if(type==='earthquake'&&hero&&!still&&motion&&!reduced.matches){const burst=seconds%9<.55;hero.style.translate=burst?`${Math.sin(seconds*45)*1.2}px ${Math.cos(seconds*33)*.6}px`:'0px 0px';}
    if(type==='storm'&&!still&&motion&&!reduced.matches){if(time-lastFlash>14000){lastFlash=time;flashUntil=time+110;try{onThunder();}catch{}}if(time<flashUntil)rect(0,0,width,height,'#aac7ed12');}
    if(!still&&motion&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  function run(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;lastFlash=performance.now();flashUntil=0;if(hero)hero.style.translate='0px 0px';if(!ctx)return;ctx.clearRect(0,0,width,height);if(type!=='clear'&&!document.hidden){if(motion&&!reduced.matches)frame=requestAnimationFrame(draw);else draw(0,true);}}
  const onReduced=()=>run();addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',run);reduced.addEventListener('change',onReduced);resize();
  return{setWeather(value){const next=WEATHER_TYPES.includes(value)?value:'clear';if(next===type)return;type=next;canvas.style.opacity=['fog','flood','sandstorm'].includes(type)?'.55':'.8';document.body.dataset.weather=type;run();},setMotion(value){motion=Boolean(value);run();},destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',run);reduced.removeEventListener('change',onReduced);if(hero)hero.style.translate='0px 0px';canvas.remove();}};
}
