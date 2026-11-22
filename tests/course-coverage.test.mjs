import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHAPTERS as CODE_CHAPTERS, chapterMaterial as codeChapterMaterial } from '../docs/lab-chapters.js';
import { CHAPTERS as AI_CHAPTERS, chapterMaterial as aiChapterMaterial } from '../docs/ai-lab-chapters.js';
import { CHAPTERS as CIRCUITS_CHAPTERS, orphanChapters as circuitOrphans } from '../docs/circuits-chapters.js';
import { toExercises } from '../docs/lab-curriculum.js';
import { toAiExercises } from '../docs/ai-lab.js';
import { toCircuitExercises } from '../docs/circuits.js';
import { EXERCISES as CODE_BUILTINS, addImportedExercises, allExercises } from '../docs/lab.js';
import { JS_QUIZ, quizExercises } from '../docs/lab-quiz.js';

const codePayload = JSON.parse(await readFile(new URL('../docs/data/lab-curriculum.json', import.meta.url), 'utf8'));
const aiPayload = JSON.parse(await readFile(new URL('../docs/data/ai-course.json', import.meta.url), 'utf8'));
const circuitsPayload = JSON.parse(await readFile(new URL('../docs/data/circuits-course.json', import.meta.url), 'utf8'));

// The Code Lab draws its exercises from three places: the ones it ships
// with, the imported curriculum, and the JavaScript quiz. All three have
// to be covered by the chapter bank. The registry keeps the first
// exercise for an id and drops the later ones, so the list is built the
// same way the page builds it.
const quizList = quizExercises(JS_QUIZ);
addImportedExercises([...toExercises(codePayload), ...quizList]);
const codeExercises = allExercises();
const aiExercises = toAiExercises(aiPayload);
const circuitExercises = toCircuitExercises(circuitsPayload);

/**
 * The three courses, each with the bank that holds its study material and
 * the lookup that reads it.
 */
const COURSES = [
  {
    name: 'Code Lab',
    exercises: codeExercises,
    chapters: Object.keys(CODE_CHAPTERS),
    lookup: codeChapterMaterial
  },
  {
    name: 'AI Lab',
    exercises: aiExercises,
    chapters: Object.keys(AI_CHAPTERS),
    lookup: aiChapterMaterial
  },
  {
    name: 'Circuits',
    exercises: circuitExercises,
    chapters: Object.keys(CIRCUITS_CHAPTERS),
    lookup: title => CIRCUITS_CHAPTERS[title] || null
  }
];

test('all three courses ship exercises', () => {
  for (const course of COURSES) {
    assert.ok(course.exercises.length > 0, `${course.name} ships no exercises`);
  }
});

test('every exercise in every course names a chapter that has material', () => {
  // This is the check that catches a chapter name on an exercise with no
  // reading behind it — the failure a learner sees as an exercise that
  // starts with no explanation.
  for (const course of COURSES) {
    for (const exercise of course.exercises) {
      assert.ok(exercise.chapter, `${course.name} / ${exercise.id} names no chapter`);
      assert.ok(
        course.lookup(exercise.chapter),
        `${course.name} / ${exercise.id} is in the chapter "${exercise.chapter}" but that chapter has no material`
      );
    }
  }
});

test('every chapter in every course is used by an exercise', () => {
  // An orphan chapter is material nobody can reach. It usually means the
  // chapter name on the exercise changed and the material was left behind.
  for (const course of COURSES) {
    const used = new Set(course.exercises.map(exercise => exercise.chapter));
    const orphans = course.chapters.filter(chapter => !used.has(chapter));
    assert.deepEqual(orphans, [], `${course.name} has chapters no exercise uses`);
  }
});

test('the Circuits course agrees with its own orphan check', () => {
  assert.deepEqual(circuitOrphans(circuitExercises), []);
});

test('no two courses use the same chapter name', () => {
  // A shared name would let one course's material answer for another's
  // exercise, and the lookup would pick the wrong one.
  const seen = new Map();
  for (const course of COURSES) {
    for (const chapter of course.chapters) {
      const owner = seen.get(chapter);
      assert.equal(
        owner,
        undefined,
        `the chapter "${chapter}" is in both ${owner || 'another course'} and ${course.name}`
      );
      seen.set(chapter, course.name);
    }
  }
});

test('every exercise in every course is checked by a checker', () => {
  for (const course of COURSES) {
    for (const exercise of course.exercises) {
      assert.equal(typeof exercise.check, 'function', `${course.name} / ${exercise.id}`);
    }
  }
});

test('every exercise in every course awards XP and names its language', () => {
  for (const course of COURSES) {
    for (const exercise of course.exercises) {
      assert.ok(exercise.xp > 0, `${course.name} / ${exercise.id} awards no XP`);
      assert.ok(exercise.title?.length > 0, `${course.name} / ${exercise.id} has no title`);
      assert.ok(exercise.brief?.length > 0, `${course.name} / ${exercise.id} has no brief`);
    }
  }
});

test('no two exercises in the same course share an id', () => {
  for (const course of COURSES) {
    const ids = course.exercises.map(exercise => exercise.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, `${course.name} has a duplicate exercise id`);
  }
});
