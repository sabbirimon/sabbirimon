import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../docs/systems-models.js';
import {mastery} from '../docs/mastery.js';
import {mergeProgress} from '../docs/auth.js';

test('each model produces a finite measurement and a diagram across its input range',()=>{
  const answers=[62,7,2,2,9,15,30,28,6,40,1,8,80,9,14,110,800];
  assert.equal(scenarios.length,answers.length);
  scenarios.forEach((s,index)=>{
    assert.equal(s.value(s.target),answers[index],s.id);
    for(let n=s.min;n<=s.max;n++){assert.ok(Number.isFinite(s.value(n)),s.id);assert.ok(s.visual(n).length,s.id);}
  });
});
test('levels count known distinct solves and completing a chapter awards one badge',()=>{
  const course={exercises:scenarios};
  const saved=mergeProgress({'imon-systems-v1':{solved:['network-subnet','unknown']}},{'imon-systems-v1':{solved:['network-switch','network-subnet']}})['imon-systems-v1'];
  const result=mastery(course,saved);
  assert.equal(result.done,2);
  assert.equal(result.level,1);
  assert.equal(result.goal,3);
  assert.deepEqual(result.badges,['Networking · CCNA foundations']);
  assert.equal(result.next.id,'support-memory');
});
