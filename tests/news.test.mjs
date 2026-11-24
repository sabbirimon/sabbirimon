import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNewsSnapshot, normalizeScienceSnapshot, normalizeDevtoSnapshot, safeNewsUrl, decodeNewsTitle, firstProvider, devtoQuery, mergeStories, readNewsEdition, formatRelative, formatCountdown } from '../docs/news.js';
test('news links reject scripts and credential-bearing URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.com/', 'not a url']) assert.equal(safeNewsUrl(url), null);
  assert.equal(safeNewsUrl('https://example.com/story'), 'https://example.com/story');
});
test('tech normalizer removes invalid and duplicate items and safely decodes titles', () => {
  const story = { id: 5, title: 'CPU &amp; GPU', time: 1700000000, url: 'javascript:x' };
  const result = normalizeNewsSnapshot({ stories: [story, story, { ...story, id: 6, dead: true }] });
  assert.equal(result.stories.length, 1); assert.equal(result.stories[0].title, 'CPU & GPU');
  assert.equal(result.stories[0].url, 'https://news.ycombinator.com/item?id=5');
  assert.equal(decodeNewsTitle('&#x1F680; &lt;code&gt;'), '🚀 <code>');
});
test('science normalizer accepts live and snapshot formats with publication dates', () => {
  const result = normalizeScienceSnapshot({ results: [{ id: 9, title: 'A new discovery', url: 'https://nasa.gov/science', published_at: '2026-11-17T12:00:00Z', news_site: 'NASA' }] });
  assert.equal(result.stories[0].publisher, 'NASA');
  assert.equal(normalizeScienceSnapshot(result).stories[0].time, Date.parse('2026-11-17T12:00:00Z') / 1000);
  assert.equal(normalizeScienceSnapshot({ results: [{ id: 1, title: 'x', url: 'javascript:alert(1)', published_at: 'bad' }] }), null);
});
test('the DEV Community fallback normalizer keeps valid articles and drops the rest', () => {
  const item = { id: 3, title: 'Rocket launch', url: 'https://dev.to/a/rocket', published_timestamp: '2026-11-20T10:00:00Z', user: { name: 'Ada' } };
  const result = normalizeDevtoSnapshot([item, { ...item, id: 3 }, { ...item, id: 4, url: 'javascript:x' }, { ...item, id: 5, published_timestamp: 'nope' }], '2026-11-22T00:00:00Z');
  assert.equal(result.stories.length, 1);
  assert.equal(result.stories[0].publisher, 'Ada');
  assert.equal(result.source, 'DEV Community');
  assert.equal(result.updated, '2026-11-22T00:00:00.000Z');
  assert.equal(normalizeDevtoSnapshot(null), null);
  assert.equal(normalizeDevtoSnapshot([], '2026-11-22T00:00:00Z'), null);
});
test('a failed provider is skipped and the next one answers', async () => {
  let tried = [];
  const result = await firstProvider([
    { name: 'first', load: async () => { tried.push('first'); throw new Error('down'); } },
    { name: 'second', load: async () => { tried.push('second'); return { source: 'second' }; } }
  ]);
  assert.deepEqual(tried, ['first', 'second']);
  assert.equal(result.source, 'second');
});
test('the provider chain gives up only when every provider fails', async () => {
  await assert.rejects(() => firstProvider([{ load: async () => { throw new Error('a'); } }, { load: async () => { throw new Error('b'); } }]), /b/);
  await assert.rejects(() => firstProvider([]));
});
test('the dev.to query builds one request per tag and ignores blank tags', () => {
  assert.deepEqual(devtoQuery(['space', 'science']), ['https://dev.to/api/articles?tag=space&per_page=12', 'https://dev.to/api/articles?tag=science&per_page=12']);
  assert.deepEqual(devtoQuery(['space', '  ', '']), ['https://dev.to/api/articles?tag=space&per_page=12']);
  assert.deepEqual(devtoQuery('not an array'), []);
});
test('the merged list drops repeats, leads with the newest and respects the cap', () => {
  const older = { id: 1, title: 'Older', url: 'https://example.com/older', time: 100 };
  const newer = { id: 2, title: 'Newer', url: 'https://example.com/newer', time: 200 };
  const merged = mergeStories([[older], [newer, { ...older, id: 3 }], [{ id: 2, title: 'Same id', url: 'https://other.test/x', time: 300 }]]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Newer');
  assert.equal(merged[0].time, 200);
  assert.equal(mergeStories([[older, newer]], 1).length, 1);
  assert.deepEqual(mergeStories('not a list'), []);
  assert.deepEqual(mergeStories(null), []);
});
test('the merged list treats the same link as the same story even under different ids', () => {
  const first = { id: 1, title: 'Story', url: 'https://example.com/story?utm=1', time: 100 };
  const second = { id: 2, title: 'Story', url: 'https://example.com/story', time: 200 };
  assert.equal(mergeStories([[first], [second]]).length, 1);
});
test('the status line says how long ago the feed was refreshed', () => {
  const now = Date.parse('2026-11-22T12:00:00Z');
  assert.equal(formatRelative('2026-11-22T11:59:50Z', now), 'just now');
  assert.equal(formatRelative('2026-11-22T11:30:00Z', now), '30 min ago');
  assert.equal(formatRelative('2026-11-22T09:00:00Z', now), '3 h ago');
  assert.equal(formatRelative('2026-11-19T12:00:00Z', now), '3 d ago');
  assert.equal(formatRelative('nonsense', now), 'time unavailable');
  assert.equal(formatRelative(null, now), 'time unavailable');
});
test('the countdown reads as a clock and never goes negative', () => {
  assert.equal(formatCountdown(0), '0:00');
  assert.equal(formatCountdown(90000), '1:30');
  assert.equal(formatCountdown(1651000), '27:31');
  assert.equal(formatCountdown(-5000), '0:00');
});
test('the DEV normalizer keeps the article author as the publisher', () => {
  const result = normalizeDevtoSnapshot([{ id: 8, title: 'Agentic systems', url: 'https://dev.to/a/agentic', published_timestamp: '2026-11-21T09:00:00Z', user: { name: 'Grace' } }], '2026-11-22T00:00:00Z');
  assert.equal(result.stories[0].publisher, 'Grace');
  assert.equal(result.stories[0].provider, undefined);
  assert.equal(result.source, 'DEV Community');
});

test('editions retain the actual fallback provider and reject old tech stories in AI', () => {
  const snapshot = { source: 'DEV Community', updated: '2026-11-22T00:00:00Z', stories: [
    { id: 1, title: 'Model output', url: 'https://dev.to/ada/model', time: 1700000000, publisher: 'Ada' }
  ] };
  for (const topic of ['tech', 'science', 'ai']) {
    assert.equal(readNewsEdition(topic, snapshot).source, 'DEV Community');
    assert.equal(readNewsEdition(topic, snapshot).stories[0].publisher, 'Ada');
  }
  assert.equal(readNewsEdition('ai', { ...snapshot, source: 'Hacker News' }), null);
  assert.equal(readNewsEdition('ai', { ...snapshot, stories: [{ ...snapshot.stories[0], url: 'https://example.test/not-ai' }] }), null);
});
test('combined headlines preserve provider-local ids and distinct query-based stories', () => {
  const first = { id: 7, provider: 'Hacker News', url: 'https://news.ycombinator.com/item?id=7', time: 1 };
  const second = { ...first, id: 8, url: 'https://news.ycombinator.com/item?id=8' };
  const third = { ...first, provider: 'DEV Community', url: 'https://dev.to/a/story' };
  assert.equal(mergeStories([[first, second], [third]]).length, 3);
});
