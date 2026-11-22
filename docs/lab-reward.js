/**
 * The reward for a correct answer.
 *
 * A solved exercise pays out coins: a burst of pixel coins flies up from
 * the button, the total is counted up, and the panel tells the learner what
 * they just earned.
 *
 * House rules: every DOM access happens inside the init body; the helpers
 * below are pure so they can be tested under node.
 */

/** The coin faces, drawn as text. */
export const COIN_FACES = ['★', '✦', '✧', '●'];

/**
 * The lines of the coin burst.
 *
 * Each entry is a coin and where it goes. The values are percentages of the
 * panel, so the burst fits whatever size the panel is.
 */
export function buildBurst(count = 12) {
  const coins = [];
  for (let index = 0; index < count; index += 1) {
    // The angle spreads the coins over a wide arc so they do not all travel
    // the same way.
    const angle = -160 + (320 / Math.max(1, count - 1)) * index;
    const distance = 42 + ((index * 37) % 46);
    coins.push({
      face: COIN_FACES[index % COIN_FACES.length],
      x: Math.round(Math.cos((angle * Math.PI) / 180) * distance),
      y: Math.round(Math.sin((angle * Math.PI) / 180) * distance),
      delay: Math.round((index % 6) * 60),
      spin: ((index % 2 ? 1 : -1) * (180 + index * 24))
    });
  }
  return coins;
}

/**
 * The text that tells the learner what they earned.
 *
 * The wording names the exercise, the XP and the new total, so the reward
 * is never a number without a reason.
 */
export function rewardText(exercise, xp, total) {
  const name = exercise?.title || 'Exercise';
  const points = Number.isFinite(xp) ? xp : 0;
  const earned = Number.isFinite(total) ? total : 0;
  return `Correct — ${name} solved. +${points} XP, ${earned} XP in total.`;
}

/**
 * The stages of the celebration, in order.
 *
 * The animation is a short sequence rather than one long move, so the
 * eye follows the coins out and then the total settles.
 */
export const CELEBRATION_STAGES = ['solve', 'coins', 'count'];

export function initLabReward(root = document) {
  const panel = root.querySelector?.('[data-lab-reward]');
  const coinsBox = root.querySelector?.('[data-lab-reward-coins]');
  const textBox = root.querySelector?.('[data-lab-reward-text]');
  if (!panel) return null;

  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  let timer = null;

  function clear() {
    if (timer) { globalThis.clearTimeout(timer); timer = null; }
  }

  function hide() {
    clear();
    panel.hidden = true;
    panel.removeAttribute('data-stage');
    if (coinsBox) coinsBox.textContent = '';
  }

  /**
   * Count a number up, so the total climbs rather than snapping.
   */
  function countUp(from, to, duration) {
    if (reduced()) {
      if (textBox) textBox.textContent = rewardText(state.exercise, state.xp, to);
      return;
    }
    const start = globalThis.performance?.now?.() ?? 0;
    const step = now => {
      const elapsed = now - start;
      const ratio = duration ? Math.min(1, elapsed / duration) : 1;
      // Ease out, so the last few pixels slow down.
      const eased = 1 - Math.pow(1 - ratio, 3);
      const shown = Math.round(from + (to - from) * eased);
      if (textBox) textBox.textContent = rewardText(state.exercise, state.xp, shown);
      if (ratio < 1) timer = globalThis.requestAnimationFrame(step);
      else timer = null;
    };
    timer = globalThis.requestAnimationFrame(step);
  }

  const state = { exercise: null, xp: 0 };

  function show(exercise, xp, total) {
    clear();
    state.exercise = exercise;
    state.xp = xp;
    panel.hidden = false;
    panel.dataset.stage = 'solve';

    if (coinsBox) {
      coinsBox.textContent = '';
      for (const coin of buildBurst(12)) {
        const element = document.createElement('span');
        element.className = 'lab-coin';
        element.textContent = coin.face;
        element.style.setProperty('--coin-x', coin.x + 'px');
        element.style.setProperty('--coin-y', coin.y + 'px');
        element.style.setProperty('--coin-delay', coin.delay + 'ms');
        element.style.setProperty('--coin-spin', coin.spin + 'deg');
        coinsBox.append(element);
      }
    }

    if (textBox) textBox.textContent = rewardText(exercise, xp, total);

    // The stage moves on so the CSS can change the animation for each beat.
    const stages = CELEBRATION_STAGES;
    let index = 0;
    const advance = () => {
      index += 1;
      if (index >= stages.length) {
        panel.dataset.stage = 'done';
        timer = null;
        return;
      }
      panel.dataset.stage = stages[index];
      timer = globalThis.setTimeout(advance, reduced() ? 60 : 520);
    };
    timer = globalThis.setTimeout(advance, reduced() ? 60 : 380);
  }

  return { show, hide, state };
}
