import test from 'node:test';
import assert from 'node:assert/strict';
import { initWeather, WEATHER_TYPES } from '../docs/weather.js';

function harness(run) {
  const descriptors = new Map(), events = new Map(), frames = new Map();
  let now = 0, serial = 0, draws = [];
  let path=[],transform=[0,0,1,1],stack=[];
  const paint=value=>typeof value==='object'?JSON.stringify(value):value;
  const gradient=(kind,args)=>({kind,args,stops:[],addColorStop(at,color){this.stops.push([at,color]);}});
  const context = {
    clearRect(){draws=[];},fillRect(...args){draws.push([...args,paint(this.fillStyle),this.globalAlpha??1]);},globalAlpha:1,
    createLinearGradient(...args){return gradient('linear',args);},createRadialGradient(...args){return gradient('radial',args);},
    save(){stack.push([...transform]);},restore(){transform=stack.pop()||transform;},translate(x,y){transform[0]+=x;transform[1]+=y;},scale(x,y){transform[2]*=x;transform[3]*=y;},
    beginPath(){path=[];},moveTo(...args){path.push(['move',...args]);},lineTo(...args){path.push(['line',...args]);},bezierCurveTo(...args){path.push(['bezier',...args]);},quadraticCurveTo(...args){path.push(['quadratic',...args]);},arc(...args){path.push(['arc',...args]);},ellipse(...args){path.push(['ellipse',...args]);},
    stroke(){draws.push([path[0]?.[1]??0,path[0]?.[2]??0,this.lineWidth,0,paint(this.strokeStyle),this.globalAlpha,'stroke',structuredClone(path)]);},
    fill(){draws.push([transform[0],transform[1],transform[2],transform[3],paint(this.fillStyle),this.globalAlpha,'fill',structuredClone(path)]);}
  };
  const canvas = {style:{},setAttribute(){},getContext:()=>context,remove(){this.removed=true;}};
  const hero = {style:{}}, media = {matches:false,addEventListener(type,callback){events.set('media:'+type,callback);},removeEventListener(){}};
  const body = {dataset:{},append(){}}, document = {body,documentElement:{},hidden:false,createElement:()=>canvas,getElementById:()=>hero,addEventListener(type,fn){events.set(type,fn);},removeEventListener(){}};
  const values = {document,innerWidth:1200,innerHeight:800,matchMedia:()=>media,performance:{now:()=>now},addEventListener:(type,fn)=>events.set(type,fn),removeEventListener(){},requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame(id){frames.delete(id);}};
  for(const [key,value] of Object.entries(values)){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
  const api = {canvas,hero,media,document,frames,events,get draws(){return draws;},step(time){now=time;const current=[...frames.entries()];frames.clear();for(const [,fn] of current)fn(time);return structuredClone(draws);},setTime(time){now=time;}};
  try{return run(api);}finally{for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}

test('rain, heavy rain and snow evolve over multiple frames with one animation loop',()=>harness(h=>{
  const weather=initWeather();
  for(const type of ['rain','heavy-rain','snow','storm','wind']){
    weather.setWeather(type);assert(h.draws.length>0,'Effect paints immediately');
    const a=h.step(1000),b=h.step(1040);assert.notDeepEqual(a,b,`${type} must move`);assert.equal(h.frames.size,1);
    weather.setWeather(type);assert.equal(h.frames.size,1,'Same effect does not duplicate the loop');
  }
  weather.destroy();assert.equal(h.frames.size,0);
}));

test('intensity controls particle density and heavy rain is denser than rain',()=>harness(h=>{
  const weather=initWeather();weather.setWeather('rain');const vivid=h.draws.length;
  weather.setIntensity('gentle');const gentle=h.draws.length;assert(gentle<vivid*.75);assert.equal(Number(h.canvas.style.opacity),.65);
  weather.setIntensity('normal');assert(h.draws.length>gentle);weather.setIntensity('vivid');
  weather.setWeather('heavy-rain');assert(h.draws.length>vivid);assert(h.draws.length<5000,'Per-frame work stays bounded');
  weather.destroy();
}));

test('motion, reduced motion and visibility pause and resume without losing a static preview',()=>harness(h=>{
  const weather=initWeather();weather.setWeather('snow');weather.setMotion(false);assert.equal(h.frames.size,0);assert(h.draws.length>0);
  weather.setMotion(true);assert.equal(h.frames.size,1);h.document.hidden=true;h.events.get('visibilitychange')();assert.equal(h.frames.size,0);
  h.document.hidden=false;h.events.get('visibilitychange')();assert.equal(h.frames.size,1);
  h.media.matches=true;h.events.get('media:change')();assert.equal(h.frames.size,0);assert(h.draws.length>0);
  h.media.matches=false;h.events.get('media:change')();assert.equal(h.frames.size,1);weather.destroy();
}));

test('storm introduces one visible lightning strike then waits over eleven seconds',()=>harness(h=>{
  let strikes=0;const weather=initWeather({onThunder(){strikes++;}});weather.setWeather('storm');h.step(1000);assert.equal(strikes,0);
  h.step(1200);assert.equal(strikes,1);h.step(1260);assert(h.draws.some(draw=>draw[4]==='#effbff'),'Lightning bolt is painted');
  h.step(2200);h.step(10000);assert.equal(strikes,1);h.step(12800);assert.equal(strikes,2);weather.destroy();
}));

test('mounted preview uses local size and does not mutate main weather or hero',()=>harness(h=>{
  const mount={append(){},getBoundingClientRect:()=>({width:360,height:190})};const weather=initWeather({mount,id:'preview-weather'});
  assert.equal(h.canvas.width,180);assert.equal(h.canvas.height,95);assert.equal(h.canvas.style.position,'absolute');assert.equal(h.canvas.id,'preview-weather');
  weather.setWeather('earthquake');h.step(100);h.step(140);assert.equal(h.hero.style.translate,undefined);assert.equal(h.document.body.dataset.weather,undefined);
  weather.setWeather('cloudy');assert(h.draws.length>0);assert(WEATHER_TYPES.includes('lightning'));weather.destroy();
}));


test('independent density and power controls change count and speed within bounds',()=>harness(h=>{
  const weather=initWeather();weather.setWeather('snow');weather.setDensity(.25);const sparse=h.draws.length;
  weather.setDensity(2);assert(h.draws.length>sparse*3);assert(h.draws.length<800);
  weather.setPower(.25);assert(Number(h.canvas.style.opacity)<1);h.step(1000);const slowA=h.step(1040),slowB=h.step(1080);
  weather.setPower(2);h.step(1120);const fastA=h.step(1160),fastB=h.step(1200);
  const delta=(a,b)=>a.reduce((sum,draw,i)=>sum+Math.min(Math.abs(draw[1]-b[i][1]),h.canvas.height-Math.abs(draw[1]-b[i][1])),0)/a.length;
  assert(delta(fastA,fastB)>delta(slowA,slowB)*2,'More power produces visibly faster snow');
  weather.setDensity(99);assert(h.draws.length<800);weather.destroy();
}));


test('smooth weather uses curves, tapered gradients and reflected lightning without altering pixel snow',()=>harness(h=>{
 const weather=initWeather();weather.setWeather('rain');assert.equal(h.canvas.style.imageRendering,'auto');assert(h.draws.some(d=>d[6]==='stroke'&&d[4].includes('linear')));
 weather.setWeather('wind');assert(h.draws.some(d=>d[7]?.some(segment=>segment[0]==='bezier')));
 weather.setWeather('fog');assert(h.draws.some(d=>d[6]==='fill'&&d[4].includes('radial')));
 weather.setWeather('lightning');h.step(1200);h.step(1280);assert(h.draws.some(d=>d[7]?.some(segment=>segment[0]==='quadratic')),'Reflection ripples accompany the bolt');
 weather.setWeather('snow');assert.equal(h.canvas.style.imageRendering,'pixelated');assert(h.draws.every(d=>d[2]<=2&&d[3]<=2),'Small snowflake sizes remain unchanged');weather.destroy();
}));


test('glass rain and condensation animate without blocking motion controls',()=>harness(h=>{
 const weather=initWeather();
 for(const type of ['glass-rain','glass-fog']){weather.setWeather(type);assert(h.draws.length>0);assert.equal(h.canvas.style.imageRendering,'auto');const a=h.step(1000),b=h.step(1040);assert.notDeepEqual(a,b);weather.setMotion(false);assert.equal(h.frames.size,0);weather.setMotion(true);assert.equal(h.frames.size,1);}
 weather.destroy();
}));

test('the three snow levels produce progressively denser snowfall', () => harness(h => {
  const weather = initWeather();
  const counts = ['light-snow', 'snow', 'heavy-snow'].map(type => {
    weather.setWeather(type);
    assert.equal(h.document.body.dataset.weather, type);
    return h.draws.length;
  });
  assert.ok(counts[0] > 0 && counts[0] < counts[1] && counts[1] < counts[2]);
  weather.destroy();
}));
