// Contacts use the animation clock so a pause also freezes flying ice and cracks.
export function createHail(onImpact) {
  let elapsed = 0;
  const lanes = Array.from({length: 8}, (_, i) => ({
    phase: .6 + i * .81, period: 4.8 + i * .39, cycle: -1
  }));
  const noise = n => { const x = Math.sin(n * 78.233) * 43758.5453; return x - Math.floor(x); };

  function stone(ctx, x, y, radius, rotation) {
    const ice = ctx.createRadialGradient(x-radius*.35,y-radius*.45,0,x,y,radius*1.25);
    ice.addColorStop(0,'#f2fbff'); ice.addColorStop(.45,'#c5e1ed');
    ice.addColorStop(.82,'#829dab'); ice.addColorStop(1,'rgba(77,104,119,.23)');
    ctx.fillStyle=ice; ctx.beginPath(); ctx.ellipse(x,y,radius,radius*.83,rotation,0,Math.PI*2); ctx.fill();
  }

  function cracks(ctx,x,y,seed,age,size) {
    const fade = Math.min(1,age*16) * Math.max(0,1-age/3.4);
    ctx.globalAlpha=fade*.7; ctx.lineWidth=.8; ctx.strokeStyle='#ddecf5';
    ctx.beginPath();
    for(let j=0;j<5;j++) {
      const angle=(j+noise(seed+j)*.5)*Math.PI*2/5;
      const length=size*(1+noise(seed-j)*1.7)*Math.min(1,age*12);
      const dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
      const bendX=x+dx*.47-dy*.11,bendY=y+dy*.47+dx*.11;
      ctx.moveTo(x,y);ctx.lineTo(bendX,bendY);ctx.lineTo(x+dx,y+dy);
      ctx.moveTo(bendX,bendY);ctx.lineTo(bendX+dx*.16+dy*.22,bendY+dy*.16-dx*.22);
    }
    ctx.stroke();
  }

  return function draw(ctx,w,h,particles,dt,density,strength,power) {
    elapsed+=dt*(.65+.35*power);
    const count=Math.min(particles.length,Math.ceil(46*density*strength));
    for(let i=0;i<count;i++) {
      const p=particles[i], depth=p.depth, progress=(p.y+elapsed*(.16+.38*depth)*p.speed)%1;
      const x=((p.x-progress*.19+1)%1)*w, y=progress*h;
      ctx.globalAlpha=.23+depth*.55;
      stone(ctx,x,y,.65+depth*depth*2.9,p.phase);
    }
    const active=Math.min(lanes.length,Math.max(1,Math.round(3*density*strength)));
    for(let i=0;i<active;i++) {
      const lane=lanes[i], t=elapsed+lane.phase, cycle=Math.floor(t/lane.period);
      const age=t%lane.period-1.05, seed=cycle*23+i*7+5;
      const x=(.08+.84*noise(seed))*w, y=(.16+.63*noise(seed+1))*h;
      const radius=(4+noise(seed+2)*5)*Math.min(1,w/400);
      if(age<0) {
        lane.cycle=cycle-1;
        const approach=1+age/1.05;
        ctx.globalAlpha=.45+approach*.5;
        stone(ctx,x-age*w*.17,y+age*h*.52,radius*(.25+.75*approach*approach),seed+age);
      } else {
        if(lane.cycle!==cycle && dt>0) {
          lane.cycle=cycle;
          if(age<.1)onImpact(radius);
        }
        if(age<.8) for(let j=0;j<7;j++){
          const a=noise(seed+j+6)*Math.PI*2, speed=42+noise(seed+j+17)*90;
          ctx.globalAlpha=Math.max(0,1-age/.8);
          stone(ctx,x+Math.cos(a)*speed*age,y+Math.sin(a)*speed*age+135*age*age,radius*(.11+.13*noise(j+seed)),a+age*3);
        }
        if(i===0 && age<3.4) cracks(ctx,x,y,seed,age,radius*1.9);
      }
    }
    ctx.globalAlpha=1;
  };
}
