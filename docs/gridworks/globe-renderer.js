/** Original hand-drawn geography and procedural pixel terrain. No external tiles. */
const DEG=Math.PI/180;
export const wrapLongitude=lon=>((lon+180)%360+360)%360-180;
export function projectGlobePoint(point,yaw=0,tilt=12){const lat=point.lat*DEG,lon=(point.lon-yaw)*DEG,t=tilt*DEG;const x=Math.cos(lat)*Math.sin(lon),y=Math.sin(lat)*Math.cos(t)-Math.cos(lat)*Math.cos(lon)*Math.sin(t),z=Math.sin(lat)*Math.sin(t)+Math.cos(lat)*Math.cos(lon)*Math.cos(t);return{x,y,z,visible:z>.035};}
export function greatCircle(a,b,t){const vector=p=>[Math.cos(p.lat*DEG)*Math.cos(p.lon*DEG),Math.sin(p.lat*DEG),Math.cos(p.lat*DEG)*Math.sin(p.lon*DEG)],u=vector(a),v=vector(b),angle=Math.acos(Math.max(-1,Math.min(1,u.reduce((n,x,i)=>n+x*v[i],0)))),s=Math.sin(angle);if(Math.abs(s)<1e-7)return{lat:a.lat+(b.lat-a.lat)*t,lon:a.lon+wrapLongitude(b.lon-a.lon)*t};const p=u.map((x,i)=>(x*Math.sin((1-t)*angle)+v[i]*Math.sin(t*angle))/s);return{lat:Math.asin(p[1])*180/Math.PI,lon:Math.atan2(p[2],p[0])*180/Math.PI};}
const LAND=[
 [[-168,71],[-151,70],[-139,60],[-126,61],[-132,70],[-114,76],[-95,81],[-75,76],[-60,62],[-52,49],[-65,45],[-81,25],[-86,21],[-88,16],[-83,10],[-78,8],[-83,15],[-97,17],[-105,23],[-115,30],[-124,42],[-130,52],[-143,57],[-158,58],[-168,64]],
 [[-53,83],[-28,80],[-20,70],[-38,60],[-49,60],[-60,69],[-63,77]],
 [[-81,12],[-69,11],[-60,7],[-49,0],[-35,-7],[-39,-20],[-48,-29],[-55,-35],[-65,-55],[-72,-53],[-75,-40],[-72,-30],[-80,-15],[-82,-4]],
 [[-10,36],[-9,43],[0,44],[5,48],[-5,49],[-1,55],[8,57],[12,55],[16,60],[8,62],[16,70],[29,71],[33,61],[44,65],[59,69],[77,73],[101,76],[121,73],[143,71],[166,66],[179,67],[179,54],[161,58],[149,50],[141,44],[135,37],[127,35],[123,25],[114,22],[108,10],[103,1],[99,8],[97,19],[88,22],[80,8],[75,9],[70,23],[59,26],[52,16],[43,12],[35,28],[35,35],[29,41],[27,36],[23,36],[20,40],[18,40],[17,43],[14,42],[16,38],[13,37],[9,44],[3,42],[2,36]],
 [[-17,36],[-5,36],[10,37],[24,32],[33,31],[35,23],[43,12],[51,12],[47,3],[42,-12],[35,-24],[27,-35],[18,-34],[12,-19],[10,-2],[1,5],[-10,5],[-17,16]],
 [[112,-22],[115,-34],[126,-35],[136,-36],[145,-39],[153,-28],[153,-17],[144,-11],[135,-12],[129,-15],[121,-18],[115,-20]],
 [[47,-13],[50,-16],[47,-26],[44,-25],[43,-20]],
 [[130,31],[136,34],[142,40],[146,44],[143,46],[139,42],[136,36],[130,34]],
 [[95,5],[102,0],[106,-6],[104,-7],[98,-2]],[[108,7],[117,7],[120,1],[115,-4],[110,-1]],[[106,-6],[115,-7],[121,-9],[115,-10],[108,-8]],[[120,-2],[125,1],[125,-5],[121,-6]],[[131,-2],[141,-3],[150,-7],[147,-10],[138,-7]],
 [[173,-34],[178,-38],[175,-42],[171,-41]],[[170,-41],[173,-44],[166,-47],[166,-45]],
 [[-8,50],[-2,50],[1,53],[-4,59],[-7,58]],[[ -10,51],[-6,52],[-6,55],[-10,55]],
 [[-25,64],[-15,64],[-13,67],[-22,67]],[[117,19],[121,19],[125,11],[123,6],[120,10]],
 [[-84,23],[-76,22],[-74,20],[-81,21]],[[166,-20],[169,-21],[167,-23]],
 [[-180,-76],[-155,-73],[-129,-75],[-100,-72],[-80,-67],[-65,-68],[-62,-75],[-36,-78],[0,-70],[36,-69],[70,-72],[108,-66],[145,-68],[180,-74],[180,-90],[-180,-90]]
];
const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return(hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
let cachedTexture;
function texture(){
 if(cachedTexture)return cachedTexture;const w=512,h=256,mask=document.createElement('canvas');mask.width=w;mask.height=h;const c=mask.getContext('2d');c.fillStyle='#fff';
 for(const polygon of LAND){c.beginPath();polygon.forEach(([lon,lat],i)=>{const x=(lon+180)/360*w,y=(90-lat)/180*h;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.fill();}
 const land=c.getImageData(0,0,w,h).data,pixels=new Uint8ClampedArray(w*h*3),clouds=new Uint8Array(w*h);
 const isLand=(x,y)=>y>=0&&y<h&&land[(y*w+(x+w)%w)*4+3]>100;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const lat=90-y/h*180,lon=x/w*360-180,n=Math.floor(noise(x*.095,y*.095)*5)/4,fine=hash(x,y);let color;
  if(isLand(x,y)){
   const polar=lat>69||lat< -69||lon> -63&&lon< -20&&lat>60;
   const desert=(lon>-18&&lon<54&&lat>14&&lat<32)||(lon>57&&lon<105&&lat>34&&lat<47)||(lon>115&&lon<146&&lat< -19&&lat> -33);
   const mountain=(lon> -126&&lon< -105&&lat>32&&lat<60&&n>.45)||(lon> -78&&lon< -67&&lat<6&&lat> -48&&n>.4)||(lon>67&&lon<101&&lat>26&&lat<37&&n>.35);
   color=polar?[202+n*42,222+n*28,229+n*24]:mountain?[115+n*74,135+n*66,134+n*66]:desert?[167+n*52,141+n*48,86+n*43]:Math.abs(lat)<15?[30+n*35,145+n*65,63+n*38]:[47+n*49,153+n*64,71+n*38];
   if(!polar&&!desert&&fine>.88)color=color.map(v=>v+13);
  }else{
   const coast=isLand(x+1,y)||isLand(x-1,y)||isLand(x,y+1)||isLand(x,y-1),shallow=coast||isLand(x+2,y)||isLand(x-2,y)||isLand(x,y+2)||isLand(x,y-2);
   color=coast?[68,211,223]:shallow?[24,158,195]:[12+n*18,71+n*33,145+n*48];
   if(Math.abs(lat)>75)color=[135+n*48,182+n*38,207+n*30];
  }
  const i=y*w+x;pixels.set(color,i*3);
  const broad=noise(x*.028+8,y*.06),detail=noise(x*.085+31,y*.09);const band=.54+Math.sin(lat*.14+lon*.025)*.07;clouds[i]=Math.max(0,Math.min(210,(broad*.7+detail*.3-band)*850));
 }
 cachedTexture={w,h,pixels,clouds};return cachedTexture;
}
export function createGlobeRenderer(canvas,{onProject=()=>{},points=[]}={}){
 const ctx=canvas.getContext('2d'),tex=texture(),planet=document.createElement('canvas');const size=216,center=108,radius=101;planet.width=planet.height=size;const pc=planet.getContext('2d'),image=pc.createImageData(size,size),samples=[];
 canvas.width=420;canvas.height=360;const tilt=12*DEG;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x-center)/radius,ny=(center-y)/radius,d=nx*nx+ny*ny,idx=(y*size+x)*4;if(d>1){if(d<1.055){image.data[idx]=62;image.data[idx+1]=176;image.data[idx+2]=218;image.data[idx+3]=Math.round((1.055-d)/.055*105);}continue;}const nz=Math.sqrt(1-d),lat=Math.asin(ny*Math.cos(tilt)+nz*Math.sin(tilt)),lon=Math.atan2(nx,nz*Math.cos(tilt)-ny*Math.sin(tilt));const shade=(.29+.71*Math.max(0,-nx*.42+ny*.45+nz*.78))*(.8+.2*nz);samples.push({idx,tx:(lon/(Math.PI*2)+.5)*tex.w,ty:Math.min(tex.h-1,Math.floor((.5-lat/Math.PI)*tex.h)),shade});image.data[idx+3]=255;}
 let yaw=-95,auto=false,open=false,last=0,frame=0,routes=[],drag=null;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function render(time=0){frame=0;if(!open||document.hidden)return;if(time-last<66){frame=requestAnimationFrame(render);return;}const dt=Math.min(.2,(time-last)/1000||0);last=time;if(auto&&!reduced.matches&&document.body.dataset.motion!=='off'&&!drag)yaw=wrapLongitude(yaw+dt*3);
  const offset=yaw/360*tex.w,cloudDrift=Math.floor(time/18000)%tex.w;
  for(const p of samples){const tx=((Math.floor(p.tx+offset)%tex.w)+tex.w)%tex.w,source=(p.ty*tex.w+tx)*3,cloud=Math.floor(tex.clouds[p.ty*tex.w+(tx+cloudDrift)%tex.w]/255*5)/5*.86;for(let k=0;k<3;k++)image.data[p.idx+k]=(tex.pixels[source+k]*(1-cloud)+(k===0?237:k===1?244:249)*cloud)*p.shade;}
  pc.putImageData(image,0,0);ctx.fillStyle='#050d1c';ctx.fillRect(0,0,420,360);
  for(let i=0;i<85;i++){const x=(i*137.51+11)%420,y=(i*73.17+19)%360;ctx.fillStyle=i%6?'#8da9d057':'#d8e7ffb0';ctx.fillRect(x,y,i%8?1:2,i%8?1:2);}
  ctx.strokeStyle='#4bb8df1a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(210,181,176,54,-.2,0,Math.PI*2);ctx.stroke();
  ctx.imageSmoothingEnabled=false;ctx.drawImage(planet,57,27,306,306);
  const mapPoint=p=>({x:210+p.x*143,y:180-p.y*143});
  for(const route of routes){ctx.strokeStyle=route.complete?'#9fefc5b0':'#8ca6cc28';ctx.lineWidth=route.complete?1.4:1;ctx.setLineDash(route.complete?[]:[2,4]);ctx.beginPath();let drawing=false;for(let t=0;t<=1.001;t+=.04){const p=projectGlobePoint(greatCircle(route.a,route.b,t),yaw);if(!p.visible){drawing=false;continue;}const s=mapPoint(p);drawing?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);drawing=true;}ctx.stroke();}ctx.setLineDash([]);
  onProject(points.map(point=>{const p=projectGlobePoint(point,yaw);return{...p,...mapPoint(p)};}));
  if(auto&&!reduced.matches&&document.body.dataset.motion!=='off')frame=requestAnimationFrame(render);
 }
 function draw(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(open)frame=requestAnimationFrame(t=>render(t+70));}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,yaw};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=wrapLongitude(drag.yaw+(drag.x-e.clientX)*.6);draw();});const release=()=>{drag=null;canvas.classList.remove('is-dragging');draw();};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 document.addEventListener('visibilitychange',draw);reduced.addEventListener('change',draw);new MutationObserver(draw).observe(document.body,{attributes:true,attributeFilter:['data-motion']});
 return{start(){open=true;draw();},stop(){open=false;if(frame)cancelAnimationFrame(frame);frame=0;},rotate(degrees){yaw=wrapLongitude(yaw+degrees);draw();},focus(point){yaw=point.lon;draw();},setAuto(value){auto=Boolean(value);draw();return auto&&!reduced.matches;},setRoutes(value){routes=value;draw();},draw};
}
