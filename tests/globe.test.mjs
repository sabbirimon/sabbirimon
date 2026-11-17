import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGlobePoint,wrapLongitude,greatCircle} from '../docs/gridworks/globe-renderer.js';
test('orthographic markers distinguish the visible hemisphere from the back',()=>{
 const front=projectGlobePoint({lat:12,lon:30},30);assert.ok(front.visible);assert.ok(Math.abs(front.x)<1e-8);assert.ok(Math.abs(front.y)<1e-8);assert.ok(front.z>.999);
 assert.equal(projectGlobePoint({lat:0,lon:180},0).visible,false);
 const rotated=projectGlobePoint({lat:0,lon:180},180);assert.ok(rotated.visible);assert.ok(Math.abs(rotated.x)<1e-8);
});
test('longitude wrapping and geographic routes cross the date line by the short arc',()=>{
 assert.equal(wrapLongitude(190),-170);assert.equal(wrapLongitude(-190),170);
 const halfway=greatCircle({lat:0,lon:170},{lat:0,lon:-170},.5);assert.ok(Math.abs(Math.abs(halfway.lon)-180)<1e-6);assert.ok(Math.abs(halfway.lat)<1e-6);
});
test('great-circle endpoints preserve campaign marker coordinates',()=>{
 const a={lat:47,lon:-90},b={lat:-24,lon:134};for(const [t,expected] of [[0,a],[1,b]]){const p=greatCircle(a,b,t);assert.ok(Math.abs(p.lat-expected.lat)<1e-8);assert.ok(Math.abs(wrapLongitude(p.lon-expected.lon))<1e-8);}
});
