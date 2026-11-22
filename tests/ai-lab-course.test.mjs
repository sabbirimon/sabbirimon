import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runPython, toAiExercise, toAiExercises } from '../docs/ai-lab.js';
import { CHAPTERS, AI_COURSE, chapterMaterial, orphanChapters } from '../docs/ai-lab-chapters.js';
import { AI_SOLUTIONS } from './fixtures/ai-solutions.mjs';

const payload = JSON.parse(await readFile(new URL('../docs/data/ai-course.json', import.meta.url), 'utf8'));
const exercises = toAiExercises(payload);
const pythonExercises = payload.exercises.filter(entry => entry.kind !== 'design');

/* ------------------------------------------------------------------ *
 * Every exercise is solvable
 * ------------------------------------------------------------------ */

test('every Python exercise has a reference solution that passes its own checker', () => {
  // The reference solutions are the proof that an exercise can actually be
  // solved. If one of them stops working, the exercise is broken — either
  // the brief changed or the interpreter lost a feature.
  const missing = pythonExercises.filter(entry => !AI_SOLUTIONS[entry.id]);
  assert.deepEqual(missing.map(entry => entry.id), [], 'these Python exercises have no reference solution');

  for (const entry of pythonExercises) {
    const exercise = toAiExercise(entry);
    const result = exercise.check({ js: AI_SOLUTIONS[entry.id] });
    assert.equal(result.ok, true, `${entry.id}: ${result.message}`);
  }
});

test('every design exercise can be answered by writing about its ideas', () => {
  // A design exercise is checked for the ideas it names. The answer has to
  // be long enough and has to mention each idea, so the checker can pass
  // when a learner does the work.
  for (const entry of payload.exercises.filter(item => item.kind === 'design')) {
    const exercise = toAiExercise(entry);
    const ideas = Array.isArray(entry.ideas) ? entry.ideas : [];
    assert.ok(ideas.length > 0, `${entry.id} names no ideas to check for`);
    const minimum = Number.isFinite(entry.minimumWords) ? entry.minimumWords : 25;
    // Write enough words to clear the length check, and name every idea.
    const words = ideas.map(idea => idea.replace(/-/g, ' ')).join(' and ');
    const answer = (words + ' ').repeat(Math.ceil(minimum / 3) + 4);
    const result = exercise.check({ js: answer });
    assert.equal(result.ok, true, `${entry.id}: ${result.message}`);
  }
});

test('every exercise rejects its own starter', () => {
  // If the starter already passes, the learner is handed the answer.
  for (const entry of payload.exercises) {
    const exercise = toAiExercise(entry);
    const starter = entry.kind === 'design' ? entry.starter?.design ?? '' : entry.starter?.python ?? '';
    const result = exercise.check({ js: starter });
    assert.equal(result.ok, false, `${entry.id} passes its own starter`);
    assert.ok(result.message.length > 0, entry.id);
  }
});

test('every exercise names a checker that says what is missing', () => {
  for (const exercise of exercises) {
    assert.equal(typeof exercise.check, 'function', exercise.id);
    assert.ok(exercise.title.length > 0, exercise.id);
    assert.ok(exercise.brief.length > 0, exercise.id);
    assert.ok(exercise.xp > 0, exercise.id);
    assert.ok(exercise.chapter.length > 0, exercise.id);
    const blank = exercise.check({});
    assert.equal(blank.ok, false, exercise.id);
    assert.ok(blank.message.length > 0, exercise.id);
    assert.equal(typeof blank.hint, 'string', exercise.id);
  }
});

/* ------------------------------------------------------------------ *
 * Chapter coverage
 * ------------------------------------------------------------------ */

test('every exercise belongs to a chapter that has study material', () => {
  // This is the check that catches a chapter name on an exercise with no
  // reading behind it.
  for (const entry of payload.exercises) {
    assert.ok(chapterMaterial(entry.chapter), `no study material for the chapter "${entry.chapter}"`);
  }
});

test('every chapter in the bank is used by an exercise', () => {
  // An orphan chapter is usually material left behind under an old name.
  assert.deepEqual(orphanChapters(payload.exercises), []);
});

test('the chapter bank covers every chapter the course uses', () => {
  const used = new Set(payload.exercises.map(entry => entry.chapter));
  for (const chapter of used) {
    assert.ok(CHAPTERS[chapter], `the chapter "${chapter}" has no entry in the bank`);
  }
});

test('every chapter carries the four things a learner needs', () => {
  for (const [name, chapter] of Object.entries(CHAPTERS)) {
    assert.ok(chapter.goal?.length > 0, `${name} has no goal`);
    assert.ok(Array.isArray(chapter.material) && chapter.material.length > 0, `${name} has no material`);
    for (const entry of chapter.material) {
      assert.ok(entry.title?.length > 0, `${name} has a material card with no title`);
      assert.ok(entry.body?.length > 0, `${name} / ${entry.title} has no body`);
      assert.ok(entry.code?.length > 0, `${name} / ${entry.title} has no code`);
    }
    assert.ok(chapter.exam?.length > 0, `${name} does not say how it is checked`);
    assert.ok(chapter.outcome?.length > 0, `${name} does not say what the learner can do after`);
  }
});

test('the AI course card names the level, the hours and the topics', () => {
  assert.ok(AI_COURSE.name.length > 0);
  assert.ok(AI_COURSE.level.length > 0);
  assert.ok(AI_COURSE.hours.length > 0);
  assert.ok(AI_COURSE.topics.length > 0);
  assert.ok(AI_COURSE.needs.length > 0);
  assert.ok(AI_COURSE.outcome.length > 0);
  // Every topic the course card lists is a chapter that really exists.
  for (const topic of AI_COURSE.topics) {
    assert.ok(CHAPTERS[topic], `the course card lists "${topic}" but there is no such chapter`);
  }
});

test('chapterMaterial matches a chapter name however it is spaced or cased', () => {
  assert.equal(chapterMaterial('Python for models'), CHAPTERS['Python for models']);
  assert.equal(chapterMaterial('  python for models  '), CHAPTERS['Python for models']);
  assert.equal(chapterMaterial('PYTHON FOR MODELS'), CHAPTERS['Python for models']);
  assert.equal(chapterMaterial('nothing like this'), null);
  assert.equal(chapterMaterial(''), null);
  assert.equal(chapterMaterial(null), null);
});

/* ------------------------------------------------------------------ *
 * The interpreter features the course depends on
 * ------------------------------------------------------------------ */

test('a list comprehension builds a list from a loop', () => {
  const result = runPython('print([score / 2 for score in [1, 2, 3]])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[0.5, 1.0, 1.5]']);
});

test('a list comprehension can filter with if', () => {
  const result = runPython('print([n for n in range(10) if n % 2 == 0])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[0, 2, 4, 6, 8]']);
});

test('a list comprehension can have more than one for clause', () => {
  const result = runPython('print([a * b for a in [1, 2] for b in [10, 20]])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[10, 20, 20, 40]']);
});

test('a generator expression feeds sum', () => {
  const result = runPython('print(sum(value * value for value in [1, 2, 3]))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['14']);
});

test('a keyword argument is passed to the function that names it', () => {
  const result = runPython('print(sorted([3, 1, 2], reverse=True))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[3, 2, 1]']);
});

test('a keyword argument reaches a user function', () => {
  const result = runPython('def greet(name, greeting="hello"):\n    return greeting + " " + name\n\nprint(greet("ada"))\nprint(greet("ada", greeting="hi"))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['hello ada', 'hi ada']);
});

test('a call result can be sliced', () => {
  const result = runPython('print(sorted([5, 3, 9, 1])[:2])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[1, 3]']);
});

test('an indexed target can take a compound assignment', () => {
  const result = runPython('counts = {"tp": 0}\ncounts["tp"] += 1\ncounts["tp"] += 2\nprint(counts["tp"])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['3']);
});

test('an indexed target can be assigned outright', () => {
  const result = runPython('scores = {}\nscores["a"] = 5\nprint(scores["a"])');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['5']);
});

test('a list item can take a compound assignment', () => {
  const result = runPython('values = [1, 2, 3]\nvalues[0] += 10\nvalues[2] *= 2\nprint(values)');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[11, 2, 6]']);
});

test('sum accepts any iterable, not just a list', () => {
  const result = runPython('print(sum([1, 2, 3]))\nprint(sum((1, 2, 3)))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['6', '6']);
});

test('sum refuses a string, the way Python does', () => {
  // Python raises a TypeError rather than quietly joining the characters.
  const result = runPython('print(sum("abc"))');
  assert.ok(result.error);
  assert.match(result.error, /sum\(\) does not take a string/);
});

test('range still returns its values when no keyword is passed', () => {
  // A keyword argument must not be threaded into a builtin that has no
  // keyword to receive it — that silently emptied range().
  const result = runPython('print(range(3))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['[0, 1, 2]']);
});

test('division by zero is an error and not a silent infinity', () => {
  const result = runPython('x = 1\ny = 0\nprint(x / y)');
  assert.ok(result.error);
  assert.match(result.error, /division by zero/i);
});
