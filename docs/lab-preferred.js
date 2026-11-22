/**
 * Preferred labs.
 *
 * A learner can star an exercise they want to come back to. The stars are
 * kept on the device, in localStorage, so they survive a reload and work
 * offline.
 *
 * Each lab has its own key, because the Code Lab and the AI Lab use the
 * same exercise ids for different things. Sharing one key would let a
 * starred Python exercise light up a matching HTML one.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The key the Code Lab keeps its stars under. */
export const CODE_LAB_PREFERRED_KEY = 'imon-lab-preferred-v1';

/** The key the AI Lab keeps its stars under. */
export const AI_LAB_PREFERRED_KEY = 'imon-ai-lab-preferred-v1';

/**
 * Read the starred exercise ids.
 *
 * A missing, empty or corrupt entry gives an empty set rather than an
 * error, so a bad value can never take the lab down with it.
 */
export function loadPreferred(storage = globalThis.localStorage, key = CODE_LAB_PREFERRED_KEY) {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(id => typeof id === 'string' && id));
  } catch {
    return new Set();
  }
}

/**
 * Write the starred exercise ids back.
 *
 * Returns whether the write worked, so the caller can tell the reader that
 * the star did not stick rather than pretending it did.
 */
export function savePreferred(set, storage = globalThis.localStorage, key = CODE_LAB_PREFERRED_KEY) {
  try {
    storage?.setItem?.(key, JSON.stringify([...set]));
    return true;
  } catch {
    return false;
  }
}

/**
 * Star an exercise, or unstar it if it is already starred.
 *
 * The set is returned rather than changed in place, so the caller can
 * store the result and redraw from it.
 */
export function togglePreferred(set, id) {
  const next = new Set(set || []);
  if (!id) return next;
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * The starred exercises, in the order the course lists them.
 *
 * The order matters: a filtered list that reshuffled would be confusing to
 * work through.
 */
export function filterPreferred(exercises, set) {
  const starred = set || new Set();
  return (exercises || []).filter(exercise => starred.has(exercise?.id));
}

/**
 * The chapters that still hold a starred exercise.
 *
 * A chapter with nothing starred in it is dropped, so the filtered rail
 * does not show empty headings.
 */
export function preferredChapters(exercises, set) {
  const starred = new Set();
  for (const exercise of filterPreferred(exercises, set)) starred.add(exercise.chapter);
  return [...starred];
}

/**
 * A short label for the star button.
 *
 * The button says what it will do, so a screen reader announces the
 * action rather than just the symbol.
 */
export function preferredLabel(isPreferred, title) {
  const name = title ? ` ${title}` : '';
  return isPreferred ? `Remove${name} from preferred` : `Add${name} to preferred`;
}
