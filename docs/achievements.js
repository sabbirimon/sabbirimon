/**
 * The visitor's progress across the whole site, in one place.
 *
 * The site already tracks progress in several places — the code lab, the AI lab,
 * the quiz, the arcade games and the Gridworks campaign. Each of them keeps its
 * own localStorage key because each was built alone. This module reads them all
 * and turns them into one profile: a level, a set of badges, and a progress bar.
 *
 * Nothing here talks to a server. A visitor who clears their browser storage
 * loses their profile, which is the honest outcome for a site with no backend.
 */

/** Every achievement the site can award. */
export const ACHIEVEMENTS = [
  {
    id: 'first-steps',
    name: 'First steps',
    note: 'Solve your first exercise in the code lab.',
    icon: '★',
    tier: 'bronze',
    check: stats => stats.labSolved >= 1
  },
  {
    id: 'lab-apprentice',
    name: 'Lab apprentice',
    note: 'Solve 5 code lab exercises.',
    icon: '✎',
    tier: 'bronze',
    check: stats => stats.labSolved >= 5
  },
  {
    id: 'lab-crafter',
    name: 'Lab crafter',
    note: 'Solve 15 code lab exercises.',
    icon: '✦',
    tier: 'silver',
    check: stats => stats.labSolved >= 15
  },
  {
    id: 'lab-master',
    name: 'Lab master',
    note: 'Solve every code lab exercise.',
    icon: '♛',
    tier: 'gold',
    check: stats => stats.labTotal > 0 && stats.labSolved >= stats.labTotal
  },
  {
    id: 'pythonist',
    name: 'Pythonist',
    note: 'Run your first Python program in the AI lab.',
    icon: '◈',
    tier: 'bronze',
    check: stats => stats.aiRuns >= 1
  },
  {
    id: 'ai-apprentice',
    name: 'AI apprentice',
    note: 'Solve 5 AI lab exercises.',
    icon: '⟡',
    tier: 'bronze',
    check: stats => stats.aiSolved >= 5
  },
  {
    id: 'ai-architect',
    name: 'AI architect',
    note: 'Solve 15 AI lab exercises.',
    icon: '⌬',
    tier: 'silver',
    check: stats => stats.aiSolved >= 15
  },
  {
    id: 'quiz-rookie',
    name: 'Quiz rookie',
    note: 'Finish the 5-question mini round.',
    icon: '?',
    tier: 'bronze',
    check: stats => stats.quizBest5 >= 5
  },
  {
    id: 'quiz-sharp',
    name: 'Quiz sharp',
    note: 'Score full marks on the 5-question mini round.',
    icon: '!',
    tier: 'silver',
    check: stats => stats.quizBest5 >= 5 && stats.quizBest5 === stats.quizBest5
  },
  {
    id: 'quiz-master',
    name: 'Quiz master',
    note: 'Score full marks on the full 30-question quest.',
    icon: '♔',
    tier: 'gold',
    check: stats => stats.quizBest30 >= 30
  },
  {
    id: 'snake-starts',
    name: 'Snake starts',
    note: 'Score 100 in Snake.',
    icon: '≡',
    tier: 'bronze',
    check: stats => stats.snakeBest >= 100
  },
  {
    id: 'snake-serpent',
    name: 'Serpent',
    note: 'Score 500 in Snake.',
    icon: '⌁',
    tier: 'silver',
    check: stats => stats.snakeBest >= 500
  },
  {
    id: 'surfer',
    name: 'Surfer',
    note: 'Score 100 in Pixel Surf.',
    icon: '≈',
    tier: 'bronze',
    check: stats => stats.surfBest >= 100
  },
  {
    id: 'merge-master',
    name: 'Merge master',
    note: 'Reach the 2048 tile in 2048.',
    icon: '▦',
    tier: 'silver',
    check: stats => stats.puzzleBest >= 2048
  },
  {
    id: 'racer',
    name: 'Rally driver',
    note: 'Score 100 in IMON Rally.',
    icon: '⛊',
    tier: 'bronze',
    check: stats => stats.racerBest >= 100
  },
  {
    id: 'city-builder',
    name: 'City builder',
    note: 'Restore a city in the Gridworks campaign.',
    icon: '⌂',
    tier: 'silver',
    check: stats => stats.gridworksCities >= 1
  },
  {
    id: 'campaigner',
    name: 'Campaigner',
    note: 'Complete a Gridworks chapter.',
    icon: '⚑',
    tier: 'gold',
    check: stats => stats.gridworksChapters >= 1
  },
  {
    id: 'explorer',
    name: 'Explorer',
    note: 'Unlock 5 achievements.',
    icon: '✧',
    tier: 'silver',
    check: stats => stats.unlocked >= 5
  },
  {
    id: 'completionist',
    name: 'Completionist',
    note: 'Unlock 12 achievements.',
    icon: '❖',
    tier: 'gold',
    check: stats => stats.unlocked >= 12
  }
];

/**
 * The level thresholds. Each level needs a total XP to be reached; the level is
 * the last threshold the XP clears.
 */
export const LEVELS = [
  { level: 1, name: 'Newcomer', xp: 0 },
  { level: 2, name: 'Apprentice', xp: 50 },
  { level: 3, name: 'Practitioner', xp: 150 },
  { level: 4, name: 'Builder', xp: 300 },
  { level: 5, name: 'Craftsman', xp: 550 },
  { level: 6, name: 'Architect', xp: 900 },
  { level: 7, name: 'Master', xp: 1400 }
];

/** The level a given XP total reaches. */
export function levelForXp(xp) {
  const total = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let reached = LEVELS[0];
  for (const entry of LEVELS) if (total >= entry.xp) reached = entry;
  return reached;
}

/** How far through the current level the visitor is, and how far to the next. */
export function levelProgress(xp) {
  const total = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const current = levelForXp(total);
  const index = LEVELS.indexOf(current);
  const next = LEVELS[index + 1] || null;
  if (!next) return { current, next: null, into: 1, span: 1, percent: 100 };
  const span = next.xp - current.xp;
  const into = total - current.xp;
  return { current, next, into, span, percent: Math.min(100, Math.max(0, Math.round((into / span) * 100))) };
}

/**
 * The XP each area of the site awards. Lab exercises already carry their own XP
 * value, so the lab contribution is that total rather than a per-exercise guess.
 */
export const XP_SOURCES = [
  { id: 'lab', label: 'Code lab', perUnit: 10 },
  { id: 'ai-lab', label: 'AI lab', perUnit: 15 },
  { id: 'quiz', label: 'Daily quiz', perUnit: 4 },
  { id: 'arcade', label: 'Arcade', perUnit: 2 },
  { id: 'gridworks', label: 'Gridworks', perUnit: 25 }
];

/**
 * Turns the raw counts into a single profile: the level, the XP, and which
 * achievements are unlocked.
 *
 * Two of the achievements are about the achievement count itself, so the count
 * and the checks depend on each other. That circularity is resolved by
 * iterating until the count settles rather than guessing once.
 */
export function buildProfile(stats) {
  const safe = {
    labSolved: 0, labTotal: 0, aiSolved: 0, aiTotal: 0, aiRuns: 0,
    quizBest5: 0, quizBest20: 0, quizBest30: 0,
    snakeBest: 0, surfBest: 0, puzzleBest: 0, racerBest: 0,
    gridworksCities: 0, gridworksChapters: 0,
    ...(stats || {})
  };

  const xp =
    safe.labSolved * XP_SOURCES.find(s => s.id === 'lab').perUnit +
    safe.aiSolved * XP_SOURCES.find(s => s.id === 'ai-lab').perUnit +
    Math.floor((safe.quizBest5 + safe.quizBest20 + safe.quizBest30) * XP_SOURCES.find(s => s.id === 'quiz').perUnit) +
    Math.floor((safe.snakeBest + safe.surfBest + safe.puzzleBest + safe.racerBest) * XP_SOURCES.find(s => s.id === 'arcade').perUnit) +
    safe.gridworksCities * XP_SOURCES.find(s => s.id === 'gridworks').perUnit;

  const unlocked = resolveUnlocked(safe);
  const counted = { ...safe, unlocked: unlocked.size };

  return {
    xp,
    level: levelForXp(xp),
    progress: levelProgress(xp),
    stats: counted,
    achievements: ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      unlocked: unlocked.has(achievement.id)
    })),
    unlockedCount: unlocked.size,
    totalCount: ACHIEVEMENTS.length
  };
}

/**
 * Works out which achievements are unlocked when two of them are defined in
 * terms of how many are unlocked.
 *
 * The count-based badges ('Explorer' and 'Completionist') make this circular:
 * the count depends on them and they depend on the count. Iterating from a
 * guess converges in a couple of rounds, and the loop stops as soon as the
 * count stops moving.
 */
function resolveUnlocked(safe) {
  let count = 0;
  let unlocked = new Set();
  for (let round = 0; round < ACHIEVEMENTS.length + 1; round++) {
    const next = new Set();
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.check({ ...safe, unlocked: count })) next.add(achievement.id);
    }
    if (next.size === count && [...next].every(id => unlocked.has(id))) {
      unlocked = next;
      break;
    }
    unlocked = next;
    count = next.size;
  }
  return unlocked;
}

/** The achievements a profile has unlocked, newest tier first for display. */
export function unlockedAchievements(profile) {
  const order = { gold: 0, silver: 1, bronze: 2 };
  return profile.achievements
    .filter(achievement => achievement.unlocked)
    .sort((a, b) => order[a.tier] - order[b.tier]);
}

/** The next achievement the visitor is closest to, with how far away it is. */
export function nextAchievement(profile) {
  const locked = profile.achievements.filter(achievement => !achievement.unlocked);
  if (!locked.length) return null;
  // The achievements track progress in different units — exercises, runs, points,
  // cities — so the raw gaps are not comparable. Each gap is expressed as a
  // fraction of what the achievement asks for, which puts them on one scale.
  const stats = profile.stats;
  const distance = achievement => {
    switch (achievement.id) {
      case 'first-steps': return (1 - stats.labSolved) / 1;
      case 'lab-apprentice': return (5 - stats.labSolved) / 5;
      case 'lab-crafter': return (15 - stats.labSolved) / 15;
      case 'lab-master': return stats.labTotal > 0 ? (stats.labTotal - stats.labSolved) / stats.labTotal : Infinity;
      case 'pythonist': return (1 - stats.aiRuns) / 1;
      case 'ai-apprentice': return (5 - stats.aiSolved) / 5;
      case 'ai-architect': return (15 - stats.aiSolved) / 15;
      case 'quiz-rookie': return (5 - stats.quizBest5) / 5;
      case 'quiz-sharp': return (5 - stats.quizBest5) / 5;
      case 'quiz-master': return (30 - stats.quizBest30) / 30;
      case 'snake-starts': return (100 - stats.snakeBest) / 100;
      case 'snake-serpent': return (500 - stats.snakeBest) / 500;
      case 'surfer': return (100 - stats.surfBest) / 100;
      case 'merge-master': return (2048 - stats.puzzleBest) / 2048;
      case 'racer': return (100 - stats.racerBest) / 100;
      case 'city-builder': return (1 - stats.gridworksCities) / 1;
      case 'campaigner': return (1 - stats.gridworksChapters) / 1;
      case 'explorer': return (5 - stats.unlocked) / 5;
      case 'completionist': return (12 - stats.unlocked) / 12;
      default: return Infinity;
    }
  };
  return locked
    .map(achievement => ({ achievement, distance: Math.max(0, distance(achievement)) }))
    .sort((a, b) => a.distance - b.distance)[0].achievement;
}
