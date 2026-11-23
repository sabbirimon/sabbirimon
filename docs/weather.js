/** Original, bounded atmospheric weather. Visual atmosphere is separate from weather data. */
export const WEATHER_TYPES = ['clear','glass-rain','glass-fog','cloudy','drizzle','rain','heavy-rain','storm','lightning','snow','blizzard','fog','wind','hail','sandstorm','cyclone','flood','earthquake','aurora','meteors','fireflies','leaves'];
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
  function streak(x,y,length,dx,color,thickness=1){
    const gradient=ctx.createLinearGradient(x,y,x+dx,y+length);gradient.addColorStop(0,'rgba(180,218,242,0)');gradient.addColorStop(.4,color);gradient.addColorStop(.88,color);gradient.addColorStop(1,'rgba(180,218,242,0)');
    ctx.strokeStyle=gradient;ctx.lineWidth=.4+thickness*.27;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+length);ctx.stroke();
    if(thickness>1){ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(x+dx*.15,y+length*.15);ctx.lineTo(x+dx*.55,y+length*.55);ctx.stroke();}
  }
  function softEllipse(x,y,rx,ry,color){
    ctx.save();ctx.translate(x,y);ctx.scale(Math.max(1,rx),Math.max(1,ry));const gradient=ctx.createRadialGradient(0,0,.06,0,0,1);gradient.addColorStop(0,color);gradient.addColorStop(.45,color);gradient.addColorStop(1,'rgba(210,230,242,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function gust(x,y,length,phase,opacity=1){
    const gradient=ctx.createLinearGradient(x,y,x+length,y);gradient.addColorStop(0,'rgba(206,235,243,0)');gradient.addColorStop(.35,'rgba(216,240,246,.65)');gradient.addColorStop(.7,'rgba(216,240,246,.4)');gradient.addColorStop(1,'rgba(206,235,243,0)');
    ctx.globalAlpha=opacity;ctx.strokeStyle=gradient;ctx.lineWidth=.65;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+length*.28,y-6-Math.sin(phase)*3,x+length*.55,y+8,x+length,y-3);ctx.stroke();ctx.globalAlpha=1;
  }
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
      ctx.globalAlpha=amount;softEllipse(x+size*.7,y+size*.15,size*.95,size*.25,color);softEllipse(x+size*.35,y,size*.48,size*.23,light);softEllipse(x+size*.91,y+size*.04,size*.55,size*.2,color);
    }ctx.globalAlpha=1;
  }
  function glassWeather(seconds,dt,fogged){
    const strength=INTENSITIES[intensity];
    if(fogged){
      ctx.fillStyle=`rgba(208,225,231,${.035*power*strength})`;ctx.fillRect(0,0,width,height);
      for(let i=0;i<6;i++){const drift=Math.sin(seconds*.09+i)*width*.08;softEllipse((i%3)*width*.5+drift,(i<3?0:1)*height,width*.58,height*.55,`rgba(220,235,239,${.12*strength*density*power})`);}
    }
    const count=Math.min(230,Math.round((fogged?95:150)*density*strength));
    for(let i=0;i<count;i++){
      const p=particles[i],sliding=i%7===0,cycle=(seconds*.22+p.phase)%6;
      const speed=sliding&&cycle>1.4?(fogged?.018:.045)*p.speed*power:0;
      p.y=(p.y+speed*dt)%1;
      const x=p.x*width+Math.sin(seconds*.38+p.phase)*(sliding?.65:.05),y=p.y*height;
      const r=(sliding?2.3+p.depth*2.2:.9+p.depth*1.3)*(fogged?.7:1),stretch=sliding?1.45:1;
      if(sliding&&speed){
        const trail=ctx.createLinearGradient(x,y-r*12,x,y);trail.addColorStop(0,'rgba(190,218,233,0)');trail.addColorStop(1,'rgba(218,241,252,.2)');ctx.strokeStyle=trail;ctx.lineWidth=r*.7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+.5,y-r*12);ctx.quadraticCurveTo(x-1,y-r*5,x,y);ctx.stroke();
      }
      const lens=ctx.createRadialGradient(x-r*.35,y-r*.4,.1,x,y,r*1.5);lens.addColorStop(0,'rgba(226,247,255,.14)');lens.addColorStop(.55,'rgba(21,43,62,.09)');lens.addColorStop(.9,'rgba(6,20,36,.58)');lens.addColorStop(1,'rgba(205,235,247,.5)');
      ctx.fillStyle=lens;ctx.beginPath();ctx.ellipse(x,y,r,r*stretch,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(242,252,255,.9)';ctx.lineWidth=.55;ctx.beginPath();ctx.arc(x-r*.08,y-r*.12,r*.7,Math.PI*1.05,Math.PI*1.7);ctx.stroke();
      ctx.strokeStyle='rgba(154,207,229,.28)';ctx.beginPath();ctx.arc(x,y+r*.2,r*.78,.15,1.4);ctx.stroke();
    }
  }
  function lightning(time,seconds,still){
    if(still)return;
    if(time>=nextLightning){strikeAt=time;strikeX=.18+((Math.floor(seconds)*37)%65)/100;nextLightning=time+Math.max(9000,11500/Math.sqrt(density));try{onThunder();}catch{}}
    const age=time-strikeAt;if(age<0||age>430)return;
    const strength=age<80?age/80:Math.max(0,1-(age-80)/350);
    ctx.globalAlpha=Math.min(1,strength*INTENSITIES[intensity]*power);rect(0,0,width,height,'#c0ddfb24');
    const points=[[strikeX*width,0],[strikeX*width-13,height*.13],[strikeX*width+7,height*.13],[strikeX*width-19,height*.32],[strikeX*width-7,height*.32],[strikeX*width-35,height*.52]];
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [lineWidth,color] of [[6,'#96cfff22'],[2.7,'#a9d9ff66'],[power>1.3?1.5:1,'#effbff']]){ctx.lineWidth=lineWidth;ctx.strokeStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
    const reflectionX=points.at(-1)[0];ctx.globalAlpha*=.2;softEllipse(reflectionX,height*.82,width*.16,height*.19,'#b4ddf780');
    for(let i=0;i<5;i++){const y=height*(.7+i*.048),spread=8+i*5;ctx.strokeStyle='#d0edff99';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(reflectionX-spread,y);ctx.quadraticCurveTo(reflectionX,y+2,reflectionX+spread,y-1);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  function draw(time,still=false){
    if(!ctx||destroyed)return;
    ctx.clearRect(0,0,width,height);const ground=hero?.querySelector?.('#pixel-world'); if(ground)ground.style.translate='';
    if(type==='clear'||document.hidden||!visible)return;
    const dt=still||last===null?0:Math.min(.05,Math.max(0,(time-last)/1000));if(!still){last=time;animationTime+=dt;}
    const seconds=animationTime,strength=INTENSITIES[intensity],snow=['snow','blizzard'].includes(type),wet=['drizzle','rain','heavy-rain','storm','hail','cyclone'].includes(type);
    if(type==='glass-rain'||type==='glass-fog')glassWeather(seconds,dt,type==='glass-fog');
    if(['cloudy','storm','lightning','heavy-rain','cyclone'].includes(type))clouds(seconds,['storm','lightning','cyclone'].includes(type),strength);
    if(wet||snow||['sandstorm','leaves','fireflies','wind','earthquake'].includes(type)){
      const max={drizzle:62,rain:150,'heavy-rain':225,storm:235,hail:105,cyclone:240,snow:125,blizzard:200,sandstorm:135,leaves:38,fireflies:52,wind:70,earthquake:35}[type]||80;
      const count=Math.max(1,Math.min(particles.length,Math.round(max*strength*density)));
      const speedScale=power*(.65+strength*.35);
      for(let i=0;i<count;i++){
        const p=particles[i];let vx=0,vy=0;
        if(wet){vx=type==='cyclone'?-.35:type==='storm'?-.16-(Math.sin(seconds*.8)+1)*.09:type==='drizzle'?-.025:-.055-p.depth*.065;vy=p.speed*(type==='drizzle'?.5:type==='hail'?.95:type==='heavy-rain'||type==='storm'?1.25:1);}
        if(snow){vx=(type==='blizzard'?.2:.025)+Math.sin(seconds*.7+p.phase)*.05;vy=(type==='blizzard'?.16:.075)+p.speed*p.depth*.16;}
        if(type==='wind'||type==='sandstorm'){vx=(type==='wind'?.4:.55)*p.speed;vy=Math.sin(seconds+p.phase)*.018;}
        if(type==='leaves'){vx=.035+Math.sin(seconds*.6+p.phase)*.045;vy=p.speed*.075;}
        if(type==='fireflies'){vx=Math.cos(seconds*.5+p.phase)*.014;vy=Math.sin(seconds*.65+p.phase)*.018;}
        p.x=(p.x+vx*dt*speedScale+1)%1;p.y=(p.y+vy*dt*speedScale+1)%1;
        const x=p.x*width,y=type==='earthquake'?height*.8+p.y*height*.2:p.y*height;
        if(type==='wind'){
          const length=22+p.depth*42;gust(x,y,length,seconds+p.phase,.45+p.depth*.45);
          if(i%5===0){ctx.fillStyle=i%2?'#c9db8dc9':'#e3bd7ba8';ctx.beginPath();ctx.ellipse(x+13,y+7,2.1,.8,seconds*.8+p.phase,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
        }else if(type==='sandstorm')rect(x,y,p.size*3,2,'#e2bc82ac');
        else if(type==='fireflies'){ctx.globalAlpha=.45+(Math.sin(seconds+p.phase)+1)*.25;rect(x-1,y-1,3,3,'#ffe58e28');rect(x-2,y,5,1,'#ffe58e55');rect(x,y-1,1,3,'#ffe58e66');rect(x,y,1,1,'#fff6c4');ctx.globalAlpha=1;}
        else if(type==='leaves'){rect(x,y,4,2,i%2?'#efb579dd':'#f2a094dd');rect(x+1,y-1,1,5,'#f0c487bb');}
        else if(type==='earthquake')rect(x,y,p.size,1,'#c7b69999');
        else if(type==='hail'){rect(x,y,3,3,'#f0fbffdd');streak(x-1,y-7,6,-2,'#c3e7f887');}
        else if(snow){
          const size=p.size>=2?2:1;ctx.globalAlpha=.48+p.depth*.5;
          rect(x,y,size,size,'#f4fbff');if(size>=3){rect(x-1,y+1,size+2,1,'#edfaffd9');rect(x+1,y-1,1,size+2,'#edfaffd9');}ctx.globalAlpha=1;
        }else{
          const length=type==='drizzle'?5+p.depth*4:type==='storm'||type==='heavy-rain'?12+p.depth*13:8+p.depth*9;
          streak(x,y,length,Math.max(-length*1.1,vx/Math.max(.1,vy)*width/height*length),p.depth>.8?'#d3edfff0':p.depth>.5?'#b8dcf5bd':'#96c6e78c',p.depth>.8&&type!=='drizzle'?2:1);
        }
      }
      if(wet&&type!=='hail'){
        const splashes=Math.min(32,Math.round((type==='drizzle'?5:18)*strength*density));
        for(let i=0;i<splashes;i++){const phase=(seconds*1.8+i*.73)%1,x=((i*67+19)%width),y=height*(.65+(i%5)*.07);if(phase>.65)continue;ctx.globalAlpha=(1-phase/.65)*.8;const spread=1+phase*8;ctx.strokeStyle='#d0efffc7';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x-spread,y-phase*3);ctx.quadraticCurveTo(x,y-1,x+spread,y-phase*3);ctx.stroke();ctx.strokeStyle='#b7def87a';ctx.beginPath();ctx.ellipse(x,y+1,2+phase*5,.6,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
      }
    }
    if(['storm','cyclone'].includes(type)){for(let i=0;i<Math.round(14*density);i++){const x=(i*width*.137+seconds*width*.14*power)%(width+30)-15,y=height*(.3+(i%6)*.11)+Math.sin(seconds+i)*8;rect(x,y,3,2,i%2?'#c8d492b0':'#d4b486b0');rect(x+1,y-1,1,4,'#e2c8a09a');if(i%3===0)gust(x-19,y+4,29,seconds+i,.35);}}
    if(['fog','sandstorm','cyclone'].includes(type)){
      const bands=Math.max(4,Math.min(12,Math.round(8*density)));
      for(let i=0;i<bands;i++){const drift=Math.sin(seconds*.18*power+i)*width*.08,y=height*(.02+i/bands)+Math.sin(seconds*.12*power+i)*12;ctx.globalAlpha=Math.min(1,strength*(.55+density*.45));softEllipse(width*.5+drift,y,width*.75,27+(i%3)*13,type==='sandstorm'?'#dfb87930':'#d9ecf13b');softEllipse(width*.5-drift,y+13,width*.65,22+(i%2)*9,'#edf7fa24');}ctx.globalAlpha=1;
    }
    if(type==='flood')for(let i=0;i<7;i++){const y=height*(.82+i*.027)+Math.sin(seconds*.7+i)*4;rect(0,y,width,height-y,i%2?'#3586b925':'#6ebddf25');for(let j=0;j<10;j++)rect((j*79+seconds*(i%2?9:-7)+width)%width,y,23,2,'#b3f1ec9c');}
    if(type==='aurora')for(let i=0;i<45;i++){const x=i*width/44,y=height*.1+Math.sin(i*.14+seconds*.17)*height*.09;rect(x,y,width/42,25+Math.sin(i*.2)*20,i%3?'#78ebcb50':'#b79cff40');rect(x,y+27,width/42,14,'#88dce93d');}
    if(type==='meteors')for(let i=0;i<4;i++){const phase=(seconds*.13+i*.27)%1;if(phase>.24)continue;const x=width*(.15+i*.23)+phase*width,y=height*(.03+i*.08)+phase*height*.75;for(let j=0;j<8;j++)rect(x-j*4,y-j*2,3,1,`rgba(194,219,255,${(8-j)/10})`);rect(x,y,2,2,'#f0faff');}
    if(type==='earthquake') {
      const phase=seconds%9, pulse=phase<1.4?1-phase/1.4:phase>2&&phase<2.65?(2.65-phase)*.8:0;
      const amplitude=still||!motion||reduced.matches?0:pulse*Math.min(3,power*2.4);
      const ground=hero?.querySelector?.('#pixel-world');
      if(ground) ground.style.translate=Math.sin(seconds*34)*amplitude+'px '+Math.cos(seconds*23)*amplitude*.5+'px';
      ctx.strokeStyle='#b899797f';ctx.lineWidth=1;
      for(let i=0;i<3;i++) {
        const x=width*(.16+i*.31), y=height*.88;
        ctx.beginPath();ctx.moveTo(x-18,y);ctx.lineTo(x-8,y-3);ctx.lineTo(x-3,y+2);ctx.lineTo(x+7,y-5);ctx.lineTo(x+17,y-4);ctx.stroke();
        if(amplitude) softEllipse(x,y-4,12+pulse*8,3+pulse*4,'#dcbb9b29');
      }
    }
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
    const ground=hero?.querySelector?.('#pixel-world'); if(ground)ground.style.translate='';if(!ctx||destroyed)return;
    draw(performance.now(),true);schedule();
  }
  const onReduced=()=>run({resetLightning:true}),onVisibility=()=>run({resetLightning:true});
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onReduced);
  let resizeObserver=null,intersectionObserver=null;
  if(!viewport&&typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);}
  if(!viewport&&typeof IntersectionObserver!=='undefined'){intersectionObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;run({resetLightning:true});},{rootMargin:'30px'});intersectionObserver.observe(mount);}
  resize();
  return{
    setWeather(value){const next=WEATHER_TYPES.includes(value)?value:'clear';if(next===type)return;type=next;canvas.style.imageRendering=['glass-rain','glass-fog','drizzle','rain','heavy-rain','storm','lightning','wind','cloudy','fog','cyclone'].includes(type)?'auto':'pixelated';if(viewport)document.body.dataset.weather=type;run({resetLightning:true});},
    setIntensity(value){const next=Object.hasOwn(INTENSITIES,value)?value:'vivid';if(next===intensity)return;intensity=next;applyOpacity();run();},
    setDensity(value){const next=clampSetting(value);if(next===density)return;density=next;run();},
    setPower(value){const next=clampSetting(value);if(next===power)return;power=next;applyOpacity();run();},
    setMotion(value){const next=Boolean(value);if(next===motion)return;motion=next;run({resetLightning:true});},
    destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onReduced);resizeObserver?.disconnect();intersectionObserver?.disconnect();const ground=hero?.querySelector?.('#pixel-world'); if(ground)ground.style.translate='';canvas.remove();}
  };
}
