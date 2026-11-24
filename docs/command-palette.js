/**
 * Command palette search index and fuzzy matcher.
 *
 * Everything in this file is pure: no DOM, no window, no side effects. The
 * browser wiring lives in command-palette-ui.js, and this module can be
 * imported directly by `node --test`.
 *
 * The index is a static list of every destination on the site. Each entry has
 * a title, a short subtitle (the category it belongs to), and a target.
 * A target is either a hash on the home page, a local file, or an external
 * URL. The matcher scores each entry against the query and the results come
 * back sorted best-first.
 */

/** The kind of thing an entry points at. Used to group and to pick an icon. */
export const TARGET_KIND = {
  SECTION: 'section',
  PAGE: 'page',
  GAME: 'game',
  LINK: 'link'
};

/**
 * The static search index.
 *
 * `target` is a relative URL from the site root, so every path keeps working
 * under a subpath such as /docs/ on a local preview and at the domain root in
 * production. External entries carry an absolute URL and open in a new tab.
 */
export const SEARCH_INDEX = [
  // Home page sections -------------------------------------------------
  { id: 'home', title: 'Home', subtitle: 'Page · IMON.world', target: '#top', kind: TARGET_KIND.SECTION },
  { id: 'hero', title: 'Hero', subtitle: 'Section · Introduction', target: '#hero-title', kind: TARGET_KIND.SECTION },
  { id: 'learn', title: 'Learning labs', subtitle: 'Section · Courses and exercises', target: '#learn', kind: TARGET_KIND.SECTION },
  { id: 'circuits', title: 'Circuits & Signals', subtitle: 'Page · Electronics course and workbench', target: 'circuits.html', kind: TARGET_KIND.PAGE },
  { id: 'projects', title: 'Projects', subtitle: 'Section · Build log', target: '#projects', kind: TARGET_KIND.SECTION },
  { id: 'arcade', title: 'Arcade', subtitle: 'Section · Play games', target: '#arcade', kind: TARGET_KIND.SECTION },
  { id: 'news', title: 'Daily', subtitle: 'Section · News & headlines', target: '#news', kind: TARGET_KIND.SECTION },
  { id: 'map', title: 'Map', subtitle: 'Section · Every country, outlined', target: '#map', kind: TARGET_KIND.SECTION },
  { id: 'about', title: 'About', subtitle: 'Section · Meet the player', target: '#about', kind: TARGET_KIND.SECTION },

  // Standalone pages ----------------------------------------------------
  { id: 'lab', title: 'Code Lab', subtitle: 'Page · Lessons & curriculum', target: 'lab.html', kind: TARGET_KIND.PAGE },
  { id: 'ai-lab', title: 'AI Lab', subtitle: 'Page · Local AI courses', target: 'ai-lab.html', kind: TARGET_KIND.PAGE },
  { id: 'signal-runner', title: 'Signal Runner', subtitle: 'Game · Side-scrolling action', target: 'arcade/?game=runner', kind: TARGET_KIND.PAGE },
  { id: 'prism-breaker', title: 'Prism Breaker', subtitle: 'Game · Brick breaker', target: 'arcade/?game=breaker', kind: TARGET_KIND.PAGE },
  { id: 'star-patrol', title: 'Star Patrol', subtitle: 'Game · Space shooter', target: 'arcade/?game=space', kind: TARGET_KIND.PAGE },
  { id: 'gridworks', title: 'Gridworks', subtitle: 'Page · Infrastructure simulator', target: 'gridworks/', kind: TARGET_KIND.PAGE },
  { id: 'watch', title: 'Video player', subtitle: 'Page · IMON World', target: 'watch/', kind: TARGET_KIND.PAGE },
  { id: 'exam', title: 'Practical exams', subtitle: 'Page · IMON World', target: 'exams/', kind: TARGET_KIND.PAGE },
  { id: 'brain', title: 'Word and brain games', subtitle: 'Page · IMON World', target: 'arcade/puzzles/', kind: TARGET_KIND.PAGE },
  { id: 'book', title: 'Visitor field guide', subtitle: 'Page · IMON World', target: 'guide/', kind: TARGET_KIND.PAGE },
  { id: 'sounds', title: 'Field recordings', subtitle: 'Page · IMON World', target: 'sounds/', kind: TARGET_KIND.PAGE },
  { id: 'tools', title: 'Toolbox', subtitle: 'Page · Developer tools', target: 'tools/', kind: TARGET_KIND.PAGE },
  { id: 'login', title: 'Sign in', subtitle: 'Page · Account', target: 'login.html', kind: TARGET_KIND.PAGE },

  // Games ---------------------------------------------------------------
  { id: 'snake', title: 'Pixel Snake', subtitle: 'Game · Classic arcade', target: 'game:snake', kind: TARGET_KIND.GAME },
  { id: 'surf', title: 'Pixel Surf', subtitle: 'Game · Endless arcade', target: 'game:surf', kind: TARGET_KIND.GAME },
  { id: 'ludo', title: 'Pixel Ludo', subtitle: 'Game · Strategy board', target: 'game:ludo', kind: TARGET_KIND.GAME },
  { id: '2048', title: 'Pixel 2048', subtitle: 'Game · Merge puzzle', target: 'game:2048', kind: TARGET_KIND.GAME },
  { id: 'slots', title: 'Dev Slots', subtitle: 'Game · Lucky draw', target: 'game:slots', kind: TARGET_KIND.GAME },
  { id: 'racer', title: 'IMON Rally', subtitle: 'Game · Endless racing', target: 'game:racer', kind: TARGET_KIND.GAME },
  { id: 'quiz', title: 'Daily Tech Quiz', subtitle: 'Game · Trivia quest', target: 'game:quiz', kind: TARGET_KIND.GAME },

  // External links ------------------------------------------------------
  { id: 'github', title: 'GitHub', subtitle: 'Link · Code & repositories', target: 'https://github.com/sabbirimon', kind: TARGET_KIND.LINK },
  { id: 'linkedin', title: 'LinkedIn', subtitle: 'Link · Professional profile', target: 'https://www.linkedin.com/in/sabbirimon', kind: TARGET_KIND.LINK },
  { id: 'medium', title: 'Medium', subtitle: 'Link · Writing & articles', target: 'https://medium.com/@sabbirimon', kind: TARGET_KIND.LINK },
  { id: 'youtube', title: 'YouTube', subtitle: 'Link · Videos & streams', target: 'https://youtube.com/@sabbirimon', kind: TARGET_KIND.LINK },
  { id: 'facebook', title: 'Facebook', subtitle: 'Link · Social profile', target: 'https://www.facebook.com/mr.sabbirimon/', kind: TARGET_KIND.LINK }
];

/** Lowercases and trims a string for comparison. Non-strings become ''. */
export function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Splits a title into its word starts, so a match can be rewarded for
 * beginning on a word boundary ("pixel s" should prefer "Pixel Snake" over
 * "The Snake Collection").
 */
export function wordStarts(text) {
  const normalized = normalizeText(text);
  const starts = [];
  let previous = ' ';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character !== ' ' && previous === ' ') starts.push(index);
    previous = character;
  }
  return starts;
}

/**
 * Scores one entry against one query.
 *
 * The tiers, best first:
 *   1. exact match of the whole title
 *   2. prefix match of the title
 *   3. substring match of the title
 *   4. prefix match of the subtitle
 *   5. substring match of the subtitle
 *
 * The tier decides the band, so a title match always beats a subtitle match.
 * Inside a tier the score rises when the match begins on a word boundary and
 * falls as the match starts later in the text, so the tightest match floats to
 * the top.
 *
 * Returns 0 when the entry does not match at all.
 */
export function scoreEntry(entry, query) {
  if (!entry || typeof entry !== 'object') return 0;
  const needle = normalizeText(query);
  if (!needle) return 0;

  const title = normalizeText(entry.title);
  const subtitle = normalizeText(entry.subtitle);
  if (!title) return 0;

  const titleStarts = wordStarts(entry.title);
  const subtitleStarts = wordStarts(entry.subtitle);

  // How good the match is inside its tier: a word boundary is worth 40
  // points, and every character of distance before the match costs one.
  const quality = (starts, index) => (starts.includes(index) ? 40 : 0) - Math.min(30, index);

  // Tier 1: the query is the entire title.
  if (title === needle) return 1000 + 40;
  // Tier 2: the title starts with the query.
  if (title.startsWith(needle)) return 800 + quality(titleStarts, 0);
  // Tier 3: the query appears somewhere in the title.
  const titleIndex = title.indexOf(needle);
  if (titleIndex !== -1) return 600 + quality(titleStarts, titleIndex);
  // Tier 4: the subtitle starts with the query.
  if (subtitle.startsWith(needle)) return 400 + quality(subtitleStarts, 0);
  // Tier 5: the query appears somewhere in the subtitle.
  const subtitleIndex = subtitle.indexOf(needle);
  if (subtitleIndex !== -1) return 200 + quality(subtitleStarts, subtitleIndex);
  return 0;
}

/**
 * Scores a list of entries and returns the matches sorted best-first.
 *
 * The sort is stable on the original order, so two entries with the same
 * score keep the order they were written in the index.
 */
export function rankEntries(entries, query) {
  if (!Array.isArray(entries)) return [];
  const needle = normalizeText(query);
  if (!needle) return [];
  const scored = [];
  entries.forEach((entry, index) => {
    const score = scoreEntry(entry, needle);
    if (score > 0) scored.push({ entry, score, index });
  });
  scored.sort((left, right) => (right.score - left.score) || (left.index - right.index));
  return scored.map(item => item.entry);
}

/**
 * The palette's search: rank the whole index for a query.
 * An empty query returns an empty list — the palette shows a hint instead.
 */
export function search(query, entries = SEARCH_INDEX) {
  return rankEntries(entries, query);
}

/** True when a target opens a game inside the arcade modal. */
export function isGameTarget(target) {
  return typeof target === 'string' && target.startsWith('game:');
}

/** The game key of a "game:snake" target, or null. */
export function gameKey(target) {
  return isGameTarget(target) ? target.slice('game:'.length) : null;
}

/** True when a target points at another website. */
export function isExternalTarget(target) {
  return typeof target === 'string' && /^https?:\/\//i.test(target);
}

/** True when a target is a section on the current page. */
export function isSectionTarget(target) {
  return typeof target === 'string' && target.startsWith('#');
}

/** The plain-text label of a target, used for the accessible name of a row. */
export function targetLabel(entry) {
  if (!entry) return '';
  if (isGameTarget(entry.target)) return `Play ${entry.title}`;
  if (isSectionTarget(entry.target)) return `Go to ${entry.title}`;
  if (isExternalTarget(entry.target)) return `Open ${entry.title} in a new tab`;
  return `Open ${entry.title}`;
}

/**
 * Moves a selection index inside a list of the given length.
 * Wraps around at both ends, which is what a command palette should do.
 */
export function moveSelection(current, delta, length) {
  if (!Number.isFinite(length) || length <= 0) return -1;
  if (!Number.isFinite(current) || current < 0) return delta > 0 ? 0 : length - 1;
  const next = current + delta;
  if (next < 0) return length - 1;
  if (next >= length) return 0;
  return next;
}

/** Clamps a selection index to a valid position in a list. */
export function clampSelection(index, length) {
  if (!Number.isFinite(length) || length <= 0) return -1;
  if (!Number.isFinite(index)) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}
