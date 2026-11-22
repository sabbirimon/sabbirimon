/**
 * The JavaScript knowledge check.
 *
 * Twenty-five questions that ask what JavaScript *is* rather than what it
 * can build. The coding exercises in this lab teach you to write code;
 * these check that you know what the words mean.
 *
 * The questions were written for this site. The w3schools JavaScript quiz
 * covers the same ground, and its topic list is what this chapter follows,
 * but none of its wording is used — that content is unlicensed, so the
 * prose here is original.
 *
 * House rules: the data and the helpers below are pure, so the whole file
 * can be imported under node and tested without a DOM.
 */

/** The chapter the questions belong to. */
export const QUIZ_CHAPTER = 'JavaScript · Quiz';

/**
 * The topics the questions cover, in the order they are asked.
 *
 * The list is what the w3schools JavaScript quiz covers, put in the order
 * a beginner meets it: the language first, then the data it holds, then
 * the things you can do with it.
 */
export const QUIZ_TOPICS = [
  'Syntax & comments',
  'Variables & types',
  'Operators',
  'Strings',
  'Arrays',
  'Objects',
  'Functions',
  'Conditions & loops'
];

/**
 * The questions.
 *
 * Every question names the topic it belongs to and the note that explains
 * it, so the "What this teaches" panel says something about the question
 * the learner is looking at rather than something generic.
 */
export const JS_QUIZ = [
  /* -- Syntax & comments ------------------------------------------- */
  {
    id: 'js-quiz-01',
    topic: 'Syntax & comments',
    requirement: 'script',
    question: 'Which HTML element holds JavaScript?',
    options: ['<js>', '<script>', '<javascript>', '<code>'],
    answer: 1,
    explanation: 'A <script> element holds JavaScript. A <code> element shows code to the reader without running it.'
  },
  {
    id: 'js-quiz-02',
    topic: 'Syntax & comments',
    requirement: 'comment',
    question: 'Which of these writes a comment that JavaScript ignores?',
    options: ['// a note', '<!-- a note -->', '# a note', '/* a note'],
    answer: 3,
    explanation: 'A block comment starts with /* and ends with */. // comments out the rest of one line.'
  },
  {
    id: 'js-quiz-03',
    topic: 'Syntax & comments',
    requirement: 'case',
    question: 'JavaScript is case-sensitive. Which of these names is not the same as `total`?',
    options: ['total', 'totaL', 'totall', 'TOTAL'],
    answer: 2,
    explanation: 'total, totaL and TOTAL are all the same name with the letters in a different case. totall has an extra l, so it is a different name altogether.'
  },

  /* -- Variables & types -------------------------------------------- */
  {
    id: 'js-quiz-04',
    topic: 'Variables & types',
    requirement: 'const',
    question: 'Which keyword declares a name whose value never changes?',
    options: ['var', 'const', 'let', 'function'],
    answer: 1,
    explanation: 'const declares a binding that cannot be reassigned. let is for a value that will change later.'
  },
  {
    id: 'js-quiz-05',
    topic: 'Variables & types',
    requirement: 'typeof',
    question: 'What does `typeof "hello"` return?',
    options: ['"string"', '"number"', '"text"', '"character"'],
    answer: 0,
    explanation: 'typeof returns the name of the type as a string, so a piece of text comes back as "string".'
  },
  {
    id: 'js-quiz-06',
    topic: 'Variables & types',
    requirement: 'undefined',
    question: 'What is the value of a variable that was declared but never given one?',
    options: ['null', 'undefined', 'false', '0'],
    answer: 1,
    explanation: 'A declared variable with no value holds undefined. null is a value you choose on purpose.'
  },
  {
    id: 'js-quiz-07',
    topic: 'Variables & types',
    requirement: 'NaN',
    question: 'What is `0 / 0` in JavaScript?',
    options: ['0', 'null', 'NaN', 'Infinity'],
    answer: 2,
    explanation: 'Dividing zero by zero gives NaN — "not a number". It is the only value that is not equal to itself.'
  },

  /* -- Operators ---------------------------------------------------- */
  {
    id: 'js-quiz-08',
    topic: 'Operators',
    requirement: '===',
    question: 'What does `5 === "5"` evaluate to?',
    options: ['true', 'false', '"true"', 'undefined'],
    answer: 1,
    explanation: 'It is false. === compares the value *and* the type, and the number 5 is not the string "5".'
  },
  {
    id: 'js-quiz-09',
    topic: 'Operators',
    requirement: 'operator',
    question: 'What does the % operator do?',
    options: ['Divides and keeps the decimal', 'Returns the remainder', 'Returns a percentage', 'Marks a value as final'],
    answer: 1,
    explanation: '% is called the remainder operator. `7 % 3` is 1, because 3 goes into 7 twice and 1 is left over.'
  },
  {
    id: 'js-quiz-10',
    topic: 'Operators',
    requirement: 'operator',
    question: 'What does the + operator do when both sides are text?',
    options: ['Adds them as numbers', 'Joins them into one piece of text', 'Shows an error', 'Compares them'],
    answer: 1,
    explanation: 'When either side is text, + joins the two into one piece of text instead of adding numbers.'
  },

  /* -- Strings ------------------------------------------------------ */
  {
    id: 'js-quiz-11',
    topic: 'Strings',
    requirement: 'string',
    question: 'How do you find how many characters a string has?',
    options: ['text.length', 'text.size()', 'text.count()', 'length(text)'],
    answer: 0,
    explanation: 'A string has a length property, so you read it directly: "hello".length is 5.'
  },
  {
    id: 'js-quiz-12',
    topic: 'Strings',
    requirement: 'string method',
    question: 'Which method turns text into upper case?',
    options: ['text.upper()', 'text.toUpperCase()', 'text.capitalise()', 'text.big()'],
    answer: 1,
    explanation: 'toUpperCase() returns a new string in upper case. The original one is left alone.'
  },
  {
    id: 'js-quiz-13',
    topic: 'Strings',
    requirement: 'template literal',
    question: 'Which of these puts a value inside a string without joining it by hand?',
    options: ['`Hello ${name}`', '"Hello " + name', '"Hello " . name', "'Hello ' name"],
    answer: 0,
    explanation: 'A template literal uses backticks, and ${name} puts the value of name straight into the text.'
  },

  /* -- Arrays ------------------------------------------------------- */
  {
    id: 'js-quiz-14',
    topic: 'Arrays',
    requirement: 'array',
    question: 'What is the index of the first item in an array?',
    options: ['0', '1', '-1', 'It depends on the array'],
    answer: 0,
    explanation: 'Arrays are counted from zero, so the first item is at index 0 and the last is at length - 1.'
  },
  {
    id: 'js-quiz-15',
    topic: 'Arrays',
    requirement: 'array method',
    question: 'Which method adds an item to the end of an array?',
    options: ['array.add(item)', 'array.push(item)', 'array.append(item)', 'array.insert(item)'],
    answer: 1,
    explanation: 'push() adds to the end. unshift() adds to the front, and pop() takes one off the end.'
  },
  {
    id: 'js-quiz-16',
    topic: 'Arrays',
    requirement: 'array method',
    question: 'What does `array.map()` give you back?',
    options: ['The same array, changed', 'A new array built from the results', 'The number of items', 'The last item'],
    answer: 1,
    explanation: 'map() runs a function over every item and returns a new array of the results. The original is untouched.'
  },

  /* -- Objects ------------------------------------------------------ */
  {
    id: 'js-quiz-17',
    topic: 'Objects',
    requirement: 'object',
    question: 'How do you read the `name` property of an object called `user`?',
    options: ['user["name"] only', 'user.name', 'user->name', 'get user name'],
    answer: 1,
    explanation: 'A dot reads a property by name: user.name. Square brackets work too, and are needed when the name is in a variable.'
  },
  {
    id: 'js-quiz-18',
    topic: 'Objects',
    requirement: 'object property',
    question: 'How do you add a new property to an object?',
    options: ['object.add("age", 30)', 'object["age"] = 30', 'object.age = 30', 'Both the dot and the square brackets work'],
    answer: 3,
    explanation: 'Both work: user.age = 30 and user["age"] = 30 do the same thing when the name is a plain word.'
  },
  {
    id: 'js-quiz-19',
    topic: 'Objects',
    requirement: 'JSON',
    question: 'What is JSON?',
    options: ['A way to draw the page', 'A text format for storing data', 'A kind of loop', 'The name of a browser'],
    answer: 1,
    explanation: 'JSON is text that holds data, written with curly braces for objects and square brackets for arrays.'
  },

  /* -- Functions ---------------------------------------------------- */
  {
    id: 'js-quiz-20',
    topic: 'Functions',
    requirement: 'function',
    question: 'What does the `return` keyword do?',
    options: ['Prints a value to the console', 'Hands a value back to whoever called the function', 'Ends the page', 'Names the function'],
    answer: 1,
    explanation: 'return sends a value back to the caller. console.log only prints it and throws it away.'
  },
  {
    id: 'js-quiz-21',
    topic: 'Functions',
    requirement: 'parameter',
    question: 'What is a parameter?',
    options: ['The name of the function', 'A value the function expects to be given', 'The result the function gives back', 'A kind of comment'],
    answer: 1,
    explanation: 'A parameter is a name in the definition — function double(n) — for a value the caller passes in.'
  },
  {
    id: 'js-quiz-22',
    topic: 'Functions',
    requirement: 'arrow function',
    question: 'Which of these is an arrow function?',
    options: ['function () {}', '() => {}', 'def () {}', 'fn () {}'],
    answer: 1,
    explanation: 'An arrow function writes its parameters, then the arrow, then the body: const double = n => n * 2;'
  },

  /* -- Conditions & loops ------------------------------------------- */
  {
    id: 'js-quiz-23',
    topic: 'Conditions & loops',
    requirement: 'if',
    question: 'What does an `if` statement do when its condition is false?',
    options: ['Runs the block anyway', 'Skips the block and carries on', 'Shows an error', 'Runs the block twice'],
    answer: 1,
    explanation: 'A false condition means the block is skipped and the code after the if carries on.'
  },
  {
    id: 'js-quiz-24',
    topic: 'Conditions & loops',
    requirement: 'for',
    question: 'What does a `for` loop need to know to stop?',
    options: ['Only a condition', 'A starting point, a condition and a step', 'The number of items in advance', 'Nothing — it always runs once'],
    answer: 1,
    explanation: 'A for loop takes three things: where to start, when to stop, and what to change each time round.'
  },
  {
    id: 'js-quiz-25',
    topic: 'Conditions & loops',
    requirement: 'break',
    question: 'What does the `break` keyword do inside a loop?',
    options: ['Pauses the loop', 'Leaves the loop altogether', 'Runs the loop again', 'Skips to the next item'],
    answer: 1,
    explanation: 'break leaves the loop completely. continue is the one that skips to the next item.'
  }
];

/**
 * Is this a question the quiz can ask?
 *
 * A question needs a name, four different answers and one of them marked
 * as the right one. A question that is missing any of that is skipped
 * rather than shown broken.
 */
export function validQuizQuestion(question) {
  if (!question || typeof question !== 'object') return false;
  if (typeof question.id !== 'string' || !question.id) return false;
  if (typeof question.question !== 'string' || !question.question.trim()) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (!question.options.every(option => typeof option === 'string' && option.trim())) return false;
  // Two answers that read the same are no use as choices. The check is
  // case-sensitive, because a question about case sensitivity has to be
  // able to offer "total" and "TOTAL" as different answers.
  if (new Set(question.options.map(option => option.trim())).size !== 4) return false;
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) return false;
  if (typeof question.explanation !== 'string' || !question.explanation.trim()) return false;
  return true;
}

/**
 * Shuffle the answers so the right one is not always in the same place.
 *
 * The `random` function is passed in so a test can make the order
 * predictable. The right answer is followed to its new home, so the
 * question still knows which one it is.
 */
export function shuffleOptions(question, random = Math.random) {
  const correct = question?.options?.[question?.answer];
  const rest = (question?.options || []).filter((_, index) => index !== question?.answer);
  for (let index = rest.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [rest[index], rest[swap]] = [rest[swap], rest[index]];
  }
  const options = [...rest];
  options.splice(Math.floor(random() * 4), 0, correct);
  return { ...question, options, answer: options.indexOf(correct) };
}

/**
 * The checker for one question.
 *
 * A wrong answer says what the right one is, because a knowledge check
 * that only says "no" teaches nothing.
 */
export function makeQuizChecker(question) {
  return ({ chosen } = {}) => {
    if (!Number.isInteger(chosen) || chosen < 0 || chosen > 3) {
      return { ok: false, message: 'Pick an answer first.', hint: 'Choose one of the four answers.' };
    }
    if (chosen === question.answer) {
      return { ok: true, message: `Right — ${question.options[question.answer]} is correct.` };
    }
    return {
      ok: false,
      message: `Not quite — the answer is ${question.options[question.answer]}.`,
      hint: question.explanation
    };
  };
}

/**
 * How much XP a question is worth.
 *
 * A question about a word is worth less than one about how two values
 * compare, so the XP rises with the topic.
 */
function xpFor(topic) {
  const worth = {
    'Syntax & comments': 10,
    'Variables & types': 15,
    Operators: 20,
    Strings: 20,
    Arrays: 20,
    Objects: 25,
    Functions: 25,
    'Conditions & loops': 25
  };
  return worth[topic] || 15;
}

/**
 * The questions as lab exercises.
 *
 * Each one is an ordinary lab exercise with one extra field, `kind`,
 * so the lab knows to show a quiz instead of an editor. The checker
 * reads the chosen answer instead of the editor buffers.
 */
export function quizExercises(list = JS_QUIZ) {
  const exercises = [];
  for (const question of list) {
    if (!validQuizQuestion(question)) continue;
    exercises.push({
      id: question.id,
      kind: 'quiz',
      language: 'js',
      title: question.question,
      chapter: QUIZ_CHAPTER,
      xp: xpFor(question.topic),
      brief: `${question.topic} — pick the one right answer.`,
      // The lab keeps three editor buffers for every exercise. A quiz has
      // nothing to type, so the buffers are empty strings.
      starter: { html: '', css: '', js: '' },
      question: question.question,
      options: [...question.options],
      answer: question.answer,
      explanation: question.explanation,
      requirements: [question.requirement],
      check: makeQuizChecker(question)
    });
  }
  return exercises;
}
