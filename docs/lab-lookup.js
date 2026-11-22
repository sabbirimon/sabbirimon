/**
 * The documentation lookup for the lab.
 *
 * When a learner meets a tag or a property they have not seen before, they
 * should not have to leave the page. This module asks a free, keyless
 * service — the Stack Exchange API — what the community has to say about
 * whatever is selected, and shows the answers in a panel beside the editor.
 *
 * The service is:
 *   https://api.stackexchange.com/2.3/search/advanced?…   (free, no key)
 * It sends `Access-Control-Allow-Origin: *`, so the browser can call it
 * straight from a static page with no server in between. The request
 * carries nothing but the search words.
 *
 * MDN's own search API was the first choice, but it sends no CORS header,
 * so a browser on a static host cannot call it at all. The Stack Exchange
 * API does, and it answers the same question a learner is asking: how do
 * people actually use this thing?
 *
 * If the service cannot be reached the panel says so and the built-in
 * notes are still shown, so the lab never depends on the network.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The free, keyless search service. */
export const STACK_SEARCH = 'https://api.stackexchange.com/2.3/search/advanced';

/** The site the questions are asked on. */
export const STACK_SITE = 'stackoverflow';

/** How long a lookup waits before it is called a failure. */
export const LOOKUP_TIMEOUT_MS = 6000;

/** How many results one lookup asks for. */
export const LOOKUP_LIMIT = 5;

/**
 * The concepts that are named in the notes but are not an API name.
 *
 * A learner who meets the note on "variable" is really asking how to
 * declare one, so the search looks for the keyword that does it. The
 * same goes for the other ideas: the notes teach the concept, and the
 * search goes after the thing that carries it.
 */
export const CONCEPT_SEARCHES = {
  variable: 'const let var javascript declare',
  function: 'javascript function declaration',
  loop: 'javascript for loop',
  condition: 'javascript if else condition',
  array: 'javascript array',
  object: 'javascript object literal',
  string: 'javascript string template literal',
  number: 'javascript number type',
  boolean: 'javascript boolean',
  return: 'javascript return statement',
  event: 'javascript addEventListener event',
  dom: 'javascript document DOM',
  'console.log': 'javascript console.log output'
};

/**
 * The words that make a good search for a tag or a property.
 *
 * A bare "p" finds a question about the letter p, so the language and the
 * kind of thing are added to every lookup. An HTML tag is written in
 * angle brackets, because that is how people write about it: "<p> tag
 * html" finds the questions about the paragraph element. A property or a
 * method is written plainly: "padding CSS property" and "querySelector
 * JavaScript method".
 */
export function buildQuery(term, language) {
  const word = String(term || '').trim().toLowerCase();
  if (!word) return '';
  const hints = {
    html: 'tag html',
    css: 'css property',
    js: 'javascript method'
  };
  const hint = hints[language] || 'web';
  // A concept is searched for by the thing that carries it.
  if (CONCEPT_SEARCHES[word]) return CONCEPT_SEARCHES[word];
  // A tag already written with its brackets is left as it is.
  if (word.startsWith('<') && word.endsWith('>')) return `${word} ${hint}`;
  if (language === 'html') return `<${word}> ${hint}`;
  return `${word} ${hint}`;
}

/**
 * The answers in one result set.
 *
 * The service answers with several kinds of result, but only the
 * questions are of use here, so the rest is dropped. A question with no
 * title or no link is skipped, because a link is the whole point.
 */
export function pickDocs(payload, limit = LOOKUP_LIMIT) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const out = [];
  for (const entry of items) {
    const title = entry?.title;
    const link = entry?.link;
    if (!title || !link) continue;
    out.push({
      title: String(title).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      url: String(link),
      summary: describeItem(entry),
      score: Number.isFinite(entry?.score) ? entry.score : 0,
      answers: Number.isFinite(entry?.answer_count) ? entry.answer_count : 0,
      tags: Array.isArray(entry?.tags) ? entry.tags.map(tag => String(tag)) : []
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The one-line summary shown under a result title.
 *
 * The service returns the question body as HTML when it is asked to, but
 * the body is often long and full of markup, so only the tags and the
 * answer count are used here — enough to tell the learner what they are
 * about to open.
 */
export function describeItem(entry) {
  const answers = Number.isFinite(entry?.answer_count) ? entry.answer_count : 0;
  const score = Number.isFinite(entry?.score) ? entry.score : 0;
  const tags = Array.isArray(entry?.tags) ? entry.tags.filter(tag => tag && tag !== 'javascript' && tag !== 'html' && tag !== 'css') : [];
  const parts = [];
  if (answers) parts.push(`${answers} answer${answers === 1 ? '' : 's'}`);
  if (score > 0) parts.push(`upvoted ${score}`);
  if (tags.length) parts.push(tags.slice(0, 3).map(tag => `#${tag}`).join(' '));
  return parts.join(' · ');
}

/**
 * The text shown when the lookup fails.
 */
export function lookupFailureText(reason) {
  if (reason === 'offline') return 'No connection. The notes beside the editor still have everything you need.';
  if (reason === 'timeout') return 'The search service took too long. Try again in a moment.';
  if (reason === 'quota') return 'The search service has run out of requests for today. Try again tomorrow.';
  return 'The search service did not answer. The notes beside the editor still have everything you need.';
}

/**
 * Ask the search service about one term.
 *
 * Returns the questions it found, or an object with an `error` when the
 * service cannot be reached. It never throws, so the lab keeps working.
 */
export async function lookupDocs(term, language, options = {}) {
  const query = buildQuery(term, language);
  if (!query) return { ok: false, error: 'empty', pages: [] };
  const endpoint = options.endpoint || STACK_SEARCH;
  const limit = options.limit || LOOKUP_LIMIT;
  const timeout = options.timeout || LOOKUP_TIMEOUT_MS;
  // An explicit `fetch: null` means the caller wants no network at all, so
  // the global is not used as a fallback in that case.
  const fetchImpl = options.fetch === undefined ? globalThis.fetch : options.fetch;
  if (typeof fetchImpl !== 'function') return { ok: false, error: 'offline', pages: [] };

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? globalThis.setTimeout(() => controller.abort(), timeout) : null;
  try {
    const url = `${endpoint}?site=${STACK_SITE}&q=${encodeURIComponent(query)}&pagesize=${limit}&order=desc&sort=relevance`;
    const response = await fetchImpl(url, { signal: controller?.signal });
    if (!response.ok) return { ok: false, error: 'http', pages: [] };
    const payload = await response.json();
    // The service reports its own daily allowance. When it is spent the
    // request still succeeds but carries no questions, so that is named
    // as its own reason rather than as an empty result.
    if (Number.isFinite(payload?.quota_remaining) && payload.quota_remaining <= 0) {
      return { ok: false, error: 'quota', pages: [] };
    }
    const pages = pickDocs(payload, limit);
    // A search that found nothing is not a failure, but there is nothing
    // to show either, so the caller is told.
    if (!pages.length) return { ok: false, error: 'empty', pages: [] };
    return { ok: true, pages, query };
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return { ok: false, error: aborted ? 'timeout' : 'offline', pages: [] };
  } finally {
    if (timer) globalThis.clearTimeout(timer);
  }
}

/**
 * The documentation panel under the editor.
 *
 * The panel shows the questions the service found for whatever term the
 * learner picked, and it lists them as plain links so they can be opened
 * in a new tab.
 */
export function initLabLookup(root = document) {
  const panel = root.querySelector?.('[data-lab-lookup]');
  const list = root.querySelector?.('[data-lab-lookup-list]');
  const status = root.querySelector?.('[data-lab-lookup-status]');
  if (!panel) return null;

  function hide() {
    panel.hidden = true;
    if (list) list.textContent = '';
    if (status) status.textContent = '';
  }

  function show(pages, query) {
    panel.hidden = false;
    if (status) status.textContent = query ? `Searched for “${query}”` : 'Search results';
    if (!list) return;
    list.textContent = '';
    for (const page of pages) {
      const item = document.createElement('li');
      item.className = 'lab-lookup-item';
      const link = document.createElement('a');
      link.href = page.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'lab-lookup-link';
      link.textContent = page.title;
      item.append(link);
      if (page.summary) {
        const summary = document.createElement('p');
        summary.className = 'lab-lookup-summary';
        summary.textContent = page.summary;
        item.append(summary);
      }
      list.append(item);
    }
  }

  function showError(reason) {
    panel.hidden = false;
    if (status) status.textContent = 'Search results';
    if (list) list.textContent = '';
    const item = document.createElement('li');
    item.className = 'lab-lookup-item lab-lookup-error';
    const text = document.createElement('p');
    text.className = 'lab-lookup-summary';
    text.textContent = lookupFailureText(reason);
    item.append(text);
    list?.append(item);
  }

  /**
   * Look one term up and show the result.
   *
   * The panel is brought into view when the results arrive, because the
   * panel sits below the notes and the learner pressed a button on a note
   * card higher up the column.
   */
  async function lookup(term, language, options = {}) {
    const result = await lookupDocs(term, language, options);
    if (result.ok) show(result.pages, result.query);
    else showError(result.error);
    panel?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    return result;
  }

  return { show, hide, showError, lookup };
}
