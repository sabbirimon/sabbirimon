/* Live tech and space/science headlines, with dated offline snapshots. */
const API = 'https://hacker-news.firebaseio.com/v0/';
const SOURCE = 'https://news.ycombinator.com/';
const REFRESH_MS = 30 * 60 * 1000;
const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', times: '×', divide: '÷', deg: '°', euro: '€', pound: '£', yen: '¥', cent: '¢', laquo: '«', raquo: '»' };

export function safeNewsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function decodeNewsTitle(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entity;
    }
    if (Object.hasOwn(ENTITIES, code)) return ENTITIES[code];
    if (typeof document !== 'undefined') {
      // Only a single regex-validated entity token enters this detached decoder:
      // it cannot contain markup. The full headline always uses textContent.
      const decoder = document.createElement('textarea');
      decoder.innerHTML = entity;
      return decoder.value;
    }
    return entity;
  }).trim();
}

export function normalizeNewsSnapshot(value) {
  if (!value || !Array.isArray(value.stories)) return null;
  const seen = new Set();
  const stories = value.stories.flatMap(story => {
    if (!story || !Number.isSafeInteger(story.id) || story.id < 1 || seen.has(story.id) || story.deleted || story.dead || (story.type && story.type !== 'story')) return [];
    const title = value.titleFormat === 'plain' && typeof story.title === 'string' ? story.title.trim() : decodeNewsTitle(story.title);
    if (!title || title.length > 1000 || !Number.isFinite(story.time) || story.time <= 0 || !Number.isFinite(new Date(story.time * 1000).getTime())) return [];
    const url = safeNewsUrl(story.url) || `${SOURCE}item?id=${story.id}`;
    seen.add(story.id);
    return [{ id: story.id, title, url, score: Number.isSafeInteger(story.score) && story.score >= 0 ? story.score : 0, time: story.time, comments: Number.isSafeInteger(story.comments) && story.comments >= 0 ? story.comments : 0 }];
  }).slice(0, 12);
  const updated = typeof value.updated === 'string' && Number.isFinite(Date.parse(value.updated)) ? new Date(value.updated).toISOString() : null;
  return stories.length ? { updated, source: 'Hacker News', sourceUrl: SOURCE, titleFormat: 'plain', stories } : null;
}

export function newsTimeAgo(seconds, now = Date.now()) {
  const elapsed = Math.max(0, Math.floor(now / 1000 - seconds));
  if (elapsed < 60) return 'just now';
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
  return `${Math.floor(elapsed / 86400)}d ago`;
}

async function fetchJson(url, timeout = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`News request failed: ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function liveSnapshot() {
  const ids = await fetchJson(`${API}topstories.json`);
  if (!Array.isArray(ids)) throw new Error('Invalid news list.');
  const queue = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 12);
  const stories = Array(queue.length).fill(null);
  let position = 0;
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (position < queue.length) {
      const index = position++;
      try {
        const item = await fetchJson(`${API}item/${queue[index]}.json`, 5000);
        if (item?.type === 'story' && !item.deleted && !item.dead) stories[index] = { ...item, comments: item.descendants };
      } catch { /* A failed item does not discard the other official results. */ }
    }
  }));
  const result = normalizeNewsSnapshot({ updated: new Date().toISOString(), stories });
  if (!result || result.stories.length < 6) throw new Error('Not enough current stories.');
  return result;
}

const SCIENCE_API = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=12';
const SCIENCE_SOURCE = 'https://www.spaceflightnewsapi.net/';
export function normalizeScienceSnapshot(value) {
  if (!value || !Array.isArray(value.results || value.stories)) return null;
  const seen = new Set();
  const stories = (value.results || value.stories).flatMap(item => {
    const url = safeNewsUrl(item?.url), time = item?.published_at ? Date.parse(item.published_at) / 1000 : item?.time;
    if (!Number.isSafeInteger(item?.id) || item.id < 1 || seen.has(item.id) || !url || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 1000 || !Number.isFinite(time) || time <= 0 || !Number.isFinite(new Date(time * 1000).getTime())) return [];
    seen.add(item.id);
    return [{ id: item.id, title: item.title.trim(), url, time, publisher: String(item.news_site || item.publisher || new URL(url).hostname).slice(0, 100) }];
  }).slice(0, 12);
  return stories.length ? { stories, source: 'Spaceflight News API', sourceUrl: SCIENCE_SOURCE, updated: Number.isFinite(Date.parse(value.updated)) ? new Date(value.updated).toISOString() : null } : null;
}

/* The second science provider.
   The Spaceflight News API is a small community service and goes down
   without warning. The DEV Community API answers with the same shape of
   article and sends CORS headers, so it carries the feed when the first
   provider is silent. */
const DEVTO_API = 'https://dev.to/api/articles';
const DEVTO_SOURCE = 'https://dev.to/';
// The pause between dev.to tag requests. The API answers a burst of parallel
// requests with the plain text "Retry later" instead of JSON, so the tags are
// fetched one after another with this gap in between.
const DEVTO_GAP_MS = 400;
export function normalizeDevtoSnapshot(value, updated) {
  const list = Array.isArray(value) ? value : (Array.isArray(value?.stories) ? value.stories : null);
  if (!list) return null;
  const seen = new Set();
  const stories = list.flatMap(item => {
    const url = safeNewsUrl(item?.url), time = item?.published_timestamp ? Date.parse(item.published_timestamp) / 1000 : item?.time;
    if (!Number.isSafeInteger(item?.id) || item.id < 1 || seen.has(item.id) || !url || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 1000 || !Number.isFinite(time) || time <= 0 || !Number.isFinite(new Date(time * 1000).getTime())) return [];
    seen.add(item.id);
    return [{ id: item.id, title: item.title.trim(), url, time, publisher: String(item?.user?.name || item?.publisher || new URL(url).hostname).slice(0, 100) }];
  }).slice(0, 12);
  const stamp = Number.isFinite(Date.parse(updated)) ? new Date(updated).toISOString() : null;
  return stories.length ? { stories, source: 'DEV Community', sourceUrl: DEVTO_SOURCE, updated: stamp } : null;
}

/**
 * Build the dev.to query for a set of tags.
 *
 * The API takes one tag at a time, so the tags are fetched in parallel and
 * the results are merged. The order of the tags decides the order of the
 * stories, which keeps the list stable between refreshes.
 */
export function devtoQuery(tags = ['space', 'science']) {
  const list = Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.trim()) : [];
  return list.map(tag => `${DEVTO_API}?tag=${encodeURIComponent(tag.trim())}&per_page=12`);
}


/**
 * Fetch the dev.to articles for a list of tags.
 *
 * The API takes one tag at a time, so the requests run in parallel and the
 * results are merged. A tag that fails is skipped rather than failing the
 * whole lookup, so one missing feed never silences the other.
 */
async function devtoSnapshot(tags, timeout = 9000) {
  const list = Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.trim()) : [];
  // The API takes one tag at a time and it also refuses requests that arrive
  // together: several tags fetched side by side come back as the plain text
  // "Retry later" instead of JSON. The tags are therefore asked for one after
  // another with a short pause between them, which keeps the feed working.
  // A tag that fails is skipped rather than failing the whole lookup.
  const batches = [];
  for (const tag of list) {
    if (batches.length) await new Promise(resolve => setTimeout(resolve, DEVTO_GAP_MS));
    try {
      const raw = await fetchJson(`${DEVTO_API}?tag=${encodeURIComponent(tag.trim())}&per_page=12`, timeout);
      batches.push(Array.isArray(raw) ? raw : []);
    } catch { batches.push([]); }
  }
  const merged = batches.flat();
  const result = normalizeDevtoSnapshot(merged, new Date().toISOString());
  if (!result) throw new Error('DEV Community headlines unavailable.');
  return result;
}

/**
 * Try each provider in turn and return the first one that answers.
 *
 * A feed depends on somebody else's server, so a single provider is a
 * single point of failure. The chain keeps the section alive when the
 * first choice is down, and the returned snapshot carries the name of the
 * provider that actually answered so the page never mislabels the source.
 */
export async function firstProvider(providers) {
  const list = Array.isArray(providers) ? providers : [];
  let lastError = null;
  for (const provider of list) {
    try {
      const result = await provider.load();
      if (result) return result;
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('No provider answered.');
}

/**
 * Merge the stories of several feeds into one list.
 *
 * The combined view draws from more than one provider, and two providers
 * can carry the same story — often under different numeric ids. A story is
 * therefore recognised by its link first and by its id second, so the same
 * headline never appears twice. The newest story leads the list.
 */
export function mergeStories(lists, limit = 24) {
  const seenLinks = new Set(), seenIds = new Set(), merged = [];
  for (const list of Array.isArray(lists) ? lists : []) {
    for (const story of Array.isArray(list) ? list : []) {
      if (!story || typeof story !== 'object') continue;
      const link = typeof story.url === 'string' ? story.url.replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase() : '';
      if (link && seenLinks.has(link)) continue;
      if (story.id != null && seenIds.has(story.id)) continue;
      if (link) seenLinks.add(link);
      if (story.id != null) seenIds.add(story.id);
      merged.push(story);
    }
  }
  merged.sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0));
  return merged.slice(0, Math.max(0, limit));
}

/**
 * Describe how long ago a moment was, in plain words.
 *
 * The status line shows when the feed was last refreshed, so the wording
 * has to stay short enough to sit next to the rest of the line.
 */
export function formatRelative(updated, now = Date.now()) {
  const stamp = Date.parse(updated);
  if (!Number.isFinite(stamp)) return 'time unavailable';
  const elapsed = Math.max(0, Math.floor(now / 1000 - stamp / 1000));
  if (elapsed < 45) return 'just now';
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)} min ago`;
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)} h ago`;
  return `${Math.floor(elapsed / 86400)} d ago`;
}

/**
 * Render the time left before the next refresh as a clock.
 *
 * The countdown is the visitor's cue that the page is watching the feed,
 * so it is written as minutes and seconds rather than a bare number.
 */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const minutes = Math.floor(total / 60), seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}


export function initNews() {
  const section = document.getElementById('news'), grid = document.getElementById('news-grid'), status = document.getElementById('news-status'), refreshButton = document.getElementById('news-refresh'), source = document.getElementById('news-source');
  if (!section || !grid || !status || !refreshButton || !source || section.dataset.newsInitialized) return;
  section.dataset.newsInitialized = 'true';
  status.setAttribute('aria-live', 'polite');
  // Every feed lists its providers in order of preference. The first one
  // that answers wins; the rest are the safety net.
  const feeds = {
    tech: {
      name: 'Hacker News', url: SOURCE, path: 'news.json',
      normalize: normalizeNewsSnapshot,
      // A saved snapshot can be in the shape of any provider that answered.
      normalisers: [normalizeNewsSnapshot, value => normalizeDevtoSnapshot(value.stories || value, value.updated)],
      providers: [
        { name: 'Hacker News', url: SOURCE, load: liveSnapshot },
        { name: 'DEV Community', url: DEVTO_SOURCE, load: () => devtoSnapshot(['webdev', 'programming', 'tech']) }
      ]
    },
    science: {
      name: 'Spaceflight News API', url: SCIENCE_SOURCE, path: 'science.json',
      normalize: normalizeScienceSnapshot,
      normalisers: [normalizeScienceSnapshot, value => normalizeDevtoSnapshot(value.stories || value, value.updated)],
      providers: [
        { name: 'Spaceflight News API', url: SCIENCE_SOURCE, load: async () => {
          const result = normalizeScienceSnapshot({ ...await fetchJson(SCIENCE_API, 15000), updated: new Date().toISOString() });
          if (!result) throw new Error('Science headlines unavailable.');
          return result;
        } },
        { name: 'DEV Community', url: DEVTO_SOURCE, load: () => devtoSnapshot(['space', 'science']) }
      ]
    },
    ai: {
      name: 'DEV Community', url: DEVTO_SOURCE, path: 'news.json',
      normalize: normalizeDevtoSnapshot,
      // The AI feed is carried by the DEV Community API, which answers with
      // the article shape the science feed already knows how to read.
      normalisers: [value => normalizeDevtoSnapshot(value.stories || value, value.updated)],
      providers: [
        { name: 'DEV Community', url: DEVTO_SOURCE, load: () => devtoSnapshot(['ai', 'machinelearning', 'llm', 'tutorial']) }
      ]
    }
  };
  // The combined view draws from both feeds, so it carries its own entry
  // rather than borrowing one of theirs.
  feeds.all = { name: 'All headlines', url: SOURCE, path: 'news.json', providers: [] };
  const states = Object.fromEntries(['tech', 'ai', 'science'].map(key => [key, { snapshot: null, mode: 'unavailable', started: false, pending: false, lastAttempt: 0 }]));
  let selected = 'all', visible = false, sourceFilter = 'all', shown = 6;
  const tabs = document.createElement('div'); tabs.className = 'news-tabs'; tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'News category');
  for (const [key, label] of [['all', '✦ All headlines'], ['tech', '⌘ Technology'], ['ai', '◆ Artificial intelligence'], ['science', '✦ Science & space']]) {
    const button = document.createElement('button'); button.textContent = label; button.dataset.feed = key; button.setAttribute('aria-pressed', String(key === selected));
    button.addEventListener('click', () => { selected = key; shown = 6; for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab === button)); render(); if (key === 'all' || !states[key].started) refresh(key); else revalidate(); }); tabs.append(button);
  }
  grid.before(tabs);
  // The source chips narrow the list down to one provider. They are built
  // from the providers that actually answered, so a chip never offers a
  // feed that has nothing behind it.
  const chips = document.createElement('div'); chips.className = 'news-sources'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'News source');
  grid.before(chips);
  const more = document.createElement('button'); more.type = 'button'; more.className = 'news-more'; more.textContent = 'Show more headlines ↓';
  more.addEventListener('click', () => { shown += 6; render(); });
  grid.after(more);
  function externalLink(url, text, className) {
    const link = document.createElement('a'); link.href = safeNewsUrl(url) || SOURCE; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = text;
    if (className) link.className = className;
    return link;
  }
  /* The stories behind the current view.
     A single feed uses its own snapshot. The combined view gathers the
     stories of every feed and sorts them newest first, so a fresh science
     headline can lead the list ahead of an older technology one. */
  function viewStories() {
    if (selected !== 'all') {
      const snapshot = states[selected].snapshot;
      return snapshot ? tagProvider(snapshot.stories, snapshot.source) : [];
    }
    return mergeStories([
      tagProvider(states.tech.snapshot?.stories, states.tech.snapshot?.source),
      tagProvider(states.ai.snapshot?.stories, states.ai.snapshot?.source),
      tagProvider(states.science.snapshot?.stories, states.science.snapshot?.source)
    ]);
  }
  /* The name of the provider behind a story.
     Each snapshot carries the name of the provider that answered, so the
     story is tagged with it when the two feeds are merged. A story that
     was not tagged is told apart by its publisher instead. */
  function storySource(story) {
    if (story.provider) return story.provider;
    if (Number.isFinite(story.score) && story.comments !== undefined) return 'Hacker News';
    return story.publisher || 'Hacker News';
  }
  /* Tag every story with the provider that answered, so the merged view
     can filter by provider instead of by author name. */
  function tagProvider(stories, provider) {
    return (stories || []).map(story => ({ ...story, provider }));
  }
  function providerNames(stories) {
    const names = new Set();
    for (const story of stories) names.add(storySource(story));
    return [...names];
  }
  function renderChips(stories) {
    const names = providerNames(stories);
    const options = [['all', 'All sources'], ...names.map(name => [name, name])];
    if (!options.some(option => option[0] === sourceFilter)) sourceFilter = 'all';
    chips.replaceChildren();
    for (const [key, label] of options) {
      const chip = document.createElement('button'); chip.type = 'button'; chip.textContent = label; chip.dataset.source = key; chip.setAttribute('aria-pressed', String(key === sourceFilter));
      chip.addEventListener('click', () => { sourceFilter = key; shown = 6; render(); });
      chips.append(chip);
    }
    chips.hidden = names.length < 2;
  }
  /* The state of the view on screen.
     The combined view has no snapshot of its own: it borrows the two
     feeds underneath it, and its freshness is the freshest of the two. */
  function viewState() {
    if (selected !== 'all') return states[selected];
    const feeds = [states.tech, states.ai, states.science].filter(item => item.snapshot);
    if (!feeds.length) return { snapshot: null, mode: 'unavailable', lastAttempt: 0 };
    const stamps = feeds.map(item => Date.parse(item.snapshot.updated || 0) || 0);
    const freshest = stamps.indexOf(Math.max(...stamps));
    return {
      snapshot: { updated: feeds[freshest].snapshot.updated },
      mode: feeds.some(item => item.mode === 'live') ? 'live' : feeds[0].mode,
      lastAttempt: Math.max(...feeds.map(item => item.lastAttempt || 0))
    };
  }
  function render() {
    const state = viewState(), feed = feeds[selected];
    const pending = Object.values(states).some(item => item.pending);
    refreshButton.disabled = pending; refreshButton.textContent = pending ? 'Refreshing…' : 'Refresh headlines ↻'; grid.setAttribute('aria-busy', String(pending));
    // The snapshot names the provider that answered, so the link points at
    // the real source rather than the preferred one.
    const providerName = state.snapshot?.source || feed.name;
    const providerUrl = feed.providers?.find(item => item.name === providerName)?.url || feed.url;
    source.href = providerUrl;
    source.textContent = selected === 'all'
      ? `Mixed from ${providerNames(viewStories()).join(' · ') || providerName} ↗`
      : `${selected === 'tech' ? 'Community-curated on' : selected === 'ai' ? 'Machine learning & AI via' : 'Science & space via'} ${providerName} ↗`;
    if (!state.snapshot) status.textContent = pending ? 'Loading the latest dispatch…' : 'News unavailable. Connect and try refreshing.';
    else {
      const stamp = state.snapshot.updated;
      const modeLabel = state.mode === 'live' ? 'Live' : state.mode === 'snapshot' ? 'Daily snapshot' : 'Cached headlines';
      const relative = formatRelative(stamp);
      const remaining = REFRESH_MS - (Date.now() - state.lastAttempt);
      const countdown = remaining > 0 && state.mode === 'live' ? ` · next refresh in ${formatCountdown(remaining)}` : '';
      status.textContent = `${modeLabel} · Updated ${relative}${pending ? ' · Updating…' : countdown || (state.mode === 'cached' ? ' · Live refresh unavailable' : '')}`;
    }
    status.dataset.newsState = state.mode;
    const all = viewStories();
    const filtered = sourceFilter === 'all' ? all : all.filter(story => storySource(story) === sourceFilter);
    renderChips(all);
    const fragment = document.createDocumentFragment();
    if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'news-empty'; empty.textContent = pending ? 'Finding fresh discoveries…' : 'No saved headlines yet. Try again when you’re online.'; fragment.append(empty); }
    filtered.slice(0, shown).forEach((story, index) => {
      const card = document.createElement('article'); card.className = 'news-card';
      const top = document.createElement('div'); top.className = 'news-card-top';
      const number = document.createElement('span'); number.className = 'news-rank'; number.textContent = `${String(index + 1).padStart(2, '0')} / ${selected === 'science' ? 'SCIENCE' : selected === 'tech' ? 'TECH' : selected === 'ai' ? 'AI' : 'ALL'}`;
      top.append(number, externalLink(story.url, `${new URL(story.url).hostname.replace(/^www\./, '')} ↗`, 'news-domain'));
      const heading = document.createElement('h3'); heading.append(externalLink(story.url, story.title));
      const meta = document.createElement('div'); meta.className = 'news-meta';
      // The points and comment counts belong to Hacker News. A story from
      // another provider has neither, so the publisher stands in.
      const detail = document.createElement('span'); detail.className = 'news-points';
      detail.textContent = Number.isFinite(story.score) && story.comments !== undefined ? `▲ ${story.score.toLocaleString()} points` : (story.publisher || storySource(story));
      const time = document.createElement('time'); time.dateTime = new Date(story.time * 1000).toISOString(); time.textContent = newsTimeAgo(story.time); time.title = new Date(story.time * 1000).toLocaleString();
      const discussion = Number.isFinite(story.comments) && story.comments !== undefined ? externalLink(`${SOURCE}item?id=${story.id}`, `${story.comments.toLocaleString()} comments ↗`, 'news-discussion') : externalLink(story.url, 'Read story ↗', 'news-discussion');
      meta.append(detail, time, discussion); card.append(top, heading, meta); fragment.append(card);
    });
    grid.replaceChildren(fragment);
    more.hidden = filtered.length <= shown;
    more.textContent = shown >= filtered.length ? 'Show more headlines ↓' : 'Show more headlines ↓';
  }
  async function refresh(key = selected) {
    // The combined view has no provider of its own; it rides on the two
    // feeds underneath it.
    if (key === 'all') { await Promise.all(['tech', 'ai', 'science'].map(feedKey => refresh(feedKey))); return; }
    const state = states[key], feed = feeds[key], cacheKey = `imon-${key}-news-v2`;
    if (state.pending) return;
    const firstLoad = !state.started;
    state.started = true; state.pending = true; state.lastAttempt = Date.now();
    const display = () => { if (selected === key || selected === 'all') render(); };
    const accept = (value, mode) => { state.snapshot = value; state.mode = mode; try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch {} display(); };
    // A stored snapshot may have come from any provider, so each shape is
    // tried until one of them fits.
    const readStored = raw => {
      for (const normalise of feed.normalisers) {
        try { const value = normalise(raw); if (value) return value; } catch { /* Try the next shape. */ }
      }
      return null;
    };
    if (firstLoad) {
      try { state.snapshot = readStored(JSON.parse(localStorage.getItem(cacheKey))); state.mode = state.snapshot ? 'cached' : 'unavailable'; } catch {}
      display();
      try {
        const raw = await fetchJson(new URL(`./data/${feed.path}`, import.meta.url).href, 5000);
        const daily = readStored(raw);
        if (daily && (!state.snapshot || Date.parse(daily.updated || 0) > Date.parse(state.snapshot.updated || 0))) accept(daily, navigator.onLine === false ? 'cached' : 'snapshot');
      } catch {}
    }
    display();
    try {
      if (navigator.onLine === false) throw new Error('Offline');
      // The providers are tried in order, so one dead service does not stop
      // the feed. The snapshot that comes back names the provider that
      // answered, and the page labels the feed with that name.
      accept(await firstProvider(feed.providers), 'live');
    }
    catch { state.mode = state.snapshot ? 'cached' : 'unavailable'; }
    finally { state.pending = false; display(); }
  }
  /* The view is refreshed when it is on screen, when the tab is not
     hidden, and when the last attempt is old enough. The combined view
     refreshes when either of its two feeds is due. */
  function revalidate() {
    if (!visible || document.hidden) return;
    const due = ['tech', 'ai', 'science'].filter(key => !states[key].started || Date.now() - states[key].lastAttempt >= REFRESH_MS);
    if (due.length) refresh(selected === 'all' ? 'all' : selected);
  }
  refreshButton.addEventListener('click', () => refresh());
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; revalidate(); }, { threshold: .01 }).observe(section);
  else { visible = true; revalidate(); }
  document.addEventListener('visibilitychange', revalidate);
  window.addEventListener('offline', () => { for (const state of Object.values(states)) if (state.snapshot && !state.pending) state.mode = 'cached'; render(); });
  window.addEventListener('online', () => { if (visible && !document.hidden) refresh(); });
  setInterval(revalidate, REFRESH_MS);
  // The countdown in the status line has to keep moving, so the line is
  // redrawn once a second while the section is on screen.
  setInterval(() => { if (visible && !document.hidden) render(); }, 1000);
  render();
  // Every feed loads on the first visit so the combined view has something
  // to draw from.
  refresh('tech'); refresh('ai'); refresh('science');
}
