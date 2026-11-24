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
 * The API takes one tag at a time, so the tags are fetched sequentially and
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
 * The API takes one tag at a time, so the requests run in sequence and the
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
  const merged = batches.flat().sort((a, b) => Date.parse(b.published_timestamp) - Date.parse(a.published_timestamp));
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
      let link = safeNewsUrl(story.url);
      if (link) {
        const url = new URL(link);
        url.hash = '';
        for (const key of [...url.searchParams.keys()]) {
          if (/^(utm(?:_.*)?|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
        }
        link = url.href.replace(/\/+$/, '');
      }
      const identity = story.id == null ? null : `${story.provider || ''}/${story.id}`;
      if (link && seenLinks.has(link)) continue;
      if (identity && seenIds.has(identity)) continue;
      if (link) seenLinks.add(link);
      if (identity) seenIds.add(identity);
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
  if (elapsed < 60) return 'just now';
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


const TOPICS = { tech: 'Technology', ai: 'AI', science: 'Science & space' };
const SOURCE_URLS = {
  'Hacker News': SOURCE, 'Spaceflight News API': SCIENCE_SOURCE, 'DEV Community': DEVTO_SOURCE
};
const FEEDS = {
  tech: {
    path: 'news.json', primary: 'Hacker News',
    providers: [
      { load: liveSnapshot },
      { load: () => devtoSnapshot(['webdev', 'programming', 'tech']) }
    ]
  },
  ai: {
    path: 'ai-news.json', primary: 'DEV Community',
    providers: [{ load: () => devtoSnapshot(['ai', 'machinelearning', 'llm']) }]
  },
  science: {
    path: 'science.json', primary: 'Spaceflight News API',
    providers: [
      { load: async () => {
        const result = normalizeScienceSnapshot({ ...await fetchJson(SCIENCE_API, 15000), updated: new Date().toISOString() });
        if (!result) throw new Error('Science headlines unavailable.');
        return result;
      } },
      { load: () => devtoSnapshot(['space', 'science']) }
    ]
  }
};

export function readNewsEdition(topic, raw) {
  const feed = FEEDS[topic];
  if (!feed || !Array.isArray(raw?.stories)) return null;
  const provider = raw.source || feed.primary;
  if (provider === 'DEV Community') {
    // Earlier AI caches sometimes held the tech edition with a DEV label.
    const articles = raw.stories.filter(story => {
      const url = safeNewsUrl(story?.url);
      return url && new URL(url).hostname === 'dev.to';
    });
    return normalizeDevtoSnapshot(articles, raw.updated);
  }
  if (provider !== feed.primary) return null;
  if (topic === 'tech') return normalizeNewsSnapshot(raw);
  if (topic === 'science') return normalizeScienceSnapshot(raw);
  return null;
}

function externalLink(url, text, className) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  if (className) link.className = className;
  return link;
}

function storyCard(story) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.dataset.topic = story.topic;
  const top = document.createElement('div');
  top.className = 'news-card-top';
  const topic = document.createElement('span');
  topic.className = 'news-topic';
  topic.textContent = TOPICS[story.topic];
  const time = document.createElement('time');
  const date = new Date(story.time * 1000);
  time.dateTime = date.toISOString();
  time.textContent = newsTimeAgo(story.time);
  time.title = date.toLocaleString();
  top.append(topic, time);
  const heading = document.createElement('h3');
  heading.append(externalLink(story.url, story.title));
  const details = document.createElement('div');
  details.className = 'news-byline';
  const publisher = document.createElement('span');
  const host = new URL(story.url).hostname.replace(/^www\./, '');
  publisher.textContent = story.publisher || host;
  details.append(publisher);
  if (story.provider === 'Hacker News') {
    const discussion = externalLink(`${SOURCE}item?id=${story.id}`, `${story.comments} comments ↗`, 'news-discussion');
    discussion.setAttribute('aria-label', `${story.comments} comments on ${story.title} at Hacker News`);
    discussion.title = `${story.score} points on Hacker News`;
    details.append(discussion);
  } else if (story.provider === 'DEV Community' && story.publisher !== 'DEV Community') {
    const provider = document.createElement('span');
    provider.textContent = 'DEV Community';
    details.append(provider);
  }
  card.append(top, heading, details);
  return card;
}

export function initNews() {
  const section = document.getElementById('news');
  if (!section || section.dataset.newsInitialized) return;
  const grid = section.querySelector('#news-grid'), status = section.querySelector('#news-status');
  const refreshButton = section.querySelector('#news-refresh'), countdown = section.querySelector('#news-countdown');
  const tabs = section.querySelector('.news-tabs'), chips = section.querySelector('.news-sources');
  const search = section.querySelector('#news-search'), sources = section.querySelector('#news-source'), more = section.querySelector('.news-more');
  if (!grid || !status || !refreshButton || !tabs || !chips || !search || !countdown || !sources || !more) return;
  section.dataset.newsInitialized = 'true';
  const states = Object.fromEntries(Object.keys(FEEDS).map(key => [key, { snapshot: null, mode: 'unavailable', pending: false, lastAttempt: 0 }]));
  let selected = 'all', sourceFilter = 'all', shown = 6, visible = false, chipsKey = null;
  const topicKeys = () => selected === 'all' ? Object.keys(FEEDS) : [selected];

  function updateCountdown() {
    const live = topicKeys().map(key => states[key]).filter(state => state.mode === 'live' && !state.pending);
    const next = live.length ? Math.min(...live.map(state => state.lastAttempt)) + REFRESH_MS - Date.now() : 0;
    countdown.textContent = next > 0 ? `Next check in ${formatCountdown(next)}` : '';
  }

  function render() {
    const keys = topicKeys(), editions = keys.map(key => states[key]);
    const all = mergeStories(keys.map(topic => {
      const edition = states[topic].snapshot;
      return (edition?.stories || []).map(story => ({ ...story, provider: edition.source, topic }));
    }), 36);
    const names = [...new Set(all.map(story => story.provider))].sort();
    if (!names.includes(sourceFilter)) sourceFilter = 'all';
    if (chipsKey !== names.join('|')) {
      const activeChip = chips.contains(document.activeElement) ? document.activeElement.dataset.source : null;
      chipsKey = names.join('|');
      chips.replaceChildren(...['all', ...names].map(name => {
        const chip = document.createElement('button');
        chip.type = 'button'; chip.dataset.source = name;
        chip.textContent = name === 'all' ? 'All sources' : name;
        return chip;
      }));
      chips.hidden = names.length < 2;
      if (activeChip && !chips.hidden) [...chips.children].find(chip => chip.dataset.source === activeChip)?.focus({preventScroll: true});
      const actualSources = names.length ? names : [...new Set(keys.map(key => FEEDS[key].primary))];
      sources.replaceChildren(...actualSources.flatMap((name, index) => [...(index ? [' · '] : []), externalLink(SOURCE_URLS[name], name)]));
    }
    for (const chip of chips.children) chip.setAttribute('aria-pressed', String(chip.dataset.source === sourceFilter));
    const query = search.value.trim().toLocaleLowerCase();
    const matches = all.filter(story => (sourceFilter === 'all' || story.provider === sourceFilter) && (!query ||
      [story.title, story.publisher, story.provider, new URL(story.url).hostname].some(value => value?.toLocaleLowerCase().includes(query))));
    const pending = editions.some(state => state.pending);
    refreshButton.disabled = pending;
    refreshButton.textContent = pending ? 'Refreshing…' : 'Refresh headlines ↻';
    grid.setAttribute('aria-busy', String(pending));
    const modes = new Set(editions.filter(state => state.snapshot).map(state => state.mode));
    const missing = editions.some(state => !state.snapshot && !state.pending);
    const mode = modes.size > 1 || (modes.size && missing) ? 'mixed' : [...modes][0];
    const label = { live: 'Live feed', snapshot: 'Daily edition', cached: 'Saved edition', mixed: 'Mixed availability' }[mode];
    const stamp = Math.max(...editions.map(state => Date.parse(state.snapshot?.updated) || 0));
    let message = label ? `${label} · ${matches.length} headline${matches.length === 1 ? '' : 's'}` : (pending ? 'Checking sources…' : 'Headlines unavailable');
    if (stamp) message += ` · Last updated ${formatRelative(new Date(stamp).toISOString())}`;
    if (status.textContent !== message) status.textContent = message;
    status.dataset.newsState = mode || 'unavailable';
    updateCountdown();

    const focusedLink = grid.contains(document.activeElement) ? document.activeElement.href : null;
    grid.replaceChildren(...matches.slice(0, shown).map(storyCard));
    if (focusedLink) [...grid.querySelectorAll('a')].find(link => link.href === focusedLink)?.focus({ preventScroll: true });
    if (!matches.length) {
      const empty = document.createElement('p'); empty.className = 'news-empty';
      empty.textContent = query && all.length ? 'No matching headlines. Try another headline or publisher.' :
        pending ? 'Finding headlines…' : 'No headlines are available for this edition. Refresh to check again.';
      grid.append(empty);
    }
    more.hidden = matches.length <= shown;
    more.textContent = `Show ${Math.min(6, Math.max(0, matches.length - shown))} more headlines ↓`;
  }

  async function refreshTopic(key) {
    const state = states[key], feed = FEEDS[key], cacheKey = `imon-${key}-news-v2`;
    if (state.pending) return;
    const firstLoad = !state.lastAttempt;
    state.pending = true;
    state.lastAttempt = Date.now();
    const display = () => { if (selected === 'all' || selected === key) render(); };
    function accept(value, mode) {
      state.snapshot = value;
      state.mode = mode;
      try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch {}
      display();
    }
    if (firstLoad) {
      try {
        state.snapshot = readNewsEdition(key, JSON.parse(localStorage.getItem(cacheKey)));
        if (state.snapshot) state.mode = 'cached';
      } catch {}
      display();
      try {
        const daily = readNewsEdition(key, await fetchJson(new URL(`./data/${feed.path}`, import.meta.url).href, 5000));
        if (daily && (!state.snapshot || Date.parse(daily.updated) > Date.parse(state.snapshot.updated))) accept(daily, 'snapshot');
      } catch {}
    }
    display();
    try {
      if (navigator.onLine === false) throw new Error('Offline');
      accept(await firstProvider(feed.providers), 'live');
    } catch {
      state.mode = state.snapshot ? 'cached' : 'unavailable';
    } finally { state.pending = false; display(); }
  }

  function refreshVisible(force = false) {
    if (!visible || document.hidden) return;
    for (const key of topicKeys()) {
      if (force || Date.now() - states[key].lastAttempt >= REFRESH_MS) refreshTopic(key);
    }
  }
  tabs.addEventListener('click', event => {
    const tab = event.target.closest('button[data-feed]');
    if (!tab) return;
    selected = tab.dataset.feed;
    shown = 6; sourceFilter = 'all'; chipsKey = null;
    for (const button of tabs.children) button.setAttribute('aria-pressed', String(button === tab));
    render(); refreshVisible();
  });
  chips.addEventListener('click', event => {
    const button = event.target.closest('button[data-source]');
    if (button) { sourceFilter = button.dataset.source; shown = 6; render(); }
  });
  search.addEventListener('input', () => { shown = 6; render(); });
  more.addEventListener('click', () => {
    const firstNew = shown;
    shown += 6; render();
    grid.children[firstNew]?.querySelector('h3 a')?.focus();
  });
  refreshButton.addEventListener('click', () => refreshVisible(true));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refreshVisible(); }).observe(section);
  } else { visible = true; refreshVisible(); }
  document.addEventListener('visibilitychange', () => refreshVisible());
  window.addEventListener('offline', () => {
    for (const state of Object.values(states)) if (state.snapshot) state.mode = 'cached';
    render();
  });
  window.addEventListener('online', () => refreshVisible(true));
  setInterval(() => { if (visible && !document.hidden) { refreshVisible(); updateCountdown(); } }, 1000);
}
