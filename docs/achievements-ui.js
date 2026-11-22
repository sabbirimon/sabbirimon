/**
 * Reads the progress the site keeps in localStorage and draws the profile.
 *
 * Every read is defensive: a visitor can have any subset of the keys, and a
 * tampered value must not break the page.
 */
import { buildProfile, nextAchievement, unlockedAchievements } from './achievements.js';

function read(store, key, fallback) {
  try {
    const raw = store.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readNumber(store, key, fallback = 0) {
  try {
    const raw = store.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** The counts that feed the profile, gathered from storage. */
export function collectStats(store = globalThis.localStorage) {
  if (!store) return {};
  const lab = read(store, 'imon-lab-progress-v1', {});
  const ai = read(store, 'imon-ai-lab-v1', read(store, 'imon-ai-lab', {}));
  const gridworks = read(store, 'imon-gridworks-progress-v1', {});
  const cities = read(store, 'imon-gridworks-cities-v1', {});

  const solvedCount = value => {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value.solved === 'object') return Object.keys(value.solved).length;
    if (Array.isArray(value?.solved)) return value.solved.length;
    return 0;
  };

  const arcadeBest = (prefix, suffix = '') => {
    const key = suffix ? `${prefix}${suffix}` : prefix;
    return readNumber(store, key, 0);
  };

  return {
    labSolved: solvedCount(lab),
    labTotal: Number(lab?.total) || 0,
    aiSolved: solvedCount(ai),
    aiTotal: Number(ai?.total) || 0,
    aiRuns: Number(ai?.runs) || 0,
    quizBest5: readNumber(store, 'imon-quiz-best-5', 0),
    quizBest20: readNumber(store, 'imon-quiz-best-20', 0),
    quizBest30: readNumber(store, 'imon-quiz-best-30', 0),
    snakeBest: Math.max(
      readNumber(store, 'sabbir-arcade-v1-snake-easy', 0),
      readNumber(store, 'sabbir-arcade-v1-snake-normal', 0),
      readNumber(store, 'sabbir-arcade-v1-snake-hard', 0)
    ),
    surfBest: Math.max(
      readNumber(store, 'sabbir-arcade-v1-surf-easy', 0),
      readNumber(store, 'sabbir-arcade-v1-surf-normal', 0),
      readNumber(store, 'sabbir-arcade-v1-surf-hard', 0)
    ),
    puzzleBest: readNumber(store, 'sabbir-2048-best-v1', 0),
    racerBest: readNumber(store, 'imon-rally-best-v1', 0),
    gridworksCities: Array.isArray(cities) ? cities.length : Object.keys(cities || {}).length,
    gridworksChapters: Object.keys(gridworks?.chapters || {}).length
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initAchievements(root = document) {
  const host = root.querySelector('#achievements');
  if (!host || host.dataset.achievementsReady) return null;
  host.dataset.achievementsReady = 'true';

  const stats = collectStats();
  const profile = buildProfile(stats);

  const levelLabel = root.querySelector('[data-ach-level]');
  const levelName = root.querySelector('[data-ach-level-name]');
  const xpLabel = root.querySelector('[data-ach-xp]');
  const bar = root.querySelector('[data-ach-bar]');
  const nextLabel = root.querySelector('[data-ach-next]');
  const countLabel = root.querySelector('[data-ach-count]');
  const grid = root.querySelector('#achievement-grid');

  if (levelLabel) levelLabel.textContent = String(profile.level.level).padStart(2, '0');
  if (levelName) levelName.textContent = profile.level.name;
  if (xpLabel) xpLabel.textContent = `${profile.xp} XP`;
  if (bar) {
    bar.max = 100;
    bar.value = profile.progress.percent;
    bar.setAttribute('aria-valuetext', `${profile.progress.percent}% towards level ${profile.progress.current.level}`);
  }
  if (countLabel) countLabel.textContent = `${profile.unlockedCount} of ${profile.totalCount} unlocked`;

  const upcoming = nextAchievement(profile);
  if (nextLabel) {
    nextLabel.textContent = upcoming
      ? (profile.progress.next
        ? `Next up: ${upcoming.name} — ${upcoming.note}`
        : `Next up: ${upcoming.name} — ${upcoming.note}`)
      : 'Every achievement unlocked. That is the whole map.';
  }

  if (grid) {
    grid.replaceChildren();
    const ordered = [...profile.achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const order = { gold: 0, silver: 1, bronze: 2 };
      return order[a.tier] - order[b.tier];
    });
    for (const achievement of ordered) {
      const item = element('li', `achievement achievement-${achievement.tier}${achievement.unlocked ? ' is-unlocked' : ' is-locked'}`);
      item.append(
        element('span', 'achievement-icon', achievement.unlocked ? achievement.icon : '·'),
        element('span', 'achievement-name', achievement.name),
        element('span', 'achievement-note', achievement.note)
      );
      if (!achievement.unlocked) item.setAttribute('aria-label', `${achievement.name}. Locked. ${achievement.note}`);
      grid.append(item);
    }
  }

  // The lab, the AI lab and the arcade all write to storage while the visitor
  // is on the page, so the profile is refreshed when the tab regains focus.
  const refresh = () => {
    const fresh = buildProfile(collectStats());
    if (levelLabel) levelLabel.textContent = String(fresh.level.level).padStart(2, '0');
    if (levelName) levelName.textContent = fresh.level.name;
    if (xpLabel) xpLabel.textContent = `${fresh.xp} XP`;
    if (bar) bar.value = fresh.progress.percent;
    if (countLabel) countLabel.textContent = `${fresh.unlockedCount} of ${fresh.totalCount} unlocked`;
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  document.addEventListener('imon:progress', refresh);

  return { profile, unlocked: unlockedAchievements(profile) };
}
