/** Original, bounded pixel weather. Visual atmosphere is separate from weather data. */
export const WEATHER_TYPES = ['clear','cloudy','drizzle','rain','heavy-rain','storm','lightning','snow','blizzard','fog','wind','hail','sandstorm','cyclone','flood','earthquake','aurora','meteors','fireflies','leaves'];
const INTENSITIES = { gentle: .55, normal: .78, vivid: 1 };
export function initWeather({ onThunder = () => {}, mount = document.body, id = 'weather-layer' } = {}) {
  const viewport = mount === document.body || mount === document.documentElement;
  const canvas = document.createElement('canvas'); canvas.id=id; canvas.setAttribute('aria-hidden','true'); mount.append(canvas);
  Object.assign(canvas.style,{position:viewport?'fixed':'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'6',opacity:'1',imageRendering:'pixelated'});
  const ctx=canvas.getContext('2d'),hero=viewport?document.getElementById('pixel-world'):null,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let type='clear',intensity='vivid',power=1,density=1,motion=true,frame=0,last=null,width=1,height=1,destroyed=false;
  let animationTime=0,nextLightning=0,strikeAt=-Infinity,strikeX=.65,visible=true;
  const particles=Array.from({length:260},(_,i)=>({x:Math.random(),y:Math.random(),speed:.42+Math.random()*.58,size:i%9===0?3:i%3===0?2:1,depth:.38+(i%3)*.31,phase:i*2.399}));
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  function streak(x,y,length,dx,color,thickness=1){const steps=Math.max(2,Math.ceil(length/3));for(let j=0;j<steps;j++)rect(x+dx*j/steps,y+length*j/steps,thickness,Math.ceil(length/steps)+1,color);}
  function resize(){
    const box=viewport?{width:innerWidth,height:innerHeight}:mount.getBoundingClientRect();
    width=canvas.width=Math.max(1,Math.ceil(box.width/2));height=canvas.height=Math.max(1,Math.ceil(box.height/2));
    if(ctx)draw(performance.now(),true);
    schedule();
  }
  function clouds(seconds,dark=false,amount=1){
    const color=dark?'#50678440':'#d7e9f34d',light=dark?'#7890ab24':'#eff8fa44';
    const count=Math.max(3,Math.min(12,Math.round(7*density)));
    for(let i=0;i<count;i++){
      const size=Math.max(30,width*(.13+(i%3)*.035)),x=((i*width*.23+seconds*(dark?6:3)*power)%(width+size*2))-size,y=height*(.035+(i%3)*.11);
      ctx.globalAlpha=amount;rect(x,y+size*.1,size*1.5,size*.19,color);rect(x+size*.15,y,size,size*.24,color);rect(x+size*.36,y-size*.08,size*.52,size*.12,light);rect(x+size*.1,y+size*.25,size*1.28,size*.045,light);
    }ctx.globalAlpha=1;
  }
  function lightning(time,seconds,still){
    if(still)return;
    if(time>=nextLightning){strikeAt=time;strikeX=.18+((Math.floor(seconds)*37)%65)/100;nextLightning=time+Math.max(9000,11500/Math.sqrt(density));try{onThunder();}catch{}}
    const age=time-strikeAt;if(age<0||age>430)return;
    const strength=age<80?age/80:Math.max(0,1-(age-80)/350);
    ctx.globalAlpha=Math.min(1,strength*INTENSITIES[intensity]*power);rect(0,0,width,height,'#c0ddfb24');
    const points=[[strikeX*width,0],[strikeX*width-13,height*.13],[strikeX*width+7,height*.13],[strikeX*width-19,height*.32],[strikeX*width-7,height*.32],[strikeX*width-35,height*.52]];
    for(let i=1;i<points.length;i++){const [x,y]=points[i-1],[xx,yy]=points[i],steps=Math.max(1,Math.ceil(Math.abs(yy-y)/3));for(let j=0;j<steps;j++){const px=x+(xx-x)*j/steps,py=y+(yy-y)*j/steps;rect(px-2,py,5+(power>1.3?2:0),4,'#96cfff44');rect(px,py,power>1.3?3:2,4,'#effbff');}}
    ctx.globalAlpha=1;
  }
  function draw(time,still=false){
    if(!ctx||destroyed)return;
    ctx.clearRect(0,0,width,height);if(hero)hero.style.translate='0px 0px';
    if(type==='clear'||document.hidden||!visible)return;
    const dt=still||last===null?0:Math.min(.05,Math.max(0,(time-last)/1000));if(!still){last=time;animationTime+=dt;}
    const seconds=animationTime,strength=INTENSITIES[intensity],snow=['snow','blizzard'].includes(type),wet=['drizzle','rain','heavy-rain','storm','hail','cyclone'].includes(type);
    if(['cloudy','storm','lightning','heavy-rain','cyclone'].includes(type))clouds(seconds,['storm','lightning','cyclone'].includes(type),strength);
    if(wet||snow||['sandstorm','leaves','fireflies','wind','earthquake'].includes(type)){
      const max={drizzle:62,rain:150,'heavy-rain':225,storm:235,hail:105,cyclone:240,snow:125,blizzard:200,sandstorm:135,leaves:38,fireflies:52,wind:70,earthquake:35}[type]||80;
      const count=Math.max(1,Math.min(particles.length,Math.round(max*strength*density)));
      const speedScale=power*(.65+strength*.35);
      for(let i=0;i<count;i++){
        const p=particles[i];let vx=0,vy=0;
        if(wet){vx=type==='cyclone'?-.35:-.055-p.depth*.065;vy=p.speed*(type==='drizzle'?.5:type==='hail'?.95:type==='heavy-rain'||type==='storm'?1.25:1);}
        if(snow){vx=(type==='blizzard'?.2:.025)+Math.sin(seconds*.7+p.phase)*.05;vy=(type==='blizzard'?.16:.075)+p.speed*p.depth*.16;}
        if(type==='wind'||type==='sandstorm'){vx=(type==='wind'?.4:.55)*p.speed;vy=Math.sin(seconds+p.phase)*.018;}
        if(type==='leaves'){vx=.035+Math.sin(seconds*.6+p.phase)*.045;vy=p.speed*.075;}
        if(type==='fireflies'){vx=Math.cos(seconds*.5+p.phase)*.014;vy=Math.sin(seconds*.65+p.phase)*.018;}
        p.x=(p.x+vx*dt*speedScale+1)%1;p.y=(p.y+vy*dt*speedScale+1)%1;
        const x=p.x*width,y=type==='earthquake'?height*.8+p.y*height*.2:p.y*height;
        if(type==='wind'){
          ctx.globalAlpha=.55+p.depth*.35;const length=13+p.depth*32;rect(x,y,length,1,'#dbf4f3c7');rect(x+length-6,y-2,5,1,'#dbf4f390');rect(x+5,y+3,length*.6,1,'#b9e8f0a0');
          if(i%5===0){rect(x+8,y+8,4,2,'#c9db8dd9');rect(x+10,y+6,2,5,'#e3bd7bba');}ctx.globalAlpha=1;
        }else if(type==='sandstorm')rect(x,y,p.size*3,2,'#e2bc82ac');
        else if(type==='fireflies'){ctx.globalAlpha=.45+(Math.sin(seconds+p.phase)+1)*.25;rect(x-2,y-2,6,6,'#ffe58e1c');rect(x-3,y,8,2,'#ffe58e44');rect(x-2,y,5,1,'#ffe58e66');rect(x,y-2,1,5,'#ffe58e66');rect(x,y,2,2,'#fff6c4');ctx.globalAlpha=1;}
        else if(type==='leaves'){rect(x,y,4,2,i%2?'#efb579dd':'#f2a094dd');rect(x+1,y-1,1,5,'#f0c487bb');}
        else if(type==='earthquake')rect(x,y,p.size,1,'#c7b69999');
        else if(type==='hail'){rect(x,y,3,3,'#f0fbffdd');streak(x-1,y-7,6,-2,'#c3e7f887');}
        else if(snow){
          const size=p.depth>.8?p.size+1:p.size;ctx.globalAlpha=.48+p.depth*.5;
          rect(x,y,size,size,'#f4fbff');if(size>=3){rect(x-1,y+1,size+2,1,'#edfaffd9');rect(x+1,y-1,1,size+2,'#edfaffd9');}ctx.globalAlpha=1;
        }else{
          const length=type==='drizzle'?5+p.depth*4:type==='storm'||type==='heavy-rain'?12+p.depth*13:8+p.depth*9;
          streak(x,y,length,-length*.31,p.depth>.8?'#d3edfff0':p.depth>.5?'#b8dcf5bd':'#96c6e78c',p.depth>.8&&type!=='drizzle'?2:1);
        }
      }
      if(wet&&type!=='hail'){
        const splashes=Math.min(32,Math.round((type==='drizzle'?5:18)*strength*density));
        for(let i=0;i<splashes;i++){const phase=(seconds*1.8+i*.73)%1,x=((i*67+19)%width),y=height*(.65+(i%5)*.07);if(phase>.65)continue;ctx.globalAlpha=(1-phase/.65)*.8;const spread=1+phase*8;rect(x-spread,y-phase*3,2,1,'#d0efffea');rect(x+spread,y-phase*3,2,1,'#d0efffea');rect(x-2,y+1,5,1,'#b7def89c');}ctx.globalAlpha=1;
      }
    }
    if(['storm','cyclone'].includes(type)){for(let i=0;i<Math.round(14*density);i++){const x=(i*width*.137+seconds*width*.14*power)%(width+30)-15,y=height*(.3+(i%6)*.11)+Math.sin(seconds+i)*8;rect(x,y,3,2,i%2?'#c8d492b0':'#d4b486b0');rect(x+1,y-1,1,4,'#e2c8a09a');if(i%3===0)rect(x-17,y+4,18,1,'#d4e9f05b');}}
    if(['fog','sandstorm','cyclone'].includes(type)){
      const bands=Math.max(4,Math.min(12,Math.round(8*density)));
      for(let i=0;i<bands;i++){const drift=Math.sin(seconds*.18*power+i)*width*.08,y=height*(.02+i/bands)+Math.sin(seconds*.12*power+i)*12;ctx.globalAlpha=Math.min(1,strength*(.55+density*.45));rect(-width*.12+drift,y,width*1.24,18+(i%3)*11,type==='sandstorm'?'#dfb87930':'#d9ecf13b');rect(-width*.1-drift,y+8,width*1.2,10+(i%2)*9,'#edf7fa1c');}ctx.globalAlpha=1;
    }
    if(type==='flood')for(let i=0;i<7;i++){const y=height*(.82+i*.027)+Math.sin(seconds*.7+i)*4;rect(0,y,width,height-y,i%2?'#3586b925':'#6ebddf25');for(let j=0;j<10;j++)rect((j*79+seconds*(i%2?9:-7)+width)%width,y,23,2,'#b3f1ec9c');}
    if(type==='aurora')for(let i=0;i<45;i++){const x=i*width/44,y=height*.1+Math.sin(i*.14+seconds*.17)*height*.09;rect(x,y,width/42,25+Math.sin(i*.2)*20,i%3?'#78ebcb50':'#b79cff40');rect(x,y+27,width/42,14,'#88dce93d');}
    if(type==='meteors')for(let i=0;i<4;i++){const phase=(seconds*.13+i*.27)%1;if(phase>.24)continue;const x=width*(.15+i*.23)+phase*width,y=height*(.03+i*.08)+phase*height*.75;for(let j=0;j<8;j++)rect(x-j*4,y-j*2,3,1,`rgba(194,219,255,${(8-j)/10})`);rect(x,y,2,2,'#f0faff');}
    if(type==='earthquake'&&hero&&!still&&motion&&!reduced.matches){const burst=seconds%9<.55;hero.style.translate=burst?`${Math.sin(seconds*45)*1.2}px ${Math.cos(seconds*33)*.6}px`:'0px 0px';}
    if((type==='storm'||type==='lightning')&&!still&&motion&&!reduced.matches)lightning(time,seconds,still);
  }
  function applyOpacity(){canvas.style.opacity=String(Math.min(1,({gentle:.65,normal:.85,vivid:1}[intensity])*(.7+power*.3)));}
  const clampSetting=value=>Number.isFinite(Number(value))?Math.max(.25,Math.min(2,Number(value))):1;
  function canAnimate(){return !destroyed&&!!ctx&&motion&&!reduced.matches&&!document.hidden&&visible&&type!=='clear';}
  function tick(time){frame=0;if(!canAnimate()){last=null;return;}draw(time);schedule();}
  function schedule(){if(!frame&&canAnimate())frame=requestAnimationFrame(tick);}
  function run({resetLightning=false}={}){
    if(frame)cancelAnimationFrame(frame);frame=0;last=null;
    if(resetLightning){strikeAt=-Infinity;nextLightning=performance.now()+1100;}
    if(hero)hero.style.translate='0px 0px';if(!ctx||destroyed)return;
    draw(performance.now(),true);schedule();
  }
  const onReduced=()=>run({resetLightning:true}),onVisibility=()=>run({resetLightning:true});
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onReduced);
  let resizeObserver=null,intersectionObserver=null;
  if(!viewport&&typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);}
  if(!viewport&&typeof IntersectionObserver!=='undefined'){intersectionObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;run({resetLightning:true});},{rootMargin:'30px'});intersectionObserver.observe(mount);}
  resize();
  return{
    setWeather(value){const next=WEATHER_TYPES.includes(value)?value:'clear';if(next===type)return;type=next;if(viewport)document.body.dataset.weather=type;run({resetLightning:true});},
    setIntensity(value){const next=Object.hasOwn(INTENSITIES,value)?value:'vivid';if(next===intensity)return;intensity=next;applyOpacity();run();},
    setDensity(value){const next=clampSetting(value);if(next===density)return;density=next;run();},
    setPower(value){const next=clampSetting(value);if(next===power)return;power=next;applyOpacity();run();},
    setMotion(value){const next=Boolean(value);if(next===motion)return;motion=next;run({resetLightning:true});},
    destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);resizeObserver?.disconnect();intersectionObserver?.disconnect();if(hero)hero.style.translate='0px 0px';canvas.remove();}
  };
}
