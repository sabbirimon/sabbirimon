import test from 'node:test';
import assert from 'node:assert/strict';
import { CARTRIDGES,newStage,STAGES,step } from '../docs/arcade/games.js';

const idle={left:false,right:false,jump:false,fire:false};
test('every stage builds playable opponents or bricks and carries score and lives',()=>{
  for(const game of Object.keys(CARTRIDGES)) for(let n=1;n<=STAGES;n++){
    const s=newStage(game,n,200,2);
    assert.equal(s.score,200);assert.equal(s.lives,2);assert.ok(s.bricks.length+s.bots.length);
  }
});
test('a runner must clear the guardian and reach the exit',()=>{
  const s=newStage('runner');
  s.player.x=s.end-46;step(s,idle,1/120);assert.equal(s.status,'playing');
  s.bots=[];step(s,idle,1/120);assert.equal(s.status,'cleared');
});
test('a brick hit clears the last brick and a missed ball costs one life',()=>{
  const s=newStage('breaker');s.bricks=[{x:100,y:100,w:30,h:12,hp:1}];
  Object.assign(s.ball,{x:110,y:91,w:8,h:8,vy:180,vx:0,held:false});step(s,idle,1/120);
  assert.equal(s.status,'cleared');assert.equal(s.score,10);
  const t=newStage('breaker');Object.assign(t.ball,{held:false,y:362});step(t,idle,1/120);
  assert.equal(t.lives,2);assert.equal(t.ball.held,true);
});
test('space fire can clear the final ship',()=>{
  const s=newStage('space');s.bots=s.bots.slice(0,1);step(s,idle,1/120);
  const b=s.bots[0];s.shots.push({x:b.x+5,y:b.y+8,w:3,h:6,vx:0,vy:-200});
  step(s,idle,1/120);assert.equal(s.status,'cleared');assert.equal(s.score,25);
});
