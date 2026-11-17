import test from 'node:test';
import assert from 'node:assert/strict';
import { createRacerState, spawnRacerRow, stepRacer, ROAD_LEFT, ROAD_RIGHT } from '../docs/racer.js';

function running() { const state = createRacerState(); state.status = 'running'; state.spawnIn = 100; return state; }
const random = () => 0.5;

test('racer starts with three lives, a full boost tank and a clean score', () => {
  const state = createRacerState();
  assert.equal(state.lives, 3); assert.equal(state.boost, 100); assert.equal(state.score, 0); assert.equal(state.status, 'ready');
});

test('paused and ended racers do not move or consume boost', () => {
  for (const status of ['paused', 'over']) {
    const state = running(); state.status = status; const before = structuredClone(state);
    assert.deepEqual(stepRacer(state, { right: true, boost: true }, .05), []);
    assert.deepEqual(state, before);
  }
});

test('traffic always leaves adjacent lanes open and moves the corridor at most one lane', () => {
  const state = running();
  for (let i = 0; i < 50; i++) {
    state.entities = []; const before = state.gap;
    spawnRacerRow(state, () => i % 2 ? 0.999 : 0);
    assert.ok(Math.abs(before - state.gap) <= 1); assert.ok(state.gap >= 0 && state.gap <= 3);
    for (const car of state.entities.filter(entity => entity.type === 'car')) {
      const lane = Math.floor((car.x - ROAD_LEFT) / 100);
      assert.notEqual(lane, state.gap); assert.notEqual(lane, state.gap + 1);
    }
    const coin = state.entities.find(entity => entity.type === 'coin');
    assert.ok(coin.x > ROAD_LEFT && coin.x < ROAD_RIGHT);
  }
});

test('steering and travelled distance are frame-rate independent at normal frame rates', () => {
  const a = running(), b = running();
  for (let i = 0; i < 30; i++) stepRacer(a, { right: true }, 1 / 60, random);
  for (let i = 0; i < 60; i++) stepRacer(b, { right: true }, 1 / 120, random);
  assert.ok(Math.abs(a.x - b.x) < .001); assert.ok(Math.abs(a.distance - b.distance) < .01);
});

test('drag targets use bounded steering, not teleportation', () => {
  const state = running(); const before = state.x;
  stepRacer(state, { targetX: 570 }, .01, random);
  assert.ok(state.x > before && state.x - before <= 3.91);
});

test('the road edge costs one life, clamps position and grants invulnerability', () => {
  const state = running(); state.x = ROAD_LEFT + 20;
  assert.ok(stepRacer(state, { left: true }, .05, random).includes('hit'));
  assert.equal(state.lives, 2); assert.equal(state.x, ROAD_LEFT + 19);
  stepRacer(state, { left: true }, .05, random);
  assert.equal(state.lives, 2); assert.ok(state.invulnerable > 0);
});

test('overlapping traffic only costs one life until the protection expires', () => {
  const state = running();
  state.entities = [{ type: 'car', x: state.x, y: state.y, w: 34, h: 58 }, { type: 'car', x: state.x, y: state.y, w: 34, h: 58 }];
  assert.ok(stepRacer(state, {}, 0, random).includes('hit')); assert.equal(state.lives, 2);
  stepRacer(state, {}, 0, random); assert.equal(state.lives, 2);
  state.invulnerable = 0; state.lives = 1;
  assert.ok(stepRacer(state, {}, 0, random).includes('crash')); assert.equal(state.status, 'over'); assert.equal(state.lives, 0);
});

test('coins are collected once and add thirty points', () => {
  const state = running(); state.entities = [{ type: 'coin', x: state.x, y: state.y, w: 20, h: 20 }];
  assert.ok(stepRacer(state, {}, 0, random).includes('coin')); assert.equal(state.coins, 1); assert.equal(state.score, 30);
  stepRacer(state, {}, 0, random); assert.equal(state.coins, 1); assert.equal(state.score, 30);
});

test('boost raises speed, depletes safely, and needs release before firing again', () => {
  const boost = running(), normal = running();
  stepRacer(boost, { boost: true }, .05, random); stepRacer(normal, {}, .05, random);
  assert.ok(boost.speed > normal.speed); assert.ok(boost.boost < 100);
  for (let i = 0; i < 80; i++) stepRacer(boost, { boost: true }, .05, random);
  assert.equal(boost.boostLocked, true); assert.equal(boost.boosting, false); assert.ok(boost.boost >= 0);
  stepRacer(boost, {}, .05, random); assert.equal(boost.boostLocked, false);
  stepRacer(boost, { boost: true }, .05, random); assert.equal(boost.boosting, true);
});

test('braking slows the road and allows boost to recharge', () => {
  const brake = running(), normal = running(); brake.boost = 20;
  stepRacer(brake, { brake: true, boost: true }, .05, random); stepRacer(normal, {}, .05, random);
  assert.ok(brake.speed < normal.speed); assert.ok(brake.boost > 20); assert.equal(brake.boosting, false);
});

test('speed increases over a run but remains bounded, and old traffic is removed', () => {
  const state = running(); state.elapsed = 10000;
  state.entities = [{ type: 'car', x: 160, y: 700, w: 34, h: 58 }];
  stepRacer(state, {}, .05, random);
  assert.equal(state.speed, 340); assert.equal(state.entities.length, 0);
  stepRacer(state, { boost: true }, .05, random); assert.equal(state.speed, 493);
});
