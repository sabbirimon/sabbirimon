import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS, LEVELS, XP_SOURCES,
  buildProfile, levelForXp, levelProgress, nextAchievement, unlockedAchievements
} from '../docs/achievements.js';

const empty = buildProfile({});

test('a level is the last threshold the XP clears', () => {
  assert.equal(levelForXp(0).level, 1);
  assert.equal(levelForXp(49).level, 1);
  assert.equal(levelForXp(50).level, 2);
  assert.equal(levelForXp(150).level, 3);
  assert.equal(levelForXp(1400).level, 7);
  assert.equal(levelForXp(99999).level, 7);
});

test('a negative or broken XP total is treated as zero', () => {
  assert.equal(levelForXp(-10).level, 1);
  assert.equal(levelForXp(Number.NaN).level, 1);
  assert.equal(levelForXp(undefined).level, 1);
  assert.equal(levelForXp('nonsense').level, 1);
});

test('the progress bar reports how far into the level the visitor is', () => {
  const atStart = levelProgress(0);
  assert.equal(atStart.percent, 0);
  assert.equal(atStart.next.level, 2);
  const halfway = levelProgress(100);
  assert.equal(halfway.current.level, 2);
  assert.equal(halfway.next.level, 3);
  assert.equal(halfway.percent, 50);
  const top = levelProgress(1400);
  assert.equal(top.next, null);
  assert.equal(top.percent, 100);
});

test('a fresh visitor has no XP and unlocks nothing', () => {
  assert.equal(empty.xp, 0);
  assert.equal(empty.level.level, 1);
  assert.equal(empty.unlockedCount, 0);
  assert.equal(empty.totalCount, ACHIEVEMENTS.length);
  assert.ok(empty.achievements.every(achievement => achievement.unlocked === false));
});

test('every achievement has a unique id, a name, a note and a tier', () => {
  const ids = new Set();
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(achievement.id && !ids.has(achievement.id), `duplicate id ${achievement.id}`);
    ids.add(achievement.id);
    assert.ok(achievement.name);
    assert.ok(achievement.note);
    assert.ok(['bronze', 'silver', 'gold'].includes(achievement.tier), `bad tier on ${achievement.id}`);
    assert.equal(typeof achievement.check, 'function');
  }
});

test('solving lab exercises unlocks the lab badges and raises the level', () => {
  const profile = buildProfile({ labSolved: 15, labTotal: 20 });
  assert.ok(profile.xp >= 150);
  const unlocked = profile.achievements.filter(a => a.unlocked).map(a => a.id);
  assert.ok(unlocked.includes('first-steps'));
  assert.ok(unlocked.includes('lab-apprentice'));
  assert.ok(unlocked.includes('lab-crafter'));
  assert.ok(!unlocked.includes('lab-master'), '15 of 20 is not every exercise');
});

test('solving every lab exercise unlocks the gold lab badge', () => {
  const profile = buildProfile({ labSolved: 20, labTotal: 20 });
  assert.ok(profile.achievements.find(a => a.id === 'lab-master').unlocked);
});

test('a lab total of zero never counts as finishing the lab', () => {
  const profile = buildProfile({ labSolved: 0, labTotal: 0 });
  assert.equal(profile.achievements.find(a => a.id === 'lab-master').unlocked, false);
});

test('XP comes from every source the site tracks', () => {
  const perUnit = id => XP_SOURCES.find(source => source.id === id).perUnit;
  const profile = buildProfile({ labSolved: 2, aiSolved: 1, quizBest5: 5, snakeBest: 10, gridworksCities: 1 });
  const expected = 2 * perUnit('lab') + 1 * perUnit('ai-lab') + 5 * perUnit('quiz') + 10 * perUnit('arcade') + 1 * perUnit('gridworks');
  assert.equal(profile.xp, expected);
});

test('the achievement count badges count themselves consistently', () => {
  const profile = buildProfile({ labSolved: 5, aiSolved: 5, aiRuns: 1, quizBest5: 5, quizBest30: 30 });
  const unlockedCount = profile.achievements.filter(a => a.unlocked).length;
  assert.equal(profile.unlockedCount, unlockedCount);
  const explorer = profile.achievements.find(a => a.id === 'explorer');
  assert.equal(explorer.unlocked, unlockedCount >= 5);
});

test('a visitor with everything unlocked reaches the completionist badge', () => {
  const profile = buildProfile({
    labSolved: 30, labTotal: 30, aiSolved: 20, aiRuns: 5,
    quizBest5: 5, quizBest20: 20, quizBest30: 30,
    snakeBest: 900, surfBest: 400, puzzleBest: 4096, racerBest: 500,
    gridworksCities: 6, gridworksChapters: 4
  });
  assert.equal(profile.unlockedCount, ACHIEVEMENTS.length);
  assert.equal(profile.achievements.find(a => a.id === 'completionist').unlocked, true);
  assert.equal(profile.level.level, 7);
});

test('unlocked achievements are listed gold first', () => {
  const profile = buildProfile({ labSolved: 20, labTotal: 20, aiRuns: 1 });
  const tiers = unlockedAchievements(profile).map(a => a.tier);
  const order = { gold: 0, silver: 1, bronze: 2 };
  for (let i = 1; i < tiers.length; i++) assert.ok(order[tiers[i - 1]] <= order[tiers[i]], 'tiers out of order');
});

test('the next achievement is the closest one that is still locked', () => {
  const profile = buildProfile({ labSolved: 0 });
  assert.equal(nextAchievement(profile).id, 'first-steps');
  // With one exercise solved the lab badge needs four more of five, which is a
  // smaller gap than the single AI run but a smaller one than nothing else.
  const further = buildProfile({ labSolved: 1 });
  assert.equal(nextAchievement(further).id, 'lab-apprentice');
  // Two badges in hand puts the count-based badge within reach.
  const later = buildProfile({ labSolved: 1, aiRuns: 1 });
  assert.equal(nextAchievement(later).id, 'explorer');
});

test('a fully unlocked profile has no next achievement', () => {
  const profile = buildProfile({
    labSolved: 30, labTotal: 30, aiSolved: 20, aiRuns: 5,
    quizBest5: 5, quizBest20: 20, quizBest30: 30,
    snakeBest: 900, surfBest: 400, puzzleBest: 4096, racerBest: 500,
    gridworksCities: 6, gridworksChapters: 4
  });
  assert.equal(nextAchievement(profile), null);
});

test('the levels are ordered and each one costs more than the last', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].level === LEVELS[i - 1].level + 1, 'levels must be consecutive');
    assert.ok(LEVELS[i].xp > LEVELS[i - 1].xp, 'each level must cost more');
  }
});
