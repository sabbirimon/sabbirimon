/**
 * The terminal panel, styled the way Codédex styles it.
 *
 * Codédex draws its output as a real terminal: a dark slab, a bar across
 * the top, and the values the learner logged, each coloured by what it
 * is. A string is green, a number is yellow, a boolean is blue and
 * nothing at all is grey. That colouring is the point: a learner can see
 * at a glance that `console.log("3")` printed text while
 * `console.log(3)` printed a number, and the two are not the same thing.
 *
 * This module owns the parts of that panel the lab does not already
 * have: the typed value formatting, the empty state that says the panel
 * is waiting for a run, and the red rim that marks a failed check.
 */

/**
 * The colours a value is drawn in.
 *
 * They are the ones a terminal uses: the same idea as the syntax
 * highlighting in the editor, so a value in the output looks like the
 * value in the code that produced it.
 */
export const VALUE_COLOURS = {
  text: '#4ade80',
  number: '#fbbf24',
  boolean: '#60a5fa',
  empty: '#94a3b8',
  plain: '#e0e0f1'
};

/**
 * The prefix that marks each kind of value in the output.
 *
 * The prefix is what makes the type readable even where the colour is
 * not, so the panel still works in a browser that cannot show the
 * colour at all.
 */
export const VALUE_MARKS = {
  text: '"',
  number: '',
  boolean: '',
  empty: ''
};

/**
 * Work out what a logged value is.
 *
 * The value arrives from the sandbox as a string, because that is the
 * only thing that survives `postMessage`. The sandbox sends a hint
 * beside it, and this reads that hint. Without a hint the value is
 * treated as plain text, which is the safe answer.
 */
export function valueKind(value, hint) {
  if (hint === 'text') return 'text';
  if (hint === 'number') return 'number';
  if (hint === 'boolean') return 'boolean';
  if (hint === 'empty') return 'empty';
  const text = String(value ?? '');
  if (text === 'undefined' || text === 'null') return 'empty';
  return 'plain';
}

/**
 * Split a logged value into the parts that are drawn in different
 * colours.
 *
 * A plain string is one run. A value that was JSON — an object or an
 * array — is broken into its lines so that the keys inside it can be
 * drawn in the colour of a name and the values beside them in the
 * colour of what they hold.
 */
export function formatValue(value, hint) {
  const kind = valueKind(value, hint);
  const text = String(value ?? '');
  if (kind === 'plain') return [{ text, colour: VALUE_COLOURS.plain }];
  if (kind === 'text') return [{ text: VALUE_MARKS.text + text + VALUE_MARKS.text, colour: VALUE_COLOURS.text }];
  if (kind === 'number') return [{ text, colour: VALUE_COLOURS.number }];
  if (kind === 'boolean') return [{ text, colour: VALUE_COLOURS.boolean }];
  return [{ text, colour: VALUE_COLOURS.empty }];
}

/**
 * Colour the parts of a JSON value.
 *
 * The keys of an object are names, so they are drawn in the colour of a
 * name. The values beside them are drawn in the colour of what they
 * hold. This is what makes `console.log({ score: 42 })` readable at a
 * glance: the score is a number and you can see it.
 */
export function formatJson(text) {
  const runs = [];
  const pattern = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b|\bundefined\b)/g;
  let index = 0;
  let found;
  while ((found = pattern.exec(text)) !== null) {
    if (found.index > index) runs.push({ text: text.slice(index, found.index), colour: VALUE_COLOURS.plain });
    if (found[1]) runs.push({ text: found[1], colour: VALUE_COLOURS.text });
    else if (found[2]) runs.push({ text: found[2], colour: VALUE_COLOURS.text });
    else if (found[3]) runs.push({ text: found[3], colour: VALUE_COLOURS.number });
    else if (found[4]) runs.push({ text: found[4], colour: VALUE_COLOURS.boolean });
    else runs.push({ text: found[5], colour: VALUE_COLOURS.empty });
    index = found.index + found[0].length;
  }
  if (index < text.length) runs.push({ text: text.slice(index), colour: VALUE_COLOURS.plain });
  return runs.length ? runs : [{ text, colour: VALUE_COLOURS.plain }];
}

/**
 * The parts one console line is drawn as.
 *
 * A line is its prefix, then the value. When the value is a JSON
 * object or an array it is coloured part by part, so the keys and the
 * values inside it can be told apart.
 */
export function formatLine(entry) {
  const level = entry?.level || 'log';
  const args = Array.isArray(entry?.args) ? entry.args : [];
  const hints = Array.isArray(entry?.hints) ? entry.hints : [];
  const prefix = level === 'error' ? '✖' : level === 'warn' ? '▲' : level === 'info' ? 'ℹ' : '›';
  const runs = [];
  args.forEach((value, index) => {
    const hint = hints[index];
    const kind = valueKind(value, hint);
    if (kind === 'plain' && /^\s*[[{]/.test(String(value ?? ''))) {
      for (const run of formatJson(String(value))) runs.push(run);
      return;
    }
    for (const run of formatValue(value, hint)) runs.push(run);
  });
  return { level, prefix, runs, text: args.join(' ') };
}

/**
 * Draw the terminal panel's empty state.
 *
 * Codédex shows a message in the middle of the terminal until the
 * learner runs something. The same is done here: the panel says what
 * it is waiting for rather than showing an empty box.
 */
export function initTerminalPanel(root = document) {
  const terminal = root?.querySelector?.('[data-lab-terminal]');
  if (!terminal) return null;
  const overlay = terminal.querySelector('[data-lab-terminal-empty]');
  const list = terminal.querySelector('[data-lab-console]');
  const state = { terminal, overlay, list, empty: true };
  const showEmpty = empty => {
    state.empty = empty;
    if (!overlay) return;
    overlay.hidden = !empty;
  };
  showEmpty(true);
  state.showEmpty = showEmpty;
  state.setState = name => {
    terminal.dataset.labTerminalState = name;
  };
  return state;
}
