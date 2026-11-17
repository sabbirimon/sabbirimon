import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnakeState, placeSnakeFood, queueSnakeDirection, stepSnake, createSurfState, spawnSurfRow, stepSurf } from '../docs/arcade.js';
const random = () => 0.5;

test('food is selected only from empty cells, including the last remaining square', () => {
  const s = createSnakeState(random);
  assert.ok(!s.body.some(p => p.x === s.food.x && p.y === s.food.y));
  s.cols = 2; s.rows = 2; s.body = [{x:0,y:0},{x:1,y:0},{x:0,y:1}];
  assert.deepEqual(placeSnakeFood(s, () => 0), {x:1,y:1});
  s.body.push({x:1,y:1}); assert.equal(placeSnakeFood(s), null);
});
test('reversal and rapid queued input cannot reverse into the neck', () => {
  const s = createSnakeState(random); s.status='running';
  assert.equal(queueSnakeDirection(s, 'left'), false);
  assert.equal(queueSnakeDirection(s, 'up'), true);
  assert.equal(queueSnakeDirection(s, 'down'), false);
  assert.equal(queueSnakeDirection(s, 'left'), true);
  assert.equal(queueSnakeDirection(s, 'down'), false);
  stepSnake(s,random); assert.deepEqual(s.body[0],{x:7,y:7});
  stepSnake(s,random); assert.deepEqual(s.body[0],{x:6,y:7});
});
test('growth adds exactly one cell and ten points', () => {
  const s=createSnakeState(random); s.status='running'; s.food={x:8,y:8};
  assert.equal(stepSnake(s,random),'eat'); assert.equal(s.body.length,4); assert.equal(s.score,10);
});
test('a departing tail cell is traversable but the body is not', () => {
  const s=createSnakeState(random); s.status='running'; s.direction='left';
  s.body=[{x:2,y:2},{x:2,y:3},{x:1,y:3},{x:1,y:2}]; s.food={x:0,y:0};
  assert.equal(stepSnake(s,random),'move');
  s.body=[{x:2,y:2},{x:1,y:2},{x:1,y:3},{x:2,y:3}];
  assert.equal(stepSnake(s,random),'crash'); assert.equal(s.status,'over');
});
test('wall collision ends game and paused games do not advance', () => {
  const s=createSnakeState(random); s.status='paused'; const before=structuredClone(s);
  assert.equal(stepSnake(s),'idle'); assert.deepEqual(s,before);
  s.status='running';s.body=[{x:23,y:2}];s.direction='right'; assert.equal(stepSnake(s),'crash');
});
test('filling the final board square produces a victory', () => {
  const s={cols:2,rows:2,body:[{x:0,y:0},{x:0,y:1},{x:1,y:1}],direction:'right',queue:[],food:{x:1,y:0},score:0,status:'running'};
  assert.equal(stepSnake(s,random),'win'); assert.equal(s.status,'won'); assert.equal(s.food,null);
});
test('surf rows preserve two safe lanes and only shift the gap one lane', () => {
  const s=createSurfState();
  for(let i=0;i<100;i++) {const before=s.gap;s.entities=[];spawnSurfRow(s,()=>0);assert.ok(Math.abs(s.gap-before)<=1);assert.ok(s.gap>=0&&s.gap<=6);
  for(const e of s.entities.filter(e=>e.type==='reef')) {const lane=Math.floor(e.x/90);assert.notEqual(lane,s.gap);assert.notEqual(lane,s.gap+1);}}
});
test('surf collision costs one life and invulnerability prevents repeated hits', () => {
  const s=createSurfState();s.status='running';s.spawnIn=10;
  s.entities=[{type:'reef',x:s.x,y:s.y,w:45,h:40},{type:'reef',x:s.x,y:s.y,w:45,h:40}];
  assert.ok(stepSurf(s,{},0,'normal',random).includes('hit'));assert.equal(s.lives,2);
  stepSurf(s,{},0.01,'normal',random);assert.equal(s.lives,2);
  s.invulnerable=0; s.lives=1;
  assert.ok(stepSurf(s,{},0,'normal',random).includes('crash')); assert.equal(s.status,'over');
});
test('surf coins score once and player remains inside bounds', () => {
  const s=createSurfState();s.status='running';s.spawnIn=10;s.entities=[{type:'coin',x:s.x,y:s.y,w:19,h:19}];
  assert.ok(stepSurf(s,{},0,'normal',random).includes('coin')); assert.equal(s.score,25);assert.equal(s.coins,1);
  for(let i=0;i<200;i++) stepSurf(s,{left:true,up:true},.05,'normal',random);
  assert.ok(s.x>=22&&s.y>=90);assert.equal(s.coins,1);
});
test('surf movement and distance are frame-rate independent at normal frame rates', () => {
  const a=createSurfState(),b=createSurfState();a.status=b.status='running';a.spawnIn=b.spawnIn=100;
  for(let i=0;i<60;i++)stepSurf(a,{right:true},1/60,'normal',random);
  for(let i=0;i<120;i++)stepSurf(b,{right:true},1/120,'normal',random);
  assert.ok(Math.abs(a.x-b.x)<0.01);assert.ok(Math.abs(a.distance-b.distance)<0.01);
});
