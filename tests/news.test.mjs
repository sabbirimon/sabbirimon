import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNewsSnapshot, normalizeScienceSnapshot, safeNewsUrl, decodeNewsTitle } from '../docs/news.js';
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
