// All game coordinates use a 640 by 360 pixel playfield.
export const CARTRIDGES = {
  runner: {name:'Signal Runner', brief:'Cross six robot outposts, leap between platforms, and clear the guardian at each exit.', help:'Move with A/D or the arrow keys. W or Up jumps. Hold Space to fire. P pauses.'},
  breaker: {name:'Prism Breaker', brief:'Clear six brick patterns. Hit the ball near a paddle edge to change its angle.', help:'Move with A/D, arrow keys, or drag across the board. Space launches the ball. P pauses.'},
  space: {name:'Star Patrol', brief:'Pilot a scout ship through six fleets. Break the formation and dodge incoming plasma.', help:'Move with A/D or arrow keys. Hold Space to fire. On touchscreens, drag to steer and use Fire to shoot. P pauses.'}
};
export const STAGES=6;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const hit=(a,b)=>a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
export function newStage(game,level=1,score=0,lives=3) {
  const s={game,level,score,lives,t:0,cooldown:0,grace:0,shotTimer:1.2,status:'playing',shots:[],bolts:[],bots:[],bricks:[],platforms:[],camera:0};
  if(game==='runner'){
    s.end=2100+level*240;
    s.player={x:36,y:260,w:17,h:26,vy:0,grounded:false};
    for(let i=0;i<8+level;i++){
      const x=200+i*175, y=267-(i%3)*31;
      s.platforms.push({x,y,w:88,h:8});
      s.bots.push({x:x+22,y:i%2?296:y-21,w:20,h:21,hp:1+Math.floor(level/3),home:x+22});
    }
    s.bots.push({x:s.end-115,home:s.end-115,y:273,w:40,h:45,hp:5+level,boss:true});
  }else if(game==='breaker'){
    s.player={x:275,y:325,w:90-level*3,h:10};
    s.ball={x:320,y:316,w:8,h:8,vx:0,vy:0,held:true};
    for(let row=0;row<4+Math.floor(level/2);row++)for(let col=0;col<10;col++){
      if(level>1 && (row+col+level)%7===0)continue;
      s.bricks.push({x:27+col*59,y:37+row*18,w:54,h:12,row,hp:row===0&&level>2?2:1});
    }
  }else{
    s.player={x:304,y:307,w:27,h:19};
    for(let row=0;row<2+Math.ceil(level/2);row++)for(let col=0;col<8;col++){
      s.bots.push({x:0,y:0,baseX:88+col*60,baseY:40+row*30,w:22,h:16,hp:1+(level>3&&row===0?1:0)});
    }
  }
  return s;
}
function damage(s){
  if(s.grace>0)return;
  s.lives--;s.grace=1.35;
  if(!s.lives)s.status='lost';
}
function moveX(p,keys,dt,min,max,speed){
  p.x=clamp(p.x+(Number(keys.right)-Number(keys.left))*speed*dt,min,max-p.w);
}
function runner(s,k,dt){
  const p=s.player,oldY=p.y;
  moveX(p,k,dt,0,s.end,160);
  if(k.jump && p.grounded && !s.wasJump){p.vy=-325;p.grounded=false;}
  s.wasJump=k.jump;p.vy+=760*dt;p.y+=p.vy*dt;p.grounded=false;
  for(const platform of [...s.platforms,{x:0,y:318,w:s.end,h:42}]){
    if(p.vy>=0 && oldY+p.h<=platform.y+.1 && hit(p,platform)){
      p.y=platform.y-p.h;p.vy=0;p.grounded=true;break;
    }
  }
  s.camera=clamp(p.x-160,0,s.end-640);
  if(k.fire && s.cooldown<=0){
    s.shots.push({x:p.x+p.w,y:p.y+10,w:11,h:4,vx:440,vy:0});s.cooldown=.17;
  }
  for(const bot of s.bots){
    bot.x=bot.home+Math.sin(s.t*1.5+bot.home)*24;
    if(hit(p,bot))damage(s);
  }
  if(s.shotTimer<=0){
    const bot=s.bots.find(b=>b.x>p.x+35 && b.x<p.x+415 && Math.abs(b.y-p.y)<50);
    if(bot)s.bolts.push({x:bot.x,y:bot.y+bot.h*.5,w:7,h:4,vx:-145-s.level*8,vy:0});
    s.shotTimer=1.55-s.level*.09;
  }
  if(p.x>=s.end-49 && !s.bots.some(b=>b.boss))s.status='cleared';
}
function space(s,k,dt){
  moveX(s.player,k,dt,5,635,267);
  for(const b of s.bots){
    b.x=b.baseX+Math.sin(s.t*(.65+s.level*.09))*57;
    b.y=b.baseY+Math.sin(s.t*.7)*7+Math.min(s.t*.55,80);
  }
  if(k.fire && s.cooldown<=0){
    s.shots.push({x:s.player.x+12,y:s.player.y-4,w:3,h:10,vx:0,vy:-360});s.cooldown=.17;
  }
  if(s.shotTimer<=0 && s.bots.length){
    const b=s.bots[Math.floor(Math.random()*s.bots.length)];
    s.bolts.push({x:b.x+10,y:b.y+13,w:4,h:8,vx:0,vy:96+s.level*14});
    s.shotTimer=.95-s.level*.07;
  }
}
function breaker(s,k,dt){
  const p=s.player,b=s.ball;
  moveX(p,k,dt,2,638,360);
  if(b.held){
    b.x=p.x+p.w/2-4;b.y=p.y-9;
    if(k.fire){b.held=false;b.vx=100;b.vy=-190-s.level*10;}
    return;
  }
  const lastY=b.y;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<0||b.x>632){b.x=clamp(b.x,0,632);b.vx=-b.vx;}
  if(b.y<0){b.y=0;b.vy=Math.abs(b.vy);}
  if(b.vy>0&&hit(b,p)){const angle=clamp((b.x+4-p.x)/p.w*2-1,-1,1)*1.05;
    const speed=225+s.level*13;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;b.y=p.y-b.h;}
  for(const brick of s.bricks){
    if(!hit(b,brick))continue;
    if(lastY+b.h<=brick.y||lastY>=brick.y+brick.h){b.y=b.vy>0?brick.y-b.h:brick.y+brick.h;b.vy=-b.vy;}
    else {b.x=b.vx>0?brick.x-b.w:brick.x+brick.w;b.vx=-b.vx;}
    brick.hp--;s.score+=10;s.bricks=s.bricks.filter(v=>v.hp>0);break;
  }
  if(b.y>360){damage(s);b.held=true;}
  if(!s.bricks.length)s.status='cleared';
}
export function step(s,keys,dt){
  if(s.status!=='playing')return;
  s.t+=dt;s.cooldown-=dt;s.grace=Math.max(0,s.grace-dt);s.shotTimer-=dt;
  if(s.game==='breaker'){breaker(s,keys,dt);return;}
  if(s.game==='runner')runner(s,keys,dt);else space(s,keys,dt);
  for(const shot of [...s.shots,...s.bolts]){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;}
  s.shots=s.shots.filter(shot=>{
    if(shot.x>s.camera+650 || shot.y < -15)return false;
    const bot=s.bots.find(b=>b.hp>0&&hit(b,shot));if(!bot)return true;
    if(--bot.hp===0)s.score+=bot.boss?250:25;
    return false;
  });
  s.bots=s.bots.filter(b=>b.hp>0);
  s.bolts=s.bolts.filter(shot=>{
    if(hit(s.player,shot)){damage(s);return false;}
    return shot.y<365 && shot.x>s.camera-16;
  });
  if(s.game==='space'&&!s.bots.length&&s.status==='playing')s.status='cleared';
}
