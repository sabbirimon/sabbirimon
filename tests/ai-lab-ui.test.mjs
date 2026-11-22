import test from 'node:test';
import assert from 'node:assert/strict';
import { readAiProgress, writeAiProgress, mergeAiProgress, earnedAiXp, aiExerciseXp, aiChapters, findAiExercise, neighbourAiExercise, runAiProgram, aiStarterText, aiKindLabel, aiEditorHint, aiExpectedText, drawAiPixelText, courseDrawerOpen, courseDrawerAttributes, AI_PROGRESS_KEY } from '../docs/ai-lab-ui.js';

function withStorage(store, run) {
  const original = globalThis.localStorage;
  globalThis.localStorage = store;
  try { return run(); } finally { globalThis.localStorage = original; }
}

test('the progress is read from local storage under one key', () => {
  const store = { getItem: () => JSON.stringify({ solved: ['a', 'b'], xp: 40 }), setItem() {} };
  withStorage(store, () => {
    const progress = readAiProgress();
    assert.deepEqual(progress.solved, ['a', 'b']);
    assert.equal(progress.xp, 40);
  });
  assert.equal(AI_PROGRESS_KEY, 'imon-ai-lab-v1');
});

test('a broken or missing progress gives an empty course instead of throwing', () => {
  withStorage({ getItem: () => 'not json', setItem() {} }, () => {
    assert.deepEqual(readAiProgress(), { solved: [], xp: 0 });
  });
  withStorage({ getItem: () => null, setItem() {} }, () => {
    assert.deepEqual(readAiProgress(), { solved: [], xp: 0 });
  });
});

test('a storage that refuses to write is not fatal', () => {
  const store = { getItem: () => null, setItem() { throw new Error('full'); } };
  withStorage(store, () => {
    assert.equal(writeAiProgress({ solved: ['a'], xp: 10 }), false);
  });
});

test('merging progress keeps the solved ids and adds the new one', () => {
  const merged = mergeAiProgress({ solved: ['a'], xp: 10 }, ['b']);
  assert.deepEqual(merged.solved.sort(), ['a', 'b']);
});

test('the XP is the sum of the solved exercises', () => {
  const xpById = aiExerciseXp([{ id: 'a', xp: 10 }, { id: 'b', xp: 25 }]);
  assert.equal(earnedAiXp(['a', 'b'], xpById), 35);
  assert.equal(earnedAiXp(['a', 'zzz'], xpById), 10);
});

test('the exercises are grouped into chapters in the order they appear', () => {
  const groups = aiChapters([
    { id: 'a', chapter: 'One' },
    { id: 'b', chapter: 'Two' },
    { id: 'c', chapter: 'One' }
  ]);
  assert.deepEqual(groups.map(group => group.chapter), ['One', 'Two']);
  assert.equal(groups[0].exercises.length, 2);
});

test('an exercise is found by id and a neighbour is the one next to it', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(findAiExercise(list, 'b').id, 'b');
  assert.equal(findAiExercise(list, 'zz'), null);
  assert.equal(neighbourAiExercise(list, 'b', 'prev').id, 'a');
  assert.equal(neighbourAiExercise(list, 'b', 'next').id, 'c');
  assert.equal(neighbourAiExercise(list, 'a', 'prev'), null);
  assert.equal(neighbourAiExercise(list, 'c', 'next'), null);
});

test('running a program gives the printed lines and any error', () => {
  assert.deepEqual(runAiProgram('print("hi")'), [{ level: 'out', text: 'hi' }]);
  const failed = runAiProgram('print(1 / 0)');
  assert.equal(failed[0].level, 'error');
  assert.match(failed[0].text, /Division by zero/);
});

test('the starter text comes from the right buffer for the kind', () => {
  assert.equal(aiStarterText({ kind: 'python', starter: { python: 'print(1)' } }), 'print(1)');
  assert.equal(aiStarterText({ kind: 'design', starter: { design: 'a design' } }), 'a design');
  assert.equal(aiStarterText(null), '');
});

test('the kind label and the hint describe the exercise', () => {
  assert.equal(aiKindLabel({ kind: 'design' }), 'Design answer');
  assert.equal(aiKindLabel({ kind: 'python' }), 'Python');
  assert.match(aiEditorHint({ kind: 'design' }), /plain English/);
  assert.match(aiEditorHint({ kind: 'python' }), /Write Python/);
});

test('the expected output is shown for a python exercise only', () => {
  assert.equal(aiExpectedText({ kind: 'python', expected: ['4'] }), '4');
  assert.equal(aiExpectedText({ kind: 'design', expected: ['4'] }), '');
  assert.equal(aiExpectedText({ kind: 'python' }), '');
});

test('a pixel heading redraws with the words it holds now', () => {
  const element = { textContent: 'Softmax', dataset: {}, innerHTML: '', setAttribute() {} };
  assert.equal(drawAiPixelText(element), true);
  assert.equal(element.dataset.pixelText, 'Softmax');
  assert.match(element.innerHTML, /<svg/);
  // A second draw with new words must show the new words, not the cached ones.
  element.textContent = 'Cosine';
  drawAiPixelText(element);
  assert.equal(element.dataset.pixelText, 'Cosine');
});

test('a heading that already holds a drawing is redrawn from its label', () => {
  const element = {
    textContent: '',
    dataset: {},
    innerHTML: '',
    setAttribute() {},
    querySelector: () => ({ getAttribute: () => '15 XP' })
  };
  assert.equal(drawAiPixelText(element), true);
  assert.equal(element.dataset.pixelText, '15 XP');
});

test('the course drawer opens and closes', () => {
  assert.equal(courseDrawerOpen(true), true);
  assert.equal(courseDrawerOpen(false), false);
  assert.equal(courseDrawerOpen(undefined), false);
});

test('the course drawer tells the button and the page what to do', () => {
  const open = courseDrawerAttributes(true);
  assert.equal(open.expanded, 'true');
  assert.equal(open.drawerClass, 'is-open');
  assert.equal(open.bodyClass, 'ai-course-open');
  const closed = courseDrawerAttributes(false);
  assert.equal(closed.expanded, 'false');
  assert.equal(closed.drawerClass, '');
  assert.equal(closed.bodyClass, '');
});
