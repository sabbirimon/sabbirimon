import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizePython, parsePython, runPython, formatValue, truthy, mentionsIdea, makeDesignChecker, makePythonChecker, toAiExercise, toAiExercises, loadAiCourse, AI_COURSE_URL, AI_COURSE_KEY } from '../docs/ai-lab.js';

test('the tokenizer keeps strings whole and drops comments', () => {
  const tokens = tokenizePython('x = "a # b"  # trailing');
  assert.deepEqual(tokens.map(t => t.type), ['name', 'op', 'string']);
  assert.equal(tokens[2].value, 'a # b');
});

test('the tokenizer reads numbers, names and two-character operators', () => {
  const tokens = tokenizePython('total += 42');
  assert.equal(tokens[0].value, 'total');
  assert.equal(tokens[1].value, '+=');
  assert.equal(tokens[2].value, 42);
});

test('the parser marks the lines that open a block', () => {
  const statements = parsePython('def f():\n    return 1');
  assert.equal(statements.length, 2);
  assert.equal(statements[0].opensBlock, true);
  assert.equal(statements[1].indent, 4);
});

test('print shows values the way Python shows them', () => {
  assert.equal(formatValue(null), 'None');
  assert.equal(formatValue(true), 'True');
  assert.equal(formatValue([1, 'a']), "[1, 'a']");
  assert.equal(formatValue({ a: 1 }), "{'a': 1}");
});

test('truthiness follows the Python rules', () => {
  assert.equal(truthy(0), false);
  assert.equal(truthy(''), false);
  assert.equal(truthy([]), false);
  assert.equal(truthy([0]), true);
  assert.equal(truthy('text'), true);
});

test('a program prints what it is told to print', () => {
  const result = runPython('print("hello")\nprint(2 + 3)');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['hello', '5']);
});

test('a function is defined, called and returns a value', () => {
  const result = runPython('def double(n):\n    return n * 2\n\nprint(double(21))');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['42']);
});

test('an if statement picks a branch and an else catches the rest', () => {
  const source = 'def sign(n):\n    if n > 0:\n        return "pos"\n    else:\n        return "other"\n\nprint(sign(5))\nprint(sign(-5))';
  const result = runPython(source);
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['pos', 'other']);
});

test('a for loop walks a list and a while loop counts down', () => {
  assert.deepEqual(runPython('for n in [1, 2, 3]:\n    print(n)').output, ['1', '2', '3']);
  assert.deepEqual(runPython('n = 0\nwhile n < 3:\n    print(n)\n    n += 1').output, ['0', '1', '2']);
});

test('a list comprehension-free expression still evaluates arithmetic and comparisons', () => {
  const result = runPython('a = 2\nb = 3\nprint(a + b * 2)\nprint(a > b)\nprint(a == 2 and b == 3)');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['8', 'False', 'True']);
});

test('a broken program reports a plain message instead of a stack trace', () => {
  const result = runPython('print(1 / 0)');
  assert.equal(result.error, 'Division by zero.');
});

test('a program that never ends is stopped', () => {
  const result = runPython('while True:\n    pass', { maxSteps: 500 });
  assert.match(result.error, /runs for too long/);
});

test('an undefined name is reported by name', () => {
  const result = runPython('print(mystery)');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['None']);
  assert.match(runPython('mystery()').error, /'mystery' is not defined yet/);
});

test('the design checker names the idea that is missing', () => {
  const checker = makeDesignChecker({ ideas: ['rate-limit', 'timeout'], minimumWords: 5 });
  const result = checker({ js: 'we apply a rate limit per user' });
  assert.equal(result.ok, false);
  assert.match(result.message, /timeout/);
});

test('the design checker passes when every idea is mentioned', () => {
  const checker = makeDesignChecker({ ideas: ['rate-limit', 'timeout'], minimumWords: 5 });
  const result = checker({ js: 'we apply a rate limit per user and a timeout on every call' });
  assert.equal(result.ok, true);
});

test('the design checker refuses an answer that is too short', () => {
  const checker = makeDesignChecker({ ideas: ['cache'], minimumWords: 20 });
  assert.equal(checker({ js: 'cache it' }).ok, false);
});

test('an idea is recognised through any of its spellings', () => {
  assert.equal(mentionsIdea('we should use exponential backoff here', 'retry'), true);
  assert.equal(mentionsIdea('the breaker is open', 'circuit-breaker'), true);
  assert.equal(mentionsIdea('nothing relevant here', 'circuit-breaker'), false);
});

test('the python checker compares the printed output with the expected output', () => {
  const checker = makePythonChecker({ expected: ['4'] });
  assert.equal(checker({ js: 'print(2 + 2)' }).ok, true);
  const wrong = checker({ js: 'print(5)' });
  assert.equal(wrong.ok, false);
  assert.match(wrong.hint, /4/);
});

test('the python checker reports an empty editor and a runtime error', () => {
  const checker = makePythonChecker({ expected: ['4'] });
  assert.equal(checker({ js: '' }).ok, false);
  assert.match(checker({ js: 'print(1 / 0)' }).message, /stopped/);
});

test('a course entry becomes an exercise, and a broken one is dropped', () => {
  const exercise = toAiExercise({ id: 'x', title: 'X', kind: 'python', expected: ['1'] });
  assert.equal(exercise.language, 'python');
  assert.equal(typeof exercise.check, 'function');
  assert.equal(toAiExercise({ title: 'no id' }), null);
  assert.equal(toAiExercise(null), null);
  assert.equal(toAiExercises({ exercises: [{ id: 'a', title: 'A' }, { id: 'b' }] }).length, 1);
});

test('the expected output is kept on the exercise so the brief can show it', () => {
  const exercise = toAiExercise({ id: 'x', title: 'X', kind: 'python', expected: ['one', 'two'] });
  assert.deepEqual(exercise.expected, ['one', 'two']);
  assert.deepEqual(toAiExercise({ id: 'y', title: 'Y' }).expected, []);
});

test('the course loader returns an empty course rather than throwing', async () => {
  const result = await loadAiCourse(async () => { throw new Error('offline'); });
  assert.deepEqual(result.exercises, []);
  assert.equal(AI_COURSE_URL, './data/ai-course.json');
  assert.equal(AI_COURSE_KEY, 'imon-ai-lab-v1');
});
