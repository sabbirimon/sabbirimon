import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_LAB_PREFERRED_KEY,
  AI_LAB_PREFERRED_KEY,
  loadPreferred,
  savePreferred,
  togglePreferred,
  filterPreferred,
  preferredChapters,
  preferredLabel
} from '../docs/lab-preferred.js';

/** A tiny in-memory stand-in for localStorage. */
function memory(initial = {}) {
  const data = { ...initial };
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: key => { delete data[key]; },
    get data() { return data; }
  };
}

test('the two labs keep their stars under different keys',()=>{
  assert.notEqual(CODE_LAB_PREFERRED_KEY, AI_LAB_PREFERRED_KEY);
});

test('reading with nothing stored gives an empty set',()=>{
  const set = loadPreferred(memory());
  assert.equal(set.size, 0);
  assert.ok(set instanceof Set);
});

test('reading gives back the starred ids that were written',()=>{
  const storage = memory();
  assert.equal(savePreferred(new Set(['a', 'b']), storage), true);
  const set = loadPreferred(storage);
  assert.equal(set.size, 2);
  assert.ok(set.has('a'));
  assert.ok(set.has('b'));
});

test('a corrupt entry gives an empty set instead of throwing',()=>{
  for (const raw of ['{not json', '"a string"', '42', 'null', '{"a":1}']) {
    const set = loadPreferred(memory({ [CODE_LAB_PREFERRED_KEY]: raw }));
    assert.equal(set.size, 0, 'expected an empty set for ' + raw);
  }
});

test('an entry that is not an array of ids gives an empty set',()=>{
  const set = loadPreferred(memory({ [CODE_LAB_PREFERRED_KEY]: '[1,2,3]' }));
  assert.equal(set.size, 0);
});

test('a storage that throws on read gives an empty set',()=>{
  const broken = { getItem() { throw new Error('blocked'); } };
  assert.equal(loadPreferred(broken).size, 0);
});

test('a storage that throws on write reports the failure',()=>{
  const broken = { setItem() { throw new Error('full'); } };
  assert.equal(savePreferred(new Set(['a']), broken), false);
});

test('toggling adds an id that is not starred',()=>{
  const next = togglePreferred(new Set(), 'x');
  assert.equal(next.size, 1);
  assert.ok(next.has('x'));
});

test('toggling removes an id that is already starred',()=>{
  const next = togglePreferred(new Set(['x']), 'x');
  assert.equal(next.size, 0);
  assert.ok(!next.has('x'));
});

test('toggling does not change the set it was given',()=>{
  const original = new Set(['x']);
  togglePreferred(original, 'y');
  assert.equal(original.size, 1);
  assert.ok(!original.has('y'));
});

test('toggling with no id leaves the set alone',()=>{
  const next = togglePreferred(new Set(['x']), '');
  assert.equal(next.size, 1);
  assert.ok(next.has('x'));
});

test('toggling with no set at all starts a fresh one',()=>{
  const next = togglePreferred(null, 'x');
  assert.equal(next.size, 1);
  assert.ok(next.has('x'));
});

test('filtering keeps only the starred exercises',()=>{
  const exercises = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const shown = filterPreferred(exercises, new Set(['a', 'c']));
  assert.equal(shown.length, 2);
  assert.equal(shown[0].id, 'a');
  assert.equal(shown[1].id, 'c');
});

test('filtering keeps the course order',()=>{
  const exercises = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const shown = filterPreferred(exercises, new Set(['d', 'b']));
  assert.deepEqual(shown.map(e => e.id), ['b', 'd']);
});

test('filtering with nothing starred shows nothing',()=>{
  assert.equal(filterPreferred([{ id: 'a' }], new Set()).length, 0);
  assert.equal(filterPreferred([{ id: 'a' }], null).length, 0);
});

test('filtering with no exercises gives nothing',()=>{
  assert.equal(filterPreferred(null, new Set(['a'])).length, 0);
});

test('the chapters list names only chapters that hold a star',()=>{
  const exercises = [
    { id: 'a', chapter: 'One' },
    { id: 'b', chapter: 'Two' },
    { id: 'c', chapter: 'Two' }
  ];
  assert.deepEqual(preferredChapters(exercises, new Set(['b'])), ['Two']);
  assert.deepEqual(preferredChapters(exercises, new Set()), []);
});

test('the label says what the button will do',()=>{
  assert.equal(preferredLabel(false, 'Ohms law'), 'Add Ohms law to preferred');
  assert.equal(preferredLabel(true, 'Ohms law'), 'Remove Ohms law from preferred');
  assert.equal(preferredLabel(false), 'Add to preferred');
});
