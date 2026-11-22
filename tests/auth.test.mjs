import test from 'node:test';
import assert from 'node:assert/strict';
import { base64UrlEncode, generateCodeVerifier, isConfigured, configurationMessage, mergeProgress, readLocalProgress, LOCAL_PROGRESS_KEYS } from '../docs/auth.js';
import { PIXEL_ANIMATIONS, pixelFrame, renderPixelArt, initPixelArt } from '../docs/pixel-art.js';

test('base64UrlEncode produces URL-safe base64 with no padding',()=>{
 const encoded=base64UrlEncode(new Uint8Array([251,255,190,0,1]));
 assert.match(encoded,/^[A-Za-z0-9_-]+$/);
 assert.ok(!encoded.includes('='));
 assert.ok(!encoded.includes('+'));
 assert.ok(!encoded.includes('/'));
 assert.equal(encoded,base64UrlEncode([251,255,190,0,1]));
 assert.equal(base64UrlEncode(new Uint8Array(0)),'');
 assert.equal(base64UrlEncode(new Uint8Array([0,0,0])),'AAAA');
});

test('generateCodeVerifier returns a URL-safe string of the right length and charset',()=>{
 for(let i=0;i<25;i++){
  const verifier=generateCodeVerifier();
  assert.equal(typeof verifier,'string');
  assert.ok(verifier.length>=43&&verifier.length<=128);
  assert.match(verifier,/^[A-Za-z0-9._~-]+$/);
 }
 assert.notEqual(generateCodeVerifier(),generateCodeVerifier());
});

test('isConfigured reports false for the placeholder values and never throws',()=>{
 assert.equal(isConfigured(),false);
 assert.equal(configurationMessage(),'Sign-in is not configured yet.');
 assert.equal(typeof isConfigured(),'boolean');
});

test('the pixel-art module exports at least four distinct animation names',()=>{
 assert.ok(Array.isArray(PIXEL_ANIMATIONS));
 assert.ok(PIXEL_ANIMATIONS.length>=4);
 assert.equal(new Set(PIXEL_ANIMATIONS).size,PIXEL_ANIMATIONS.length);
 for(const name of PIXEL_ANIMATIONS)assert.equal(typeof name,'string');
});

test('every pixel animation draws a non-empty frame of chunky rectangles',()=>{
 for(const name of PIXEL_ANIMATIONS){
  const frame=pixelFrame(name,0);
  assert.ok(Array.isArray(frame)&&frame.length>0,name);
  for(const [x,y,width,height,fill] of frame){
   assert.equal(Number.isInteger(x)&&Number.isInteger(y)&&Number.isInteger(width)&&Number.isInteger(height),true,name);
   assert.ok(width>0&&height>0,name);
   assert.match(fill,/^#[0-9a-f]{6}$/i,name);
  }
  assert.ok(pixelFrame(name,1).length>0,name);
  assert.ok(renderPixelArt(name).includes('<rect'),name);
 }
 assert.deepEqual(pixelFrame('not-a-real-animation'),[]);
});

test('initPixelArt renders one of the known animations into the container',()=>{
 const container={ innerHTML:'', attributes:{}, setAttribute(name,value){this.attributes[name]=value;}, };
 const root={ querySelector(){return container;} };
 const chosen=initPixelArt(root);
 assert.ok(PIXEL_ANIMATIONS.includes(chosen));
 assert.equal(container.attributes['data-pixel-art-animation'],chosen);
 assert.ok(container.innerHTML.includes('<svg'));
 assert.equal(initPixelArt({querySelector(){return null;}}),null);
});

test('initPixelArt honours a preferred animation and falls back when it is unknown',()=>{
 const container={ innerHTML:'', attributes:{}, setAttribute(name,value){this.attributes[name]=value;}, };
 const root={ querySelector(){return container;} };
 assert.equal(initPixelArt(root,'crt'),'crt');
 assert.equal(container.attributes['data-pixel-art-animation'],'crt');
 assert.ok(container.innerHTML.includes('<svg'));
 assert.ok(PIXEL_ANIMATIONS.includes(initPixelArt(root,'not-a-real-animation')));
 assert.ok(PIXEL_ANIMATIONS.includes(initPixelArt(root,null)));
});

test('the CRT mascot sprite is present and draws a shell and a lit screen',()=>{
 assert.ok(PIXEL_ANIMATIONS.includes('crt'));
 const frame=pixelFrame('crt',0);
 assert.ok(frame.length>0);
 const fills=new Set(frame.map(row=>row[4]));
 assert.ok(fills.has('#e8e2d8'),'shell colour');
 assert.ok(fills.has('#7dd3fc'),'screen colour');
 assert.ok(pixelFrame('crt',1).length>0);
 assert.notDeepEqual(pixelFrame('crt',0),pixelFrame('crt',1));
});

test('mergeProgress keeps the better value per key and never loses a key',()=>{
 assert.deepEqual(mergeProgress({'a':10},{'a':20}),{a:20});
 assert.deepEqual(mergeProgress({'a':30},{'a':20}),{a:30});
 assert.deepEqual(mergeProgress({'a':10},{'b':20}),{a:10,b:20});
 assert.deepEqual(mergeProgress({'b':20},{'a':10}),{a:10,b:20});
 assert.deepEqual(mergeProgress({},{}),{});
 assert.deepEqual(mergeProgress(null,null),{});
 assert.deepEqual(mergeProgress({'a':1},{a:'x'}),{a:'x'});
 const merged=mergeProgress({'a':1,'b':2,'c':3},{'b':9,'d':4});
 assert.deepEqual(merged,{a:1,b:9,c:3,d:4});
 assert.deepEqual(Object.keys(merged).sort(),['a','b','c','d']);
});

test('mergeProgress merges nested save objects leaf by leaf, keeping the best value',()=>{
 assert.deepEqual(mergeProgress({'imon-dev-slots-v1':{xp:5}},{'imon-dev-slots-v1':{xp:9}}),{'imon-dev-slots-v1':{xp:9}});
 assert.deepEqual(mergeProgress({'imon-dev-slots-v1':{xp:9}},{'imon-dev-slots-v1':{xp:5}}),{'imon-dev-slots-v1':{xp:9}});
 assert.deepEqual(mergeProgress({'imon-gridworks-progress-v1':{completed:[1,2],active:3}},{'imon-gridworks-progress-v1':{completed:[1,2,3],active:2}}),{'imon-gridworks-progress-v1':{completed:[1,2,3],active:3}});
 assert.deepEqual(mergeProgress({'k':{a:1}},{'k':{b:2}}),{'k':{a:1,b:2}});
});

test('the tracked local progress keys cover every game that stores a score',()=>{
 for(const key of ['sabbir-arcade-v1-snake-easy','sabbir-arcade-v1-surf-easy','sabbir-2048-best-v1','imon-rally-best-v1','imon-quiz-best-5','imon-quiz-best-20','imon-quiz-best-30','imon-dev-slots-v1','imon-gridworks-progress-v1'])assert.ok(LOCAL_PROGRESS_KEYS.includes(key),key);
 assert.equal(new Set(LOCAL_PROGRESS_KEYS).size,LOCAL_PROGRESS_KEYS.length);
});

test('readLocalProgress returns an empty blob when storage is unavailable',()=>{
 assert.deepEqual(readLocalProgress(),{});
});
