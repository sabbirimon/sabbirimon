/**
 * The code practice lab — a browser-based playground for HTML, CSS and
 * JavaScript, laid out like a Codédex exercise.
 *
 * The page is split in two: the lesson on the left, the workbench on the
 * right. The workbench has a file rail, a tab bar, an editor, a live
 * preview and a console, so a learner can write code and see it run
 * without leaving the page.
 *
 * Nothing here talks to a network. The HTML and CSS editors build a live
 * preview in a sandboxed iframe; the JavaScript editor runs in a worker-free
 * sandbox frame with a console bridge. Progress is kept in localStorage
 * under `imon-lab-progress-v1`.
 *
 * House rules: every DOM access happens inside `initLab`, and the pure
 * helpers below are exported so they can be tested under node.
 */

import { loadCurriculum } from './lab-curriculum.js';
import { renderPixelText } from './pixel-type.js';
import { initLabNotes } from './lab-notes.js';
import { initLabLearn } from './lab-chapters.js';
import { initLabFeedback, buildFeedback } from './lab-feedback.js';
import { initLabReward } from './lab-reward.js';
import { initLabProgress } from './lab-progress.js';
import { initLabLookup } from './lab-lookup.js';
import { formatLine, initTerminalPanel } from './lab-output.js';
import { quizExercises, QUIZ_CHAPTER } from './lab-quiz.js';
import { initLabQuiz } from './lab-quiz-ui.js';
import {
  CODE_LAB_PREFERRED_KEY,
  loadPreferred,
  savePreferred,
  togglePreferred,
  filterPreferred,
  preferredChapters,
  preferredLabel
} from './lab-preferred.js';

/** The localStorage key that holds the learner's progress. */
export const LAB_PROGRESS_KEY = 'imon-lab-progress-v1';

/** The languages the workbench can edit. */
export const LAB_LANGUAGES = ['html', 'css', 'js'];

/** How long the console keeps its scrollback. */
export const CONSOLE_HISTORY = 200;

/* ------------------------------------------------------------------ *
 * Courses and exercises
 * ------------------------------------------------------------------ */

/**
 * Every exercise the lab ships with.
 *
 * `check` is a pure function that receives the three editor buffers and
 * returns `{ ok, message, hint }`. It never throws: a broken check shows
 * up as an error message in the console rather than a blank page.
 *
 * The list starts with the hand-written taster course. The imported
 * Codédex curriculum is added to it at runtime by `loadCurriculum`, so
 * the built-in course still works if the data file cannot be fetched.
 */
export const EXERCISES = [
  {
    id: 'html-first-tag',
    language: 'html',
    title: 'Your first tag',
    chapter: 'Markup basics',
    xp: 10,
    requirements: ['p'],
    brief: 'Every web page starts with an HTML element. Add a second paragraph below the one that is already there.',
    starter: { html: '<p>I am a paragraph.</p>', css: '', js: '' },
    check: ({ html }) => {
      const tags = (html.match(/<p[\s>]/gi) || []).length;
      if (tags < 2) return { ok: false, message: 'The preview needs two paragraphs — add one more <p> element.', hint: 'Paragraphs look like <p>text</p>.' };
      return { ok: true, message: 'Two paragraphs. The page is growing!' };
    }
  },
  {
    id: 'html-heading',
    language: 'html',
    title: 'Give it a heading',
    chapter: 'Markup basics',
    xp: 10,
    requirements: ['h1', 'p'],
    brief: 'A heading tells the reader what the page is about. Turn the first paragraph into a level-one heading and add a paragraph underneath it.',
    starter: { html: '<p>My page</p>', css: '', js: '' },
    check: ({ html }) => {
      if (!/<h1[\s>]/i.test(html)) return { ok: false, message: 'No <h1> found. The heading element is missing.', hint: 'A level-one heading is <h1>text</h1>.' };
      if (!/<p[\s>]/i.test(html)) return { ok: false, message: 'The heading is there, but the paragraph underneath it is gone.', hint: 'Add a <p> element after the heading.' };
      return { ok: true, message: 'A heading and a paragraph. That is a page!' };
    }
  },
  {
    id: 'html-list',
    language: 'html',
    title: 'Make a list',
    chapter: 'Markup basics',
    xp: 15,
    requirements: ['ul', 'li'],
    brief: 'Lists group related things. Turn the three separate paragraphs into one unordered list.',
    starter: { html: '<p>Apples</p>\n<p>Pears</p>\n<p>Plums</p>', css: '', js: '' },
    check: ({ html }) => {
      if (!/<ul[\s>]/i.test(html)) return { ok: false, message: 'No <ul> found. An unordered list needs a <ul> element.', hint: 'Wrap each item in <li> and the items in <ul>.' };
      const items = (html.match(/<li[\s>]/gi) || []).length;
      if (items < 3) return { ok: false, message: `Only ${items} list item(s) found. There should be three.`, hint: 'Every fruit needs its own <li>.' };
      return { ok: true, message: 'A tidy list. Items beat paragraphs every time.' };
    }
  },
  {
    id: 'css-colour',
    language: 'css',
    title: 'Paint it blue',
    chapter: 'Styling basics',
    xp: 10,
    requirements: ['color'],
    brief: 'CSS decides how things look. Set the colour of the heading to blue.',
    starter: { html: '<h1>Hello</h1>', css: 'h1 {\n  /* change me */\n}', js: '' },
    check: ({ css }) => {
      if (!/h1/i.test(css)) return { ok: false, message: 'No h1 rule found in the stylesheet.', hint: 'Write the selector first: h1 { ... }' };
      if (!/color\s*:\s*[^;]+/i.test(css)) return { ok: false, message: 'The rule has no colour property.', hint: 'Add a line like color: #14adff;' };
      return { ok: true, message: 'The heading has a colour. CSS is doing its job.' };
    }
  },
  {
    id: 'css-box',
    language: 'css',
    title: 'Give it a box',
    chapter: 'Styling basics',
    xp: 15,
    requirements: ['padding', 'background-color'],
    brief: 'Every element is a box. Give the paragraph a background colour and some padding.',
    starter: { html: '<p>Boxed in</p>', css: 'p {\n  \n}', js: '' },
    check: ({ css }) => {
      if (!/padding\s*:\s*[^;]+/i.test(css)) return { ok: false, message: 'No padding found. The box has no room inside it.', hint: 'Try padding: 12px;' };
      if (!/background(-color)?\s*:\s*[^;]+/i.test(css)) return { ok: false, message: 'No background colour found.', hint: 'Try background: #e0f2fe;' };
      return { ok: true, message: 'Padding and a background. That is a box.' };
    }
  },
  {
    id: 'css-selector',
    language: 'css',
    title: 'One rule, many parts',
    chapter: 'Styling basics',
    xp: 20,
    requirements: ['font-weight'],
    brief: 'A selector can target every list item at once. Make every item in the list bold.',
    starter: { html: '<ul>\n  <li>One</li>\n  <li>Two</li>\n</ul>', css: '/* target the items */\n', js: '' },
    check: ({ css }) => {
      if (!/li/i.test(css)) return { ok: false, message: 'No li selector found.', hint: 'Target the items with li { ... }' };
      if (!/font-weight\s*:\s*[^;]+/i.test(css)) return { ok: false, message: 'No font-weight found.', hint: 'Try font-weight: bold;' };
      return { ok: true, message: 'Every item is bold. One selector, many parts.' };
    }
  },
  {
    id: 'js-variable',
    language: 'js',
    title: 'Name a number',
    chapter: 'Logic basics',
    xp: 10,
    requirements: ['variable', 'console.log'],
    brief: 'A variable gives a value a name. Declare a variable called `score` and set it to 42, then log it.',
    starter: { html: '', css: '', js: '// declare the score here\n' },
    check: ({ js }) => {
      if (!/\b(?:const|let|var)\s+score\b/i.test(js)) return { ok: false, message: 'No variable named score. Declare it with const, let or var.', hint: 'const score = 42;' };
      if (!/\b42\b/.test(js)) return { ok: false, message: 'The score is not 42 yet.', hint: 'Set score to the number 42.' };
      if (!/\bconsole\.log\b/.test(js)) return { ok: false, message: 'Nothing was logged. Add a console.log call.', hint: 'console.log(score);' };
      return { ok: true, message: 'A named number, logged to the console.' };
    }
  },
  {
    id: 'js-condition',
    language: 'js',
    title: 'Ask a question',
    chapter: 'Logic basics',
    xp: 20,
    requirements: ['condition'],
    brief: 'An `if` picks between two paths. Log "big" when the number is above 10, and "small" otherwise.',
    starter: { html: '', css: '', js: 'const n = 42;\n// add an if\n' },
    check: ({ js }) => {
      if (!/\bif\s*\(/.test(js)) return { ok: false, message: 'No if statement found.', hint: 'if (n > 10) { ... }' };
      if (!/\belse\b/.test(js)) return { ok: false, message: 'The if has no else branch, so there is only one path.', hint: 'Add an else { ... } after the if block.' };
      if (!/big/i.test(js) || !/small/i.test(js)) return { ok: false, message: 'Both messages are needed: "big" and "small".', hint: 'Log one message in the if and the other in the else.' };
      return { ok: true, message: 'Two paths, one question. That is a branch.' };
    }
  },
  {
    id: 'js-loop',
    language: 'js',
    title: 'Say it again',
    chapter: 'Logic basics',
    xp: 20,
    requirements: ['loop'],
    brief: 'A loop repeats a block of code. Log "tick" five times using a for loop.',
    starter: { html: '', css: '', js: '// write a for loop\n' },
    check: ({ js }) => {
      if (!/\bfor\s*\(/.test(js)) return { ok: false, message: 'No for loop found.', hint: 'for (let i = 0; i < 5; i++) { ... }' };
      if (!/\btick\b/i.test(js)) return { ok: false, message: 'The loop never logs "tick".', hint: 'Put console.log("tick") inside the loop body.' };
      if (!/<\s*5|<\s*=\s*5/.test(js)) return { ok: false, message: 'The loop does not run five times. The limit looks wrong.', hint: 'The condition should stop at five.' };
      return { ok: true, message: 'Five ticks. Repetition is cheap.' };
    }
  },
  {
    id: 'js-function',
    language: 'js',
    title: 'Make a function',
    chapter: 'Logic basics',
    xp: 25,
    requirements: ['function', 'return'],
    brief: 'A function takes an input and gives back an answer. Write a function called `double` that returns its argument multiplied by two, then log `double(21)`.',
    starter: { html: '', css: '', js: '// write the double function\n' },
    check: ({ js }) => {
      if (!/\bfunction\s+double\b/i.test(js) && !/\b(?:const|let|var)\s+double\s*=/i.test(js)) return { ok: false, message: 'No function named double.', hint: 'function double(n) { return n * 2; }' };
      if (!/\breturn\b/i.test(js)) return { ok: false, message: 'The function never returns anything.', hint: 'Return the doubled number.' };
      if (!/\*\s*2\b/.test(js)) return { ok: false, message: 'The function does not multiply by two.', hint: 'Return n * 2.' };
      if (!/double\s*\(\s*21\s*\)/.test(js)) return { ok: false, message: 'double(21) is never called.', hint: 'Log the result: console.log(double(21));' };
      return { ok: true, message: '42, as it should be. Functions are reusable tools.' };
    }
  },

  /* -- the JavaScript quiz ------------------------------------------ */
  /* The knowledge check. Each question is an exercise with no editor:
     the learner picks one of four answers, a wrong answer explains
     itself, and the XP is paid the first time a question is right. */
  ...quizExercises()
];

/* ------------------------------------------------------------------ *
 * The exercise registry
 * ------------------------------------------------------------------ */

/**
 * The imported exercises, added to the built-in course at runtime.
 *
 * Kept apart from `EXERCISES` so the built-in course stays a plain
 * constant that can be imported without side effects.
 */
let importedExercises = [];

/**
 * Every exercise the lab knows about, built-in first.
 *
 * An imported exercise never replaces a built-in one: if the two share an
 * id the built-in wins, so a broken data file cannot shadow the taster
 * course.
 */
export function allExercises() {
  const seen = new Set(EXERCISES.map(exercise => exercise.id));
  const extra = importedExercises.filter(exercise => !seen.has(exercise.id));
  return [...EXERCISES, ...extra];
}

/**
 * Add imported exercises to the registry.
 *
 * Returns how many were added. Malformed entries are skipped.
 */
export function addImportedExercises(list) {
  if (!Array.isArray(list)) return 0;
  const before = allExercises().length;
  for (const exercise of list) {
    if (!exercise || typeof exercise.id !== 'string' || !exercise.id) continue;
    if (typeof exercise.check !== 'function') continue;
    importedExercises.push(exercise);
  }
  return allExercises().length - before;
}

/** The exercises that belong to one chapter, in order. */
export function exercisesInChapter(chapter) {
  return allExercises().filter(exercise => exercise.chapter === chapter);
}

/** Every chapter name, in the order they first appear. */
export function labChapters() {
  const seen = [];
  for (const exercise of allExercises()) if (!seen.includes(exercise.chapter)) seen.push(exercise.chapter);
  return seen;
}

/**
 * Find an exercise by id. Returns null when there is no such exercise, so
 * a bad link can never crash the page.
 */
export function findExercise(id) {
  return allExercises().find(exercise => exercise.id === id) || null;
}

/**
 * The exercise that comes before or after `id` in the flat course order.
 *
 * Returns null at either end of the course so the caller can hide the
 * matching button instead of linking nowhere.
 */
export function neighbourExercise(id, direction) {
  const list = allExercises();
  const index = list.findIndex(exercise => exercise.id === id);
  if (index < 0) return null;
  const step = direction === 'prev' ? -1 : 1;
  const next = list[index + step];
  return next || null;
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

/**
 * Read the saved progress.
 *
 * Returns an empty shape when storage is missing or corrupt, so the lab
 * never shows a false zero.
 */
export function readLabProgress() {
  const empty = { solved: [], xp: 0 };
  try {
    const raw = globalThis.localStorage?.getItem(LAB_PROGRESS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const solved = Array.isArray(parsed?.solved) ? parsed.solved.filter(id => typeof id === 'string') : [];
    const xp = Number.isFinite(parsed?.xp) && parsed.xp >= 0 ? Math.floor(parsed.xp) : 0;
    return { solved, xp };
  } catch {
    return { solved: [], xp: 0 };
  }
}

/**
 * Merge new progress into the saved progress, keeping the better value.
 *
 * Solved exercises are a set, so solving one twice never double-counts.
 */
export function mergeLabProgress(saved, incoming) {
  const solved = new Set();
  for (const id of [...(saved?.solved || []), ...(incoming?.solved || [])]) if (typeof id === 'string') solved.add(id);
  const savedXp = Number.isFinite(saved?.xp) && saved.xp >= 0 ? Math.floor(saved.xp) : 0;
  const incomingXp = Number.isFinite(incoming?.xp) && incoming.xp >= 0 ? Math.floor(incoming.xp) : 0;
  return { solved: [...solved], xp: Math.max(savedXp, incomingXp) };
}

/**
 * Write progress to storage. Returns false when storage refused the write,
 * so the page can tell the learner their score will not be kept.
 */
export function writeLabProgress(progress) {
  try {
    globalThis.localStorage?.setItem(LAB_PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/**
 * The XP a learner has earned, counting only exercises they actually solved.
 *
 * This is what gets shown, so a tampered XP total in storage cannot inflate
 * the number on screen.
 */
export function earnedXp(progress) {
  const solved = new Set(progress?.solved || []);
  return allExercises().filter(exercise => solved.has(exercise.id)).reduce((total, exercise) => total + (exercise.xp || 0), 0);
}

/**
 * Redraw one element as pixel text.
 *
 * The display face is drawn as SVG, so any element that changes its words
 * has to be redrawn rather than just given new text. The words are read
 * from the element's text, not from the cached copy, so a second draw
 * picks up the new wording rather than repeating the first one.
 */
export function drawPixelText(element) {
  if (!element) return false;
  const cached = element.dataset?.pixelText;
  const live = element.textContent?.trim();
  // A drawn element holds the drawing in its markup, so its text content is
  // the SVG rather than the words. When the words are replaced the drawing
  // is gone and the live text is the new wording, so read whichever is
  // actually present.
  const holdsDrawing = Boolean(element.querySelector?.('.pixel-text'));
  const text = holdsDrawing ? cached : (live || cached);
  if (!text) return false;
  element.dataset.pixelText = text;
  element.setAttribute('data-pixel-text-drawn', 'true');
  element.dataset.pixelTextDrawn = 'true';
  element.innerHTML = renderPixelText(text);
  return true;
}

/* ------------------------------------------------------------------ *
 * Building the preview
 * ------------------------------------------------------------------ */

/**
 * Wrap the learner's HTML in a small document so the preview iframe has a
 * predictable shell. The stylesheet is injected by the caller.
 */
export function buildPreviewDocument(html, css) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 20px; font-family: Mulish, system-ui, sans-serif; font-size: 16px; line-height: 1.5; color: #f5f5fc; background: #0b1026; }
  h1 { font-size: 24px; margin: 0 0 12px; }
  h2 { font-size: 18px; margin: 0 0 8px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 24px; }
</style>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * The shell that hosts the JavaScript editor's code.
 *
 * The learner's code runs inside this page. Console output is forwarded to
 * the parent through `postMessage`, so the lab can print it in its own
 * console without giving the script access to the host page.
 */
export function buildScriptFrame(js) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
(function () {
  var send = function (kind, payload) {
    try {
      parent.postMessage({ source: 'imon-lab', kind: kind, payload: payload }, '*');
    } catch (error) { /* the host went away; nothing to do */ }
  };
  var format = function (value) {
    // A value is sent as a string, because that is the only thing that
    // survives postMessage. The kind of the value is sent beside it, so
    // the terminal can colour a number like a number and a string like
    // a string. That difference is the whole point of the exercise, so
    // it must not be lost on the way here.
    if (typeof value === 'string') return { text: value, kind: 'text' };
    if (value instanceof Error) return { text: value.name + ': ' + value.message, kind: 'text' };
    if (value === undefined) return { text: 'undefined', kind: 'empty' };
    if (value === null) return { text: 'null', kind: 'empty' };
    if (typeof value === 'number') return { text: String(value), kind: 'number' };
    if (typeof value === 'boolean') return { text: String(value), kind: 'boolean' };
    try { return { text: JSON.stringify(value, null, 2), kind: 'plain' }; } catch (error) { return { text: String(value), kind: 'plain' }; }
  };
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var values = Array.prototype.slice.call(arguments).map(format);
      var args = values.map(function (value) { return value.text; });
      var kinds = values.map(function (value) { return value.kind; });
      send('console', { level: level, args: args, kinds: kinds });
      if (original) original.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (event) {
    send('console', { level: 'error', args: [String(event.message)] });
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    send('console', { level: 'error', args: [reason && reason.message ? reason.message : String(reason)] });
  });
  send('ready', {});
})();
</script>
</head>
<body>
<script>
try {
${String(js || '').split('\n').map(line => '  ' + line).join('\n')}
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
}
</script>
</body>
</html>`;
}

/**
 * Format one console entry for the terminal panel.
 *
 * Numbers keep their type, objects are pretty-printed on several lines and
 * everything else is shown as-is.
 */
export function formatConsoleEntry(entry) {
  const level = entry?.level || 'log';
  const args = Array.isArray(entry?.args) ? entry.args : [];
  const text = args.join(' ');
  const prefix = level === 'error' ? '✖' : level === 'warn' ? '▲' : level === 'info' ? 'ℹ' : '›';
  return { level, prefix, text };
}

/* ------------------------------------------------------------------ *
 * The lab itself
 * ------------------------------------------------------------------ */

/**
 * Wire the lab up.
 *
 * Returns the API the page uses, so the behaviour can be exercised from
 * a test without a browser.
 */
export function initLab(root = document) {
  const exercise = findExercise(root?.dataset?.labExercise || '') || allExercises()[0];
  const state = { exercise, buffers: { ...exercise.starter }, solved: new Set() };

  const previewFrame = root?.querySelector?.('[data-lab-preview]');
  const scriptFrame = root?.querySelector?.('[data-lab-script]');
  const editors = {
    html: root?.querySelector?.('[data-lab-editor="html"]'),
    css: root?.querySelector?.('[data-lab-editor="css"]'),
    js: root?.querySelector?.('[data-lab-editor="js"]')
  };
  const consoleList = root?.querySelector?.('[data-lab-console]');
  // The terminal panel: the bar, the empty state and the rim that marks
  // a failed check.
  const panel = initTerminalPanel(root);
  const status = root?.querySelector?.('[data-lab-status]');
  const runButton = root?.querySelector?.('[data-lab-run]');
  const checkButton = root?.querySelector?.('[data-lab-check]');
  const resetButton = root?.querySelector?.('[data-lab-reset]');
  const tabs = [...(root?.querySelectorAll?.('[data-lab-tab]') || [])];
  const brief = root?.querySelector?.('[data-lab-brief]');
  const title = root?.querySelector?.('[data-lab-title]');
  const chapter = root?.querySelector?.('[data-lab-chapter]');
  const xpLabel = root?.querySelector?.('[data-lab-xp]');
  const rail = root?.querySelector?.('[data-lab-rail]');
  const counter = root?.querySelector?.('[data-lab-counter]');
  const progressBar = root?.querySelector?.('[data-lab-progress]');
  const prevButton = root?.querySelector?.('[data-lab-prev]');
  const nextButton = root?.querySelector?.('[data-lab-next]');
  const doneButton = root?.querySelector?.('[data-lab-done]');
  const credit = root?.querySelector?.('[data-lab-credit]');
  const clearButton = root?.querySelector?.('[data-lab-clear]');
  const kicker = root?.querySelector?.('[data-lab-brief-kicker]');
  // The preferred filter above the rail, and the count beside it.
  const preferredOnly = root?.querySelector?.('[data-lab-preferred-only]');
  const preferredCount = root?.querySelector?.('[data-lab-preferred-count]');
  // The exercises the learner has starred. Whether the rail is showing
  // only those is held on the filter button's `aria-pressed`, so the
  // button and the rail can never disagree.
  let preferred = loadPreferred(globalThis.localStorage, CODE_LAB_PREFERRED_KEY);
  const showingPreferred = () => preferredOnly?.getAttribute('aria-pressed') === 'true';
  // The help text is different for a quiz, because there is no code to
  // reset and no file to open.
  const helpCode = root?.querySelector?.('[data-lab-help-code]');
  const helpQuiz = root?.querySelector?.('[data-lab-help-quiz]');
  const stepsCode = root?.querySelector?.('[data-lab-steps-code]');
  const stepsQuiz = root?.querySelector?.('[data-lab-steps-quiz]');
  // The documentation panel. It asks a free, keyless search service
  // about whatever tag or property the learner picks.
  const lookup = initLabLookup(root);
  // The explanation panel under the editor. It fills the space below the
  // code with what the exercise is actually teaching. The lookup callback
  // is what makes each note card searchable.
  const notes = initLabNotes(root, (term, language) => lookup?.lookup(term, language));
  // The learning panel: goal, study material, how the answer is checked
  // and what you can do afterwards.
  const learn = initLabLearn(root);
  // The panel that says what is wrong, where it is and how to fix it.
  const feedback = initLabFeedback(root);
  // The celebration that pays out coins on a correct answer.
  const reward = initLabReward(root);
  // The progress track under the course bar.
  const track = initLabProgress(root);
  // The quiz panel. A quiz exercise has no editor, so this panel takes
  // the place of the code pane.
  const quiz = initLabQuiz(root);
  // The tab bar and the code pane are hidden while a quiz is open.
  const tabBar = root?.querySelector?.('[data-lab-tabs]');
  const editorPane = root?.querySelector?.('.lab-editor-pane');

  /**
   * Is the current exercise a quiz?
   *
   * The kind is on the exercise itself, so a new kind of exercise only
   * has to say so once.
   */
  const isQuiz = () => state.exercise?.kind === 'quiz';

  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  /* -- console ---------------------------------------------------- */

  function print(level, text) {
    if (!consoleList) return;
    const entry = formatConsoleEntry({ level, args: [text] });
    const line = document.createElement('li');
    line.className = `lab-console-line lab-console-${level}`;
    const mark = document.createElement('span');
    mark.className = 'lab-console-mark';
    mark.textContent = entry.prefix;
    const body = document.createElement('span');
    body.className = 'lab-console-text';
    body.textContent = entry.text;
    line.append(mark, body);
    consoleList.append(line);
    while (consoleList.children.length > CONSOLE_HISTORY) consoleList.firstElementChild?.remove();
    consoleList.scrollTop = consoleList.scrollHeight;
    panel?.showEmpty?.(false);
  }

  /**
   * Print one entry from the sandbox, keeping the kind of each value.
   *
   * The kind is what lets a number be drawn like a number and a string
   * like a string, which is the whole reason the terminal is styled the
   * way it is.
   */
  function printEntry(entry) {
    if (!consoleList) return;
    const line = document.createElement('li');
    line.className = `lab-console-line lab-console-${entry.level}`;
    const mark = document.createElement('span');
    mark.className = 'lab-console-mark';
    mark.textContent = entry.prefix;
    const body = document.createElement('span');
    body.className = 'lab-console-text';
    for (const run of entry.runs) {
      const span = document.createElement('span');
      span.className = 'lab-console-value';
      span.style.color = run.colour;
      span.textContent = run.text;
      body.append(span);
    }
    line.append(mark, body);
    consoleList.append(line);
    while (consoleList.children.length > CONSOLE_HISTORY) consoleList.firstElementChild?.remove();
    consoleList.scrollTop = consoleList.scrollHeight;
    panel?.showEmpty?.(false);
  }

  function clearConsole() {
    if (consoleList) consoleList.textContent = '';
    panel?.showEmpty?.(true);
  }

  /* -- preview ---------------------------------------------------- */

  function refreshPreview() {
    if (!previewFrame) return;
    const doc = buildPreviewDocument(state.buffers.html, state.buffers.css);
    previewFrame.srcdoc = doc;
  }

  function runScript() {
    if (!scriptFrame) return;
    clearConsole();
    scriptFrame.srcdoc = buildScriptFrame(state.buffers.js);
  }

  function refreshAll() {
    refreshPreview();
    runScript();
  }

  /* -- checking --------------------------------------------------- */

  function check() {
    let result;
    try {
      // A quiz checker reads the chosen answer; a code checker reads the
      // editor buffers. Both are handed everything, because a checker
      // only ever looks at the keys it cares about.
      result = state.exercise.check({ ...state.buffers, chosen: quiz?.chosen?.() });
    } catch (error) {
      result = { ok: false, message: 'The checker hit an error: ' + (error?.message || error) };
    }
    if (!result || typeof result.ok !== 'boolean') result = { ok: false, message: 'The checker returned nothing useful.' };
    if (status) {
      status.textContent = result.message;
      status.dataset.state = result.ok ? 'ok' : 'error';
    }
    // The terminal is rimmed in red when the check fails, the way the
    // reference terminal does, so the learner sees the verdict without
    // having to read the line.
    panel?.setState?.(result.ok ? 'ok' : 'failed');
    if (result.ok) {
      const firstTime = !state.solved.has(state.exercise.id);
      state.solved.add(state.exercise.id);
      const progress = mergeLabProgress(readLabProgress(), { solved: [state.exercise.id] });
      progress.xp = earnedXp(progress);
      writeLabProgress(progress);
      updateXp(progress.xp);
      updateRail();
      updateCounter();
      // The wrong-answer panel is cleared, because the answer is right now.
      feedback?.hide();
      // The coins only fly the first time an exercise is solved, so the
      // learner cannot farm the same exercise for points.
      if (firstTime) {
        reward?.show(state.exercise, state.exercise.xp || 0, progress.xp);
        print('info', `+${state.exercise.xp} XP · ${result.message}`);
      } else {
        reward?.hide();
        print('info', `Already solved. ${result.message}`);
      }
    } else {
      reward?.hide();
      print('error', result.message);
      if (result.hint) print('warn', 'Hint: ' + result.hint);
      // The code panel explains a wrong answer by pointing at the file and
      // the line. A quiz has no file, so the panel is skipped and the
      // quiz verdict and the terminal do the explaining instead.
      if (!isQuiz()) {
        const detail = feedback?.show(buildFeedback({ ...state.buffers }, result));
        if (detail?.where) print('info', `Look at ${detail.where.file}, line ${detail.where.line}.`);
      }
    }
    // The panel is told the verdict last, so it shows the same answer the
    // terminal printed.
    if (isQuiz()) quiz?.judge?.(result);
    return result;
  }

  /* -- chrome ----------------------------------------------------- */

  function updateXp(value) {
    if (!xpLabel) return;
    xpLabel.textContent = `${value} XP`;
    // The XP badge is drawn as pixel art, so it has to be redrawn.
    drawPixelText(xpLabel);
  }

  function updateRail() {
    if (!rail) return;
    for (const link of rail.querySelectorAll('[data-lab-rail-item]')) {
      const id = link.dataset.labRailItem;
      link.dataset.state = state.solved.has(id) ? 'solved' : 'open';
      const mark = link.querySelector('.lab-rail-mark');
      if (mark) mark.textContent = state.solved.has(id) ? '✔' : '•';
      const label = link.querySelector('.lab-rail-label');
      if (label) label.setAttribute('aria-current', id === state.exercise.id ? 'true' : 'false');
    }
  }

  /**
   * Rebuild the chapter rail from the registry.
   *
   * The rail is drawn rather than hand-written so the imported course
   * shows up without touching the markup. Each chapter gets its own
   * group, and the groups keep the order the chapters first appear in.
   */
  function renderRail() {
    if (!rail) return;
    rail.textContent = '';
    const list = allExercises();
    // With the filter on, only the starred exercises are shown, and the
    // chapters that hold nothing starred are dropped so the rail does not
    // show empty headings.
    const chapters = showingPreferred()
      ? preferredChapters(list, preferred)
      : labChapters();
    for (const chapterName of chapters) {
      const group = document.createElement('li');
      group.className = 'lab-rail-group';
      const heading = document.createElement('p');
      heading.className = 'lab-rail-chapter';
      heading.textContent = chapterName;
      group.append(heading);
      const items = document.createElement('ol');
      items.className = 'lab-rail-items';
      const inChapter = exercisesInChapter(chapterName);
      const shown = showingPreferred()
        ? filterPreferred(inChapter, preferred)
        : inChapter;
      for (const exercise of shown) {
        const item = document.createElement('li');
        item.className = 'lab-rail-item';
        const link = document.createElement('a');
        link.href = './lab.html?exercise=' + encodeURIComponent(exercise.id);
        link.dataset.labRailItem = exercise.id;
        link.className = 'lab-rail-link';
        const mark = document.createElement('span');
        mark.className = 'lab-rail-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '•';
        const label = document.createElement('span');
        label.className = 'lab-rail-label';
        label.textContent = exercise.title;
        link.append(mark, label);
        // The star sits beside the link, not inside it, so clicking it
        // stars the exercise instead of opening it.
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'lab-rail-star';
        star.dataset.labStar = exercise.id;
        const starred = preferred.has(exercise.id);
        star.setAttribute('aria-pressed', starred ? 'true' : 'false');
        star.setAttribute('aria-label', preferredLabel(starred, exercise.title));
        star.title = starred ? 'Preferred' : 'Add to preferred';
        star.textContent = starred ? '★' : '☆';
        item.append(link, star);
        items.append(item);
      }
      group.append(items);
      rail.append(group);
    }
    if (preferredCount) {
      const count = preferred.size;
      preferredCount.textContent = count === 1 ? '1 starred' : `${count} starred`;
      preferredCount.hidden = count === 0 && !showingPreferred();
    }
  }

  /**
   * Star or unstar an exercise and redraw the rail.
   */
  function toggleStar(id) {
    preferred = togglePreferred(preferred, id);
    savePreferred(preferred, globalThis.localStorage, CODE_LAB_PREFERRED_KEY);
    renderRail();
    updateRail();
    if (status) {
      status.textContent = preferred.has(id) ? 'Added to preferred.' : 'Removed from preferred.';
      status.dataset.state = 'ok';
    }
  }

  /**
   * Update the footer bar: the chapter, the exercise number and the
   * progress through the course.
   */
  function updateCounter() {
    const list = allExercises();
    const index = list.findIndex(exercise => exercise.id === state.exercise.id);
    const position = index < 0 ? 0 : index + 1;
    if (counter) {
      counter.textContent = `Exercise ${position} / ${list.length}`;
      drawPixelText(counter);
    }
    if (progressBar) {
      const solved = list.filter(exercise => state.solved.has(exercise.id)).length;
      progressBar.max = list.length;
      progressBar.value = solved;
      const percent = list.length ? Math.round((solved / list.length) * 100) : 0;
      progressBar.setAttribute('aria-valuetext', `${solved} of ${list.length} exercises solved`);
      progressBar.dataset.percent = String(percent);
    }
    if (chapter) {
      chapter.textContent = state.exercise.chapter;
      drawPixelText(chapter);
    }
    if (prevButton) prevButton.hidden = !neighbourExercise(state.exercise.id, 'prev');
    if (nextButton) nextButton.hidden = !neighbourExercise(state.exercise.id, 'next');
    if (doneButton) doneButton.hidden = !state.solved.has(state.exercise.id);
    // The track under the bar lists every chapter and how far through it
    // the learner is.
    track?.render(labChapters(), list, state.solved, state.exercise.chapter, earnedXp({ solved: [...state.solved] }));
  }

  function selectTab(language) {
    // A quiz has no files to choose between, so the tab bar stays put.
    if (isQuiz()) return;
    for (const tab of tabs) {
      const active = tab.dataset.labTab === language;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    }
    for (const [name, editor] of Object.entries(editors)) {
      if (editor) editor.hidden = name !== language;
    }
  }

  function loadExercise(id) {
    const next = findExercise(id);
    if (!next) return null;
    state.exercise = next;
    state.buffers = { ...next.starter };
    for (const [name, editor] of Object.entries(editors)) if (editor) editor.value = state.buffers[name];
    // The kicker names the chapter and the title names the exercise. They
    // are drawn separately, so the title is set after the kicker.
    if (kicker) {
      kicker.textContent = next.chapter || 'Exercise';
      drawPixelText(kicker);
    }
    if (title) {
      title.textContent = next.title;
      drawPixelText(title);
    }
    if (brief) brief.textContent = next.brief;
    if (status) { status.textContent = ''; status.removeAttribute('data-state'); }
    feedback?.hide();
    reward?.hide();
    lookup?.hide();
    notes?.render(next);
    learn?.render(next.chapter);
    // A quiz takes the place of the code pane, and the tab bar goes with
    // it — there is no file to choose.
    if (next.kind === 'quiz') {
      if (editorPane) editorPane.hidden = true;
      if (tabBar) tabBar.hidden = true;
      // There is nothing to run and nothing to check: picking an answer
      // is the whole interaction. Reset goes too — a quiz has no starting
      // code to bring back.
      if (runButton) runButton.hidden = true;
      if (checkButton) checkButton.hidden = true;
      if (resetButton) resetButton.hidden = true;
      if (helpCode) helpCode.hidden = true;
      if (helpQuiz) helpQuiz.hidden = false;
      if (stepsCode) stepsCode.hidden = true;
      if (stepsQuiz) stepsQuiz.hidden = false;
      const list = allExercises();
      const position = list.findIndex(exercise => exercise.id === next.id) + 1;
      quiz?.render(next, position, list.length);
      clearConsole();
    } else {
      if (editorPane) editorPane.hidden = false;
      if (tabBar) tabBar.hidden = false;
      if (runButton) runButton.hidden = false;
      if (checkButton) checkButton.hidden = false;
      if (resetButton) resetButton.hidden = false;
      if (helpCode) helpCode.hidden = false;
      if (helpQuiz) helpQuiz.hidden = true;
      if (stepsCode) stepsCode.hidden = false;
      if (stepsQuiz) stepsQuiz.hidden = true;
      quiz?.hide();
      refreshAll();
    }
    updateRail();
    updateCounter();
    return next;
  }

  /* -- events ----------------------------------------------------- */

  const onEditorInput = event => {
    const language = event.target?.dataset?.labEditor;
    if (!language) return;
    state.buffers[language] = event.target.value;
    if (language === 'js') runScript(); else refreshPreview();
  };

  const onTabClick = event => {
    const language = event.target?.closest?.('[data-lab-tab]')?.dataset?.labTab;
    if (language) selectTab(language);
  };

  /**
   * Look one term up in the documentation service.
   *
   * The panel is hidden while the request is in flight, then filled in
   * either with the pages the service found or with the reason it could
   * not be reached. The built-in notes stay on screen either way.
   */
  const onNoteLookup = event => {
    const button = event.target?.closest?.('[data-lab-note-lookup]');
    if (!button) return;
    const term = button.dataset.labNoteLookup;
    if (!term) return;
    const language = state.exercise?.language || 'html';
    lookup?.hide();
    print('info', `Looking up “${term}”…`);
    lookup?.lookup(term, language).then(result => {
      if (result?.ok) print('info', `Found ${result.pages.length} question(s) for “${term}”.`);
      else print('warn', 'The search service could not be reached.');
    });
  };

  const onMessage = event => {
    const data = event.data;
    if (!data || data.source !== 'imon-lab') return;
    if (data.kind === 'console') {
      // The sandbox sends `{ source, kind, payload: { level, args, kinds } }`.
      const payload = data.payload || {};
      const entry = formatLine({ level: payload.level, args: payload.args, hints: payload.kinds });
      printEntry(entry);
    }
  };

  for (const editor of Object.values(editors)) editor?.addEventListener('input', onEditorInput);
  root?.querySelector?.('[data-lab-tabs]')?.addEventListener('click', onTabClick);
  root?.querySelector?.('[data-lab-notes]')?.addEventListener('click', onNoteLookup);
  // A pick is checked the moment it is made, so the learner is told
  // straight away whether the answer was right.
  quiz?.onPick?.(() => { check(); });
  // Trying again puts the question back the way it was. It is the same
  // thing as pressing reset.
  quiz?.onRetry?.(() => {
    if (status) { status.textContent = ''; status.removeAttribute('data-state'); }
    panel?.setState?.('idle');
  });
  runButton?.addEventListener('click', () => {
    if (isQuiz()) return;
    refreshAll();
    print('info', 'Ran the code.');
  });
  checkButton?.addEventListener('click', check);
  resetButton?.addEventListener('click', () => {
    state.buffers = { ...state.exercise.starter };
    for (const [name, editor] of Object.entries(editors)) if (editor) editor.value = state.buffers[name];
    if (status) { status.textContent = ''; status.removeAttribute('data-state'); }
    feedback?.hide();
    reward?.hide();
    if (isQuiz()) {
      quiz?.reset?.();
      panel?.setState?.('idle');
      clearConsole();
      return;
    }
    refreshAll();
    print('info', 'Reset to the starting code.');
  });
  // Clearing the terminal leaves nothing behind, so the empty state
  // comes back and says the panel is waiting for a run. A line saying
  // "cleared" would hide that message again straight away.
  clearButton?.addEventListener('click', () => {
    clearConsole();
  });
  globalThis.addEventListener('message', onMessage);

  /* -- navigation ------------------------------------------------- */

  const goTo = id => {
    if (!id) return;
    if (loadExercise(id)) {
      history.replaceState(null, '', '?exercise=' + encodeURIComponent(id));
    }
  };

  prevButton?.addEventListener('click', () => goTo(neighbourExercise(state.exercise.id, 'prev')?.id));
  nextButton?.addEventListener('click', () => goTo(neighbourExercise(state.exercise.id, 'next')?.id));
  doneButton?.addEventListener('click', () => {
    const next = neighbourExercise(state.exercise.id, 'next');
    if (next) goTo(next.id);
  });

  /* -- preferred exercises ---------------------------------------- */

  // The star button and the filter both live inside the rail, so one
  // delegated listener on the rail handles the stars. The filter button
  // sits outside the rail, so it gets its own.
  rail?.addEventListener('click', event => {
    const star = event.target?.closest?.('[data-lab-star]');
    if (!star) return;
    event.preventDefault();
    toggleStar(star.dataset.labStar);
  });
  preferredOnly?.addEventListener('click', () => {
    const on = preferredOnly.getAttribute('aria-pressed') === 'true';
    preferredOnly.setAttribute('aria-pressed', on ? 'false' : 'true');
    renderRail();
    updateRail();
  });

  /* -- the imported course ---------------------------------------- */

  /**
   * Pull in the imported Codédex course and rebuild the rail around it.
   *
   * The built-in taster course stays first. If the data file cannot be
   * read the lab simply keeps what it had.
   */
  async function importCourse() {
    const { exercises, source } = await loadCurriculum();
    if (!exercises.length) return 0;
    const added = addImportedExercises(exercises);
    if (credit) credit.textContent = source ? `Exercises imported from ${source}` : '';
    renderRail();
    updateCounter();
    return added;
  }

  /* -- boot ------------------------------------------------------- */

  const saved = readLabProgress();
  state.solved = new Set(saved.solved);
  renderRail();
  updateXp(earnedXp(saved));
  loadExercise(state.exercise.id);
  selectTab(state.exercise.language);
  updateRail();
  updateCounter();
  if (reduced()) document.documentElement.setAttribute('data-reduced-motion', 'true');

  return {
    state,
    check,
    run: refreshAll,
    loadExercise,
    selectTab,
    print,
    clearConsole,
    renderRail,
    updateCounter,
    importCourse,
    destroy() {
      globalThis.removeEventListener('message', onMessage);
      for (const editor of Object.values(editors)) editor?.removeEventListener('input', onEditorInput);
    }
  };
}
