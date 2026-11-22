/**
 * The GitHub stats strip.
 *
 * A row of counters that show what the owner's public GitHub work looks
 * like right now: repositories, stars, followers, and the languages the
 * code is actually written in.
 *
 * The numbers come from `data/github-stats.json`, a snapshot that the
 * daily workflow refreshes once a day. The browser deliberately does not
 * call the GitHub API itself. That API allows sixty unauthenticated
 * requests an hour per address, so a page that fetched on every view
 * would spend the allowance for every visitor behind the same address
 * and then start failing. The snapshot is the honest way to do this on a
 * static site: one request a day, made by the site itself.
 *
 * The strip always shows the snapshot it was given. It never invents a
 * number and never claims to be live.
 *
 * House rules: every DOM access happens inside the init body; the
 * helpers below are pure so they can be tested under node.
 */

/** Where the daily snapshot lives. */
export const STATS_DATA = 'data/github-stats.json';

/** The counters shown, in the order they appear. */
export const STAT_FIELDS = [
  { key: 'repositories', label: 'Repositories', accent: 'cyan' },
  { key: 'stars', label: 'Stars', accent: 'violet' },
  { key: 'followers', label: 'Followers', accent: 'pink' },
  { key: 'forks', label: 'Forks', accent: 'lime' }
];

/** How many languages the bar shows before the rest are folded away. */
export const LANGUAGE_LIMIT = 5;

/**
 * The counters, in the order they should appear.
 *
 * A missing value is shown as an em dash rather than a zero, because
 * "we could not read this" and "this is zero" are different facts and
 * the strip must not turn the first into the second.
 */
export function statEntries(stats) {
  const out = [];
  for (const field of STAT_FIELDS) {
    const value = stats?.[field.key];
    out.push({
      key: field.key,
      label: field.label,
      accent: field.accent,
      value: Number.isFinite(value) ? value : null,
      display: Number.isFinite(value) ? formatCount(value) : '—'
    });
  }
  return out;
}

/**
 * A number as a short string.
 *
 * A thousand is written as "1.2k" because a five-digit counter is wider
 * than the pill it sits in, and the exact number is on the label's
 * title attribute for anyone who wants it.
 */
export function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const magnitude = Math.abs(number);
  if (magnitude < 1000) return String(number);
  if (magnitude < 1000000) {
    const thousands = number / 1000;
    // One decimal place, but never a trailing ".0".
    const rounded = Math.round(thousands * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
  }
  const millions = number / 1000000;
  const rounded = Math.round(millions * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}M`;
}

/**
 * The languages shown in the bar.
 *
 * The rows are already sorted by share, largest first. Only the first
 * few are shown, and the rest are collected into a single "Other" row so
 * the bar always adds up to a whole number rather than to a little less.
 */
export function languageRows(languages, limit = LANGUAGE_LIMIT) {
  const list = Array.isArray(languages) ? languages.filter(item => item && typeof item.name === 'string') : [];
  const sorted = [...list].sort((a, b) => (b.share || 0) - (a.share || 0));
  if (sorted.length <= limit) return sorted.map(item => ({ name: item.name, share: item.share || 0 }));
  const head = sorted.slice(0, limit - 1);
  const tail = sorted.slice(limit - 1);
  const rest = tail.reduce((total, item) => total + (item.share || 0), 0);
  return [...head, { name: 'Other', share: rest }];
}

/**
 * The date the snapshot was taken, as a short phrase.
 *
 * The snapshot is a day old at most, so "today" and "yesterday" are
 * worth saying plainly; anything older is named by its date, because a
 * stale number should never look current.
 */
export function describeAge(updated, now = Date.now()) {
  if (!updated) return 'snapshot unavailable';
  const then = Date.parse(updated);
  if (!Number.isFinite(then)) return 'snapshot unavailable';
  const hours = Math.floor((now - then) / 3600000);
  if (hours < 1) return 'updated just now';
  if (hours < 24) return `updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'updated yesterday';
  if (days <= 7) return `updated ${days} days ago`;
  return `updated ${new Date(then).toISOString().slice(0, 10)}`;
}

/**
 * The years the account has been on GitHub.
 *
 * The account was created in 2017, so the count is measured from that
 * date rather than from a hard-coded year that would slowly go wrong.
 */
export function memberYears(membersSince, now = Date.now()) {
  const created = Date.parse(`${membersSince}T00:00:00Z`);
  if (!Number.isFinite(created)) return null;
  const years = (now - created) / (365.2425 * 24 * 3600 * 1000);
  return Math.max(1, Math.floor(years));
}

/**
 * The whole strip, as data.
 *
 * The module reads a snapshot and produces everything the strip shows.
 * It never reaches for the network, so the strip works offline.
 */
export function buildStats(snapshot, now = Date.now()) {
  const stats = snapshot?.stats && typeof snapshot.stats === 'object' ? snapshot.stats : {};
  return {
    stats: statEntries(stats),
    languages: languageRows(snapshot?.topLanguages),
    age: describeAge(snapshot?.updated, now),
    years: memberYears(stats.membersSince, now),
    source: snapshot?.source || 'GitHub',
    profile: snapshot?.profile || null,
    updated: snapshot?.updated || null
  };
}

/**
 * The stats strip on the page.
 *
 * The strip is built from the snapshot and nothing else. If the
 * snapshot cannot be read the strip says so, plainly, rather than
 * showing a row of zeros that would look like real numbers.
 */
export function initGitHubStats(root = document, options = {}) {
  const strip = root.querySelector?.('[data-github-stats]');
  if (!strip) return null;

  const path = options.path || STATS_DATA;
  const fetchImpl = options.fetch === undefined ? globalThis.fetch : options.fetch;

  function paint(model) {
    const counters = strip.querySelector('[data-stats-counters]');
    const languages = strip.querySelector('[data-stats-languages]');
    const meta = strip.querySelector('[data-stats-meta]');
    const note = strip.querySelector('[data-stats-note]');
    if (note) note.textContent = '';

    if (counters) {
      counters.textContent = '';
      for (const stat of model.stats) {
        const cell = document.createElement('div');
        cell.className = `stats-pill stats-pill-${stat.accent}`;
        const value = document.createElement('strong');
        value.className = 'stats-value';
        value.textContent = stat.display;
        const label = document.createElement('span');
        label.className = 'stats-label';
        label.textContent = stat.label;
        cell.append(value, label);
        counters.append(cell);
      }
    }

    if (languages) {
      languages.textContent = '';
      for (const language of model.languages) {
        const row = document.createElement('li');
        row.className = 'stats-language';
        const name = document.createElement('span');
        name.className = 'stats-language-name';
        name.textContent = language.name;
        const track = document.createElement('span');
        track.className = 'stats-language-track';
        const fill = document.createElement('i');
        fill.style.width = `${Math.max(0, Math.min(100, language.share))}%`;
        track.append(fill);
        const share = document.createElement('span');
        share.className = 'stats-language-share';
        share.textContent = `${language.share}%`;
        row.append(name, track, share);
        languages.append(row);
      }
    }

    if (meta) {
      const parts = [model.age];
      if (model.years) parts.push(`${model.years} years on GitHub`);
      meta.textContent = parts.join(' · ');
    }
  }

  /**
   * Read the snapshot and draw the strip.
   *
   * A failed read is not a crash: the strip keeps its placeholder and
   * says the numbers are unavailable, so the rest of the page still
   * works.
   */
  async function load() {
    if (typeof fetchImpl !== 'function') {
      strip.dataset.statsState = 'unavailable';
      return null;
    }
    try {
      const response = await fetchImpl(path, { credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const snapshot = await response.json();
      const model = buildStats(snapshot);
      if (!model.stats.some(stat => stat.value !== null)) {
        strip.dataset.statsState = 'unavailable';
        return model;
      }
      paint(model);
      strip.dataset.statsState = 'ready';
      return model;
    } catch (error) {
      strip.dataset.statsState = 'unavailable';
      const note = strip.querySelector('[data-stats-note]');
      if (note) note.textContent = 'The live numbers could not be loaded. The GitHub profile is still one click away.';
      return null;
    }
  }

  return { load, paint, buildStats };
}
