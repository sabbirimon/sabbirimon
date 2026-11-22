/**
 * The AI lab page controller — the workbench for the AI and system-design
 * course.
 *
 * It follows the same shape as the code lab: a lesson on the left, a
 * workbench on the right, a chapter rail, XP and a progress bar. The
 * difference is the editor. A Python exercise runs in the interpreter that
 * lives in `ai-lab.js`; a design exercise is written as prose in the same
 * box and checked for the ideas it mentions.
 *
 * Nothing here talks to a network. The course is fetched from a local JSON
 * file, and progress is kept in localStorage under `imon-ai-lab-v1`.
 *
 * House rules: every DOM access happens inside `initAiLab`, and the pure
 * helpers below are exported so they can be tested under node.
 */

import { loadAiCourse, runPython, formatValue } from './ai-lab.js';
import { renderPixelText } from './pixel-type.js';

/** The localStorage key that holds the learner's progress. */
export const AI_PROGRESS_KEY = 'imon-ai-lab-v1';

/** The two kinds of exercise the lab teaches. */
export const AI_EXERCISE_KINDS = ['python', 'design'];

/* ------------------------------------------------------------------ *
 * Pixel headings
 * ------------------------------------------------------------------ */

/**
 * Draw one element as pixel art with the words it holds right now.
 *
 * `initPixelText` caches the first wording it sees, so an element whose
 * text changes later has to be redrawn by hand. The words are kept in
 * `data-pixel-text` so the next redraw does not read them out of the SVG.
 *
 * An element that already holds a drawing has no text of its own — the
 * words live in the SVG's label — so the label is read back when the
 * plain text is gone.
 */
export function drawAiPixelText(element) {
  if (!element) return false;
  const drawn = element.querySelector?.('.pixel-text');
  const label = drawn?.getAttribute?.('aria-label') || '';
  const text = String(element.textContent || '').trim() || label || element.dataset.pixelText || '';
  if (!text) return false;
  element.dataset.pixelText = text;
  element.setAttribute('data-pixel-text-drawn', 'true');
  element.innerHTML = renderPixelText(text);
  return true;
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

/**
 * Read the saved progress.
 *
 * A corrupt or missing value gives an empty progress rather than throwing,
 * because a broken localStorage entry must never take the page down.
 */
export function readAiProgress() {
  try {
    const raw = globalThis.localStorage?.getItem?.(AI_PROGRESS_KEY);
    if (!raw) return { solved: [], xp: 0 };
    const parsed = JSON.parse(raw);
    const solved = Array.isArray(parsed?.solved) ? parsed.solved.filter(id => typeof id === 'string') : [];
    return { solved, xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0 };
  } catch {
    return { solved: [], xp: 0 };
  }
}

/**
 * Write the saved progress, ignoring a storage that refuses to write.
 */
export function writeAiProgress(progress) {
  try {
    globalThis.localStorage?.setItem?.(AI_PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge new solved ids into the saved progress and recalculate the XP.
 *
 * The XP comes from the exercise list, because that is where each
 * exercise says what it is worth.
 */
export function mergeAiProgress(progress, solved, exercises) {
  const set = new Set(progress?.solved || []);
  for (const id of solved || []) set.add(id);
  const ids = [...set];
  return { solved: ids, xp: earnedAiXp(ids, aiExerciseXp(exercises)) };
}

/**
 * The XP for a list of solved exercise ids.
 *
 * The XP each exercise is worth is looked up by id, because the exercise
 * list lives in the course file and the progress file only stores ids.
 */
export function earnedAiXp(ids, xpById) {
  let total = 0;
  for (const id of ids) total += Number(xpById[id]) || 0;
  return total;
}

/**
 * Build the id → XP map for a list of exercises.
 */
export function aiExerciseXp(exercises) {
  const map = {};
  for (const exercise of exercises || []) {
    if (exercise?.id) map[exercise.id] = Number(exercise.xp) || 0;
  }
  return map;
}

/* ------------------------------------------------------------------ *
 * The course
 * ------------------------------------------------------------------ */

/**
 * Group exercises by chapter, keeping the order the chapters first appear
 * in.
 */
export function aiChapters(exercises) {
  const order = [];
  const groups = {};
  for (const exercise of exercises || []) {
    const chapter = exercise?.chapter || 'AI Lab';
    if (!groups[chapter]) {
      groups[chapter] = [];
      order.push(chapter);
    }
    groups[chapter].push(exercise);
  }
  return order.map(chapter => ({ chapter, exercises: groups[chapter] }));
}

/**
 * Find an exercise by id.
 */
export function findAiExercise(exercises, id) {
  return (exercises || []).find(exercise => exercise.id === id) || null;
}

/**
 * The exercise before or after the given one.
 */
export function neighbourAiExercise(exercises, id, direction) {
  const list = exercises || [];
  const index = list.findIndex(exercise => exercise.id === id);
  if (index < 0) return null;
  const next = direction === 'prev' ? index - 1 : index + 1;
  if (next < 0 || next >= list.length) return null;
  return list[next];
}

/* ------------------------------------------------------------------ *
 * Running Python
 * ------------------------------------------------------------------ */

/**
 * Run a Python program and turn the result into console lines.
 *
 * The interpreter returns the printed lines and, when something goes wrong,
 * a plain-language message. Both are turned into the same shape the console
 * draws, so the page only has to care about one thing.
 */
export function runAiProgram(source) {
  const result = runPython(source || '');
  const lines = result.output.map(line => ({ level: 'out', text: line }));
  if (result.error) lines.push({ level: 'error', text: result.error });
  return lines;
}

/**
 * The starting text for an exercise.
 */
export function aiStarterText(exercise) {
  if (!exercise) return '';
  if (exercise.kind === 'design') return exercise.starter?.design || '';
  return exercise.starter?.python || '';
}

/**
 * The label the workbench shows for an exercise kind.
 */
export function aiKindLabel(exercise) {
  return exercise?.kind === 'design' ? 'Design answer' : 'Python';
}

/**
 * A one-line hint about what the editor accepts, shown above the editor.
 */
export function aiEditorHint(exercise) {
  if (exercise?.kind === 'design') {
    return 'Write your design in plain English. The checker looks for the ideas the brief asks about.';
  }
  return 'Write Python. Press Run to see what it prints.';
}

/**
 * The expected output lines of a Python exercise, formatted for the brief.
 *
 * A design exercise has no expected output, so it gets nothing.
 */
export function aiExpectedText(exercise) {
  if (exercise?.kind === 'design') return '';
  const expected = exercise?.expected;
  if (!Array.isArray(expected) || !expected.length) return '';
  return expected.map(line => formatValue(line)).join('\n');
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

/**
 * Build the AI lab workbench.
 *
 * `root` is the page element. Everything it touches is found inside that
 * element, so the function can be pointed at a test double.
 */
export function initAiLab(root = document) {
  const state = { exercises: [], exercise: null, solved: new Set(), buffers: { python: '', design: '' } };

  const editor = root?.querySelector?.('[data-ai-editor]');
  const consoleList = root?.querySelector?.('[data-ai-console]');
  const status = root?.querySelector?.('[data-ai-status]');
  const runButton = root?.querySelector?.('[data-ai-run]');
  const checkButton = root?.querySelector?.('[data-ai-check]');
  const resetButton = root?.querySelector?.('[data-ai-reset]');
  const brief = root?.querySelector?.('[data-ai-brief]');
  const title = root?.querySelector?.('[data-ai-title]');
  const chapter = root?.querySelector?.('[data-ai-chapter]');
  const xpLabel = root?.querySelector?.('[data-ai-xp]');
  const rail = root?.querySelector?.('[data-ai-rail]');
  const counter = root?.querySelector?.('[data-ai-counter]');
  const progressBar = root?.querySelector?.('[data-ai-progress]');
  const prevButton = root?.querySelector?.('[data-ai-prev]');
  const nextButton = root?.querySelector?.('[data-ai-next]');
  const doneButton = root?.querySelector?.('[data-ai-done]');
  const hint = root?.querySelector?.('[data-ai-hint]');
  const expected = root?.querySelector?.('[data-ai-expected]');
  const kindBadge = root?.querySelector?.('[data-ai-kind]');
  const credit = root?.querySelector?.('[data-ai-credit]');
  const empty = root?.querySelector?.('[data-ai-empty]');

  /* -- console ---------------------------------------------------- */

  function print(level, text) {
    if (!consoleList) return;
    const line = document.createElement('li');
    line.className = `lab-console-line lab-console-${level}`;
    const mark = document.createElement('span');
    mark.className = 'lab-console-mark';
    mark.textContent = level === 'error' ? '✖' : level === 'warn' ? '!' : level === 'ok' ? '✔' : '›';
    const body = document.createElement('span');
    body.className = 'lab-console-text';
    body.textContent = text;
    line.append(mark, body);
    consoleList.append(line);
    consoleList.scrollTop = consoleList.scrollHeight;
  }

  function clearConsole() {
    if (consoleList) consoleList.textContent = '';
  }

  /* -- running ---------------------------------------------------- */

  function run() {
    clearConsole();
    if (state.exercise?.kind === 'design') {
      const text = state.buffers.design.trim();
      print('info', text ? 'Read your design answer. Press Check answer when you are ready.' : 'The answer box is empty.');
      return [];
    }
    const lines = runAiProgram(state.buffers.python);
    for (const line of lines) print(line.level, line.text);
    return lines;
  }

  /* -- checking --------------------------------------------------- */

  function check() {
    if (!state.exercise) return { ok: false, message: 'No exercise is open.' };
    let result;
    try {
      result = state.exercise.check({
        js: state.exercise.kind === 'design' ? state.buffers.design : state.buffers.python,
        html: '',
        css: ''
      });
    } catch (error) {
      result = { ok: false, message: 'The checker hit an error: ' + (error?.message || error) };
    }
    if (!result || typeof result.ok !== 'boolean') result = { ok: false, message: 'The checker returned nothing useful.' };
    if (status) {
      status.textContent = result.message;
      status.dataset.state = result.ok ? 'ok' : 'error';
    }
    if (result.ok) {
      state.solved.add(state.exercise.id);
      const progress = mergeAiProgress(readAiProgress(), [state.exercise.id], state.exercises);
      writeAiProgress(progress);
      updateXp(progress.xp);
      updateRail();
      updateCounter();
      print('ok', `+${state.exercise.xp} XP · ${result.message}`);
    } else {
      print('error', result.message);
      if (result.hint) print('warn', 'Hint: ' + result.hint);
    }
    return result;
  }

  /* -- chrome ----------------------------------------------------- */

  function updateXp(value) {
    if (!xpLabel) return;
    xpLabel.textContent = `${value} XP`;
    drawAiPixelText(xpLabel);
  }

  function renderRail() {
    if (!rail) return;
    rail.textContent = '';
    for (const group of aiChapters(state.exercises)) {
      const item = document.createElement('li');
      item.className = 'lab-rail-group';
      const heading = document.createElement('p');
      heading.className = 'lab-rail-chapter';
      heading.textContent = group.chapter;
      item.append(heading);
      const list = document.createElement('ol');
      list.className = 'lab-rail-items';
      for (const exercise of group.exercises) {
        const row = document.createElement('li');
        const link = document.createElement('a');
        link.href = './ai-lab.html?exercise=' + encodeURIComponent(exercise.id);
        link.dataset.aiRailItem = exercise.id;
        link.className = 'lab-rail-link';
        const mark = document.createElement('span');
        mark.className = 'lab-rail-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = '•';
        const label = document.createElement('span');
        label.className = 'lab-rail-label';
        label.textContent = exercise.title;
        link.append(mark, label);
        row.append(link);
        list.append(row);
      }
      item.append(list);
      rail.append(item);
    }
  }

  function updateRail() {
    if (!rail) return;
    for (const link of rail.querySelectorAll('[data-ai-rail-item]')) {
      const id = link.dataset.aiRailItem;
      link.dataset.state = state.solved.has(id) ? 'solved' : 'open';
      const mark = link.querySelector('.lab-rail-mark');
      if (mark) mark.textContent = state.solved.has(id) ? '✔' : '•';
      const label = link.querySelector('.lab-rail-label');
      if (label) label.setAttribute('aria-current', id === state.exercise?.id ? 'true' : 'false');
    }
  }

  function updateCounter() {
    const list = state.exercises;
    const index = list.findIndex(exercise => exercise.id === state.exercise?.id);
    const position = index < 0 ? 0 : index + 1;
    if (counter) {
      counter.textContent = `Exercise ${position} / ${list.length}`;
      drawAiPixelText(counter);
    }
    if (progressBar) {
      const solved = list.filter(exercise => state.solved.has(exercise.id)).length;
      progressBar.max = list.length;
      progressBar.value = solved;
      progressBar.setAttribute('aria-valuetext', `${solved} of ${list.length} exercises solved`);
    }
    if (chapter && state.exercise) {
      chapter.textContent = state.exercise.chapter;
      drawAiPixelText(chapter);
    }
    if (prevButton) prevButton.hidden = !neighbourAiExercise(list, state.exercise?.id, 'prev');
    if (nextButton) nextButton.hidden = !neighbourAiExercise(list, state.exercise?.id, 'next');
    if (doneButton) doneButton.hidden = !state.solved.has(state.exercise?.id);
  }

  function loadExercise(id) {
    const next = findAiExercise(state.exercises, id);
    if (!next) return null;
    state.exercise = next;
    state.buffers = { python: next.starter?.python || '', design: next.starter?.design || '' };
    if (editor) editor.value = aiStarterText(next);
    if (title) { title.textContent = next.title; drawAiPixelText(title); }
    if (brief) brief.textContent = next.brief;
    if (hint) hint.textContent = aiEditorHint(next);
    if (kindBadge) { kindBadge.textContent = aiKindLabel(next); drawAiPixelText(kindBadge); }
    if (expected) {
      const text = next.kind === 'python' ? aiExpectedText(next) : '';
      expected.textContent = text;
      expected.hidden = !text;
    }
    if (status) { status.textContent = ''; status.removeAttribute('data-state'); }
    if (editor) editor.setAttribute('aria-label', next.kind === 'design' ? 'Design answer' : 'Python editor');
    clearConsole();
    updateRail();
    updateCounter();
    return next;
  }

  /* -- events ----------------------------------------------------- */

  editor?.addEventListener('input', event => {
    const value = event.target?.value ?? '';
    if (state.exercise?.kind === 'design') state.buffers.design = value;
    else state.buffers.python = value;
  });
  runButton?.addEventListener('click', run);
  checkButton?.addEventListener('click', check);
  resetButton?.addEventListener('click', () => {
    if (!state.exercise) return;
    state.buffers = { python: state.exercise.starter?.python || '', design: state.exercise.starter?.design || '' };
    if (editor) editor.value = aiStarterText(state.exercise);
    if (status) { status.textContent = ''; status.removeAttribute('data-state'); }
    clearConsole();
    print('info', 'Reset to the starting code.');
  });

  const goTo = id => {
    if (!id) return;
    if (loadExercise(id)) {
      history.replaceState(null, '', '?exercise=' + encodeURIComponent(id));
    }
  };

  prevButton?.addEventListener('click', () => goTo(neighbourAiExercise(state.exercises, state.exercise?.id, 'prev')?.id));
  nextButton?.addEventListener('click', () => goTo(neighbourAiExercise(state.exercises, state.exercise?.id, 'next')?.id));
  doneButton?.addEventListener('click', () => goTo(neighbourAiExercise(state.exercises, state.exercise?.id, 'next')?.id));

  /* -- boot ------------------------------------------------------- */

  const saved = readAiProgress();
  state.solved = new Set(saved.solved);
  updateXp(saved.xp);

  /**
   * Load the course and open the first exercise.
   *
   * When the course file cannot be read the page says so instead of
   * showing an empty workbench.
   */
  async function importCourse() {
    const course = await loadAiCourse();
    state.exercises = course.exercises;
    if (credit) credit.textContent = course.source ? `Exercises: ${course.source}` : '';
    if (empty) empty.hidden = state.exercises.length > 0;
    renderRail();
    const first = state.exercises[0] || null;
    if (first) loadExercise(first.id);
    updateCounter();
    return state.exercises.length;
  }

  return {
    state,
    run,
    check,
    loadExercise,
    print,
    clearConsole,
    renderRail,
    updateCounter,
    importCourse
  };
}
