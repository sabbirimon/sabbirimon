/**
 * The imported Codédex curriculum.
 *
 * The `html-101` and `css-101` courses are MIT licensed, so their exercise
 * briefs and starters ship with the site. `docs/data/lab-curriculum.json`
 * holds them; this module turns each entry into a runnable lab exercise
 * with a real checker.
 *
 * The checkers are deliberately simple and mechanical: they look for the
 * elements or properties the exercise is about. That is enough to catch a
 * blank editor and to give a specific hint when something is missing,
 * without pretending to grade design work.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** Where the imported curriculum lives. */
export const CURRICULUM_URL = './data/lab-curriculum.json';

/** The key used to remember which imported courses have been loaded. */
export const CURRICULUM_KEY = 'imon-lab-curriculum-v1';

/**
 * Does the text contain the tag?
 *
 * Self-closing and void tags are matched too, so `<img>` counts even
 * though it has no closing tag. Text inside a comment is ignored, so a
 * placeholder like `<!-- write your <h1> here -->` does not count as a
 * heading.
 */
export function hasTag(text, tag) {
  if (!text || !tag) return false;
  const name = String(tag).replace(/[^a-z0-9]/gi, '');
  if (!name) return false;
  return countTag(text, tag) > 0;
}

/**
 * How many times does the tag appear outside a comment?
 */
export function countTag(text, tag) {
  if (!text || !tag) return 0;
  const name = String(tag).replace(/[^a-z0-9]/gi, '');
  if (!name) return 0;
  const stripped = String(text).replace(/<!--[\s\S]*?-->/g, '');
  const matches = stripped.match(new RegExp('<' + name + '\\b', 'gi'));
  return matches ? matches.length : 0;
}

/**
 * Does the stylesheet use the property?
 *
 * The check looks for `property:` anywhere, so a shorthand is accepted
 * when it covers the property — `margin` covers `margin-top`, and
 * `padding` covers `padding-left`.
 */
export function hasProperty(css, property) {
  if (!css || !property) return false;
  const name = String(property).trim().toLowerCase();
  if (!name) return false;
  // The property written exactly: `margin:` or `margin-top:`.
  if (new RegExp('(^|[^-\\w])' + name + '\\s*:', 'i').test(css)) return true;
  // A longer property that starts with the wanted one also sets it:
  // `margin-top: 4px` sets the margin.
  if (new RegExp('(^|[^-\\w])' + name + '-[a-z]+\\s*:', 'i').test(css)) return true;
  // A shorthand that covers the wanted property: `margin: 0` sets
  // `margin-top`.
  if (name.includes('-')) {
    const shorthand = name.split('-')[0];
    if (new RegExp('(^|[^-\\w])' + shorthand + '\\s*:', 'i').test(css)) return true;
  }
  return false;
}

/**
 * Does the stylesheet use the selector?
 *
 * A selector can be a tag, an id, a class or a compound like `#post-list > li`.
 * The check is a plain text test on the selector side of the rule.
 */
export function hasSelector(css, selector) {
  if (!css || !selector) return false;
  const needle = String(selector).trim().toLowerCase();
  if (!needle) return false;
  if (needle.startsWith('#')) return new RegExp('#' + needle.slice(1) + '\\b', 'i').test(css);
  if (needle.startsWith('.')) return new RegExp('\\.' + needle.slice(1) + '\\b', 'i').test(css);
  return new RegExp('(^|[^\\w-])' + needle + '\\b', 'i').test(css);
}

/**
 * Build the checker for one imported exercise.
 *
 * The result is a pure function of the editor buffers, exactly like the
 * hand-written exercises in `lab.js`.
 */
export function makeChecker(entry) {
  const requirements = Array.isArray(entry?.requirements) ? entry.requirements : [];
  const forbidden = Array.isArray(entry?.forbidden) ? entry.forbidden : [];
  const language = entry?.language || 'html';

  if (entry?.freeform) {
    return ({ html = '', css = '', js = '' } = {}) => {
      const size = html.trim().length + css.trim().length + js.trim().length;
      if (size < 40) {
        return {
          ok: false,
          message: 'This one is yours to design. There is no wrong answer, but the page is still empty.',
          hint: 'Look at the preview, then change the markup until it looks the way you want.'
        };
      }
      return { ok: true, message: 'That is your design. Freeform exercises are graded on your own taste.' };
    };
  }

  return ({ html = '', css = '', js = '' } = {}) => {
    const source = language === 'css' ? css : language === 'js' ? js : html;
    if (!source.trim()) {
      return { ok: false, message: `The ${language} editor is empty.`, hint: 'Write some code and run it to see what happens.' };
    }

    for (const bad of forbidden) {
      if (language === 'html') {
        if (hasTag(source, bad)) {
          return { ok: false, message: `The <${bad}> element should not be here.`, hint: `Remove the <${bad}> element.` };
        }
      } else if (new RegExp('(^|[^\\w.])' + bad + '\\s*\\(', 'i').test(source)) {
        return { ok: false, message: `Do not use ${bad}(). It runs code you have not written.`, hint: `Use an explicit operation instead of ${bad}().` };
      }
    }

    const missing = [];
    for (const requirement of requirements) {
      let found;
      if (language === 'css') {
        // A bare word is a property; anything with a dot or hash is a
        // selector.
        found = /^[.#]/.test(requirement) || /[ >+~]/.test(requirement)
          ? hasSelector(css, requirement)
          : hasProperty(css, requirement);
      } else if (language === 'js') {
        // Comments are stripped first, so the hint in the starter code
        // never counts as the answer.
        const code = String(source).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        const escaped = requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        found = new RegExp('(^|[^\\w.$])' + escaped + '(?![\\w$])', 'i').test(code);
      } else {
        found = hasTag(source, requirement);
      }
      if (!found) missing.push(requirement);
    }

    if (missing.length) {
      const list = missing.map(item => (language === 'html' ? `<${item}>` : item)).join(', ');
      const plural = missing.length > 1 ? 'are' : 'is';
      const hint = language === 'html'
        ? `Add a <${missing[0]}> element to the page.`
        : language === 'js'
          ? `Your code needs to use ${missing[0]}.`
          : `Add ${missing[0]} to the stylesheet.`;
      return { ok: false, message: `What is still missing: ${list}. ${plural} not there yet.`, hint };
    }

    return { ok: true, message: `Nice work — ${requirements.join(', ')} ${requirements.length > 1 ? 'are' : 'is'} in place.` };
  };
}

/**
 * Turn one raw curriculum entry into a lab exercise.
 *
 * Returns null for an entry that is missing the fields the lab needs, so
 * one bad row can never break the page.
 */
export function toExercise(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.id !== 'string' || !entry.id) return null;
  if (typeof entry.title !== 'string' || !entry.title) return null;
  const starter = entry.starter && typeof entry.starter === 'object' ? entry.starter : {};
  return {
    id: entry.id,
    language: entry.language === 'css' || entry.language === 'js' ? entry.language : 'html',
    title: entry.title,
    chapter: typeof entry.chapter === 'string' && entry.chapter ? entry.chapter : 'Imported',
    xp: Number.isFinite(entry.xp) && entry.xp > 0 ? Math.floor(entry.xp) : 20,
    brief: typeof entry.brief === 'string' && entry.brief ? entry.brief : 'Complete the exercise.',
    starter: {
      html: typeof starter.html === 'string' ? starter.html : '',
      css: typeof starter.css === 'string' ? starter.css : '',
      js: typeof starter.js === 'string' ? starter.js : ''
    },
    check: makeChecker(entry),
    origin: typeof entry.origin === 'string' ? entry.origin : '',
    source: typeof entry.source === 'string' ? entry.source : ''
  };
}

/**
 * Turn the whole curriculum payload into exercises.
 *
 * Entries that cannot be converted are skipped, so the count that comes
 * back may be smaller than the count that went in.
 */
export function toExercises(payload) {
  const list = Array.isArray(payload?.exercises) ? payload.exercises : [];
  const out = [];
  for (const entry of list) {
    const exercise = toExercise(entry);
    if (exercise) out.push(exercise);
  }
  return out;
}

/**
 * Load the curriculum.
 *
 * Returns `{ exercises, source, license }`. When the file cannot be read
 * the exercises are empty, so the lab keeps its own built-in course and
 * the caller never has to special-case a failure.
 */
export async function loadCurriculum(fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(CURRICULUM_URL, { cache: 'no-cache' });
    if (!response?.ok) return { exercises: [], source: '', license: '' };
    const payload = await response.json();
    return {
      exercises: toExercises(payload),
      source: typeof payload?.source === 'string' ? payload.source : '',
      license: typeof payload?.license === 'string' ? payload.license : ''
    };
  } catch {
    return { exercises: [], source: '', license: '' };
  }
}
