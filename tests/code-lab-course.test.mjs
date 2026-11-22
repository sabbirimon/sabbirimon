import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EXERCISES, addImportedExercises, allExercises } from '../docs/lab.js';
import { JS_QUIZ, quizExercises, makeQuizChecker } from '../docs/lab-quiz.js';
import { toExercises } from '../docs/lab-curriculum.js';
import { CODE_LAB_SOLUTIONS } from './fixtures/code-lab-solutions.mjs';

const payload = JSON.parse(await readFile(new URL('../docs/data/lab-curriculum.json', import.meta.url), 'utf8'));
const imported = toExercises(payload);
const quizList = quizExercises(JS_QUIZ);
// The quiz exercises are already part of the built-in course, so only the
// imported curriculum is added to the registry here.
addImportedExercises(imported);
const every = allExercises();

/* ------------------------------------------------------------------ *
 * The taster course
 * ------------------------------------------------------------------ */

// The hand-written taster course. The quiz exercises sit in the same
// list, but they are answered by picking an option rather than by
// writing code, so they are covered by their own tests below.
const taster = EXERCISES.filter(exercise => exercise.kind !== 'quiz');

test('every built-in exercise has a reference solution that passes', () => {
  // The ten hand-written exercises are the ones a learner meets first, so
  // they must be finishable. A checker that can never pass would strand
  // the learner on the opening screen.
  const missing = taster.filter(exercise => !CODE_LAB_SOLUTIONS[exercise.id]);
  assert.deepEqual(missing.map(exercise => exercise.id), [], 'these exercises have no reference solution');

  for (const exercise of taster) {
    const solution = CODE_LAB_SOLUTIONS[exercise.id];
    const result = exercise.check({ html: '', css: '', js: '', ...solution });
    assert.equal(result.ok, true, `${exercise.id}: ${result.message}`);
  }
});

test('every built-in exercise rejects its own starter', () => {
  for (const exercise of taster) {
    const result = exercise.check({ ...exercise.starter });
    assert.equal(result.ok, false, `${exercise.id} passes its own starter`);
    assert.ok(result.message.length > 0, exercise.id);
  }
});

test('every built-in exercise names what it needs and what it checks', () => {
  for (const exercise of taster) {
    assert.ok(exercise.requirements.length > 0, exercise.id);
    assert.ok(exercise.brief.length > 0, exercise.id);
    assert.ok(exercise.xp > 0, exercise.id);
    assert.ok(exercise.chapter.length > 0, exercise.id);
  }
});

/* ------------------------------------------------------------------ *
 * The imported curriculum
 * ------------------------------------------------------------------ */

test('every imported exercise is solved by writing its requirements', () => {
  for (const entry of payload.exercises) {
    if (entry.freeform) continue;
    const exercise = toExercises({ exercises: [entry] })[0];
    let solution = '';
    for (const requirement of entry.requirements || []) {
      if (exercise.language === 'html') solution += `<${requirement}>text</${requirement}>`;
      else if (exercise.language === 'css') {
        solution += `${requirement} { color: red; }`;
        solution += `p { ${requirement}: 1px; }`;
      } else solution += `${requirement}; ${requirement};`;
    }
    const buffers = { html: '', css: '', js: '' };
    buffers[exercise.language] = solution;
    const result = exercise.check(buffers);
    assert.equal(result.ok, true, `${exercise.id}: ${result.message}`);
  }
});

test('every imported exercise rejects its own starter', () => {
  for (const entry of payload.exercises) {
    if (entry.freeform) continue;
    const exercise = toExercises({ exercises: [entry] })[0];
    const result = exercise.check({ ...exercise.starter });
    assert.equal(result.ok, false, entry.id);
    assert.ok(result.message.length > 0, entry.id);
  }
});

/* ------------------------------------------------------------------ *
 * The JavaScript quiz
 * ------------------------------------------------------------------ */

test('every quiz question can be answered right', () => {
  for (const question of JS_QUIZ) {
    const check = makeQuizChecker(question);
    // The answer is the index of the right option.
    assert.ok(Number.isInteger(question.answer), question.question);
    assert.ok(question.answer >= 0 && question.answer < question.options.length, question.question);
    const result = check({ chosen: question.answer });
    assert.equal(result.ok, true, `${question.question}: ${result.message}`);
  }
});

test('every quiz question refuses an unanswered or wrong answer', () => {
  for (const question of JS_QUIZ) {
    const check = makeQuizChecker(question);
    const blank = check({ chosen: -1 });
    assert.equal(blank.ok, false, question.question);
    assert.ok(blank.message.length > 0, question.question);

    const wrong = (question.answer + 1) % question.options.length;
    const result = check({ chosen: wrong });
    assert.equal(result.ok, false, question.question);
    assert.ok(result.message.length > 0, question.question);
    // A wrong answer has to explain itself, not just say no.
    assert.ok(result.hint.length > 0, question.question);
  }
});

test('the quiz exercises all belong to the quiz chapter', () => {
  for (const exercise of quizList) {
    assert.equal(exercise.chapter, 'JavaScript · Quiz');
  }
});

/* ------------------------------------------------------------------ *
 * The whole course
 * ------------------------------------------------------------------ */

test('every exercise in the course has a checker and a message', () => {
  for (const exercise of every) {
    assert.equal(typeof exercise.check, 'function', exercise.id);
    const blank = exercise.check({ html: '', css: '', js: '' });
    assert.equal(blank.ok, false, exercise.id);
    assert.ok(blank.message.length > 0, exercise.id);
    assert.equal(typeof blank.hint, 'string', exercise.id);
  }
});

test('the course holds every exercise it says it does', () => {
  // The built-in course already carries the quiz exercises, so the quiz
  // is added to the registry only once.
  assert.equal(every.length, EXERCISES.length + imported.length);
  assert.ok(every.length > 100, every.length);
});
