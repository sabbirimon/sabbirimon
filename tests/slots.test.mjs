import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_SYMBOLS, DEV_REWARDS, evaluateReels, createSpin, awardSpin, cleanSlotsState } from '../docs/slots.js';

test('matching outcomes award deterministic positive XP, including no match', () => {
  assert.equal(evaluateReels(['bug', 'bug', 'bug']).xp, 200);
  assert.equal(evaluateReels(['bug', 'coffee', 'bug']).xp, 75);
  assert.equal(evaluateReels(['bug', 'coffee', 'chip']).xp, 25);
  assert.throws(() => evaluateReels(['bug', 'bogus', 'bug']), TypeError);
  assert.throws(() => evaluateReels(['bug']), TypeError);
});

test('all 216 equally possible reel combinations produce expected match counts', () => {
  const count = { triple: 0, pair: 0, build: 0 };
  for (const a of SLOT_SYMBOLS) for (const b of SLOT_SYMBOLS) for (const c of SLOT_SYMBOLS) count[evaluateReels([a, b, c]).tier]++;
  assert.deepEqual(count, { triple: 6, pair: 90, build: 120 });
});

test('reels and reward each consume an independent random sample', () => {
  const values = [0, .2, .999999, .999999];
  const spin = createSpin(() => values.shift());
  assert.deepEqual(spin.reels, ['terminal', 'bug', 'braces']);
  assert.equal(spin.cardId, DEV_REWARDS.at(-1).id);
  assert.equal(values.length, 0);
  assert.throws(() => createSpin(() => 1), RangeError);
  assert.throws(() => createSpin(() => NaN), RangeError);
});

test('every draw awards a collectible; duplicate draws accumulate and state is immutable', () => {
  const initial = cleanSlotsState();
  const outcome = { reels: ['terminal', 'bug', 'coffee'], cardId: 'duck' };
  const first = awardSpin(initial, outcome);
  assert.equal(first.isNew, true);
  assert.equal(first.state.xp, 25);
  assert.equal(first.state.collection.duck, 1);
  const second = awardSpin(first.state, outcome);
  assert.equal(second.isNew, false);
  assert.equal(second.state.collection.duck, 2);
  assert.equal(second.state.spins, 2);
  assert.equal(second.state.xp, 50);
  assert.deepEqual(initial, { xp: 0, spins: 0, collection: {} });
  assert.equal(first.state.collection.duck, 1);
  assert.throws(() => awardSpin(initial, { ...outcome, cardId: '<script>' }), TypeError);
});

test('persisted state rejects malformed values and unknown card identifiers', () => {
  assert.deepEqual(cleanSlotsState(null), { xp: 0, spins: 0, collection: {} });
  assert.deepEqual(cleanSlotsState({ xp: -10, spins: Infinity, collection: { duck: 3.8, coffee: -5, notACard: 9 } }), { xp: 0, spins: 0, collection: { duck: 3 } });
  assert.equal(cleanSlotsState({ xp: 1e20 }).xp, 1e9);
});

test('three and five visible rows consume one independent sample per cell plus one fact', () => {
  for (const rowCount of [3,5]) {
    let calls=0;const spin=createSpin(()=>{calls++;return ((calls-1)%6)/6;},rowCount);
    assert.equal(spin.rows.length,rowCount);assert.ok(spin.rows.every(row=>row.length===3));assert.equal(calls,rowCount*3+1);
    assert.deepEqual(spin.reels,spin.rows[Math.floor(rowCount/2)]);
  }
  assert.throws(()=>createSpin(Math.random,4),RangeError);
});
test('all visible rows pay, and highest tier decorates the technical fact', () => {
  const outcome={rows:[['bug','bug','bug'],['chip','chip','rocket'],['bug','coffee','chip']],cardId:'duck'};
  const award=awardSpin(cleanSlotsState(),outcome);
  assert.equal(award.result.xp,300);assert.equal(award.result.prizeTier,'grand');assert.equal(award.card.prizeTier,'grand');
  assert.deepEqual(award.result.winningRows,[0,1]);assert.equal(award.state.collection.duck,1);
  const mini=awardSpin({}, {rows:[['bug','coffee','chip'],['chip','chip','rocket'],['coffee','bug','terminal']],cardId:'coffee'});
  assert.equal(mini.result.prizeTier,'mini');assert.equal(mini.result.xp,125);
});
