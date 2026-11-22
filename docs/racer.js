/* IMON RALLY: an original, dependency-free top-down pixel racer. */
import { playSound } from './audio.js';

export const RACER_WIDTH = 720;
export const RACER_HEIGHT = 480;
export const ROAD_LEFT = 110;
export const ROAD_RIGHT = 610;
const PLAYER_Y = 365;
const BEST_KEY = 'imon-rally-best-v1';
const KEY_ACTION = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'boost', w: 'boost', W: 'boost', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'boost' };

export function createRacerState() {
  return { x: 360, y: PLAYER_Y, lives: 3, score: 0, distance: 0, coins: 0, elapsed: 0, speed: 0, roadOffset: 0, spawnIn: 1.1, gap: 2, invulnerable: 0, boost: 100, boostLocked: false, boosting: false, entities: [], status: 'ready' };
}

export function spawnRacerRow(state, random = Math.random) {
  // Traffic travels in rows. Two neighboring lanes are always left clear, and
  // that corridor shifts at most one lane between rows, even at maximum pace.
  state.gap = Math.max(0, Math.min(3, state.gap + Math.floor(random() * 3) - 1));
  for (let lane = 0; lane < 5; lane++) {
    if (lane === state.gap || lane === state.gap + 1 || random() > 0.85) continue;
    state.entities.push({ type: 'car', x: ROAD_LEFT + lane * 100 + 50, y: -65, w: 34, h: 58, color: Math.floor(random() * 4) });
  }
  state.entities.push({ type: 'coin', x: ROAD_LEFT + state.gap * 100 + 100, y: -125, w: 20, h: 20 });
}

export function stepRacer(state, input = {}, dt, random = Math.random) {
  if (state.status !== 'running') return [];
  dt = Math.max(0, Math.min(0.05, dt));
  const events = [];
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  if (!input.boost) state.boostLocked = false;
  state.boosting = Boolean(input.boost && !input.brake && !state.boostLocked && state.boost > 0);
  state.boost = Math.max(0, Math.min(100, state.boost + (state.boosting ? -32 : 14) * dt));
  if (state.boosting && state.boost === 0) state.boostLocked = true;
  const baseSpeed = Math.min(340, 185 + state.elapsed * 1.8);
  state.speed = baseSpeed * (state.boosting ? 1.45 : 1) * (input.brake ? 0.6 : 1);
  state.elapsed += dt;
  state.distance += state.speed * dt / 15;
  state.roadOffset += state.speed * dt;

  const steer = 390 * dt;
  let desiredX = state.x;
  if (Number.isFinite(input.targetX)) desiredX += Math.max(-steer, Math.min(steer, input.targetX - state.x));
  else desiredX += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * steer;
  state.x = Math.max(ROAD_LEFT + 19, Math.min(ROAD_RIGHT - 19, desiredX));

  function hit() {
    if (state.invulnerable > 0 || state.status !== 'running') return;
    state.lives--; state.invulnerable = 1.65; events.push('hit');
    if (state.lives <= 0) { state.status = 'over'; state.boosting = false; events.push('crash'); }
  }
  if (desiredX !== state.x) hit();

  state.spawnIn -= dt;
  if (state.status === 'running' && state.spawnIn <= 0) {
    spawnRacerRow(state, random);
    state.spawnIn = Math.max(1.05, 1.65 - state.elapsed * 0.004);
  }
  for (const entity of state.entities) {
    entity.y += state.speed * 0.78 * dt;
    if (entity.collected || state.status !== 'running') continue;
    const overlap = Math.abs(entity.x - state.x) < entity.w / 2 + 12 && Math.abs(entity.y - state.y) < entity.h / 2 + 22;
    if (!overlap) continue;
    if (entity.type === 'coin') { entity.collected = true; state.coins++; events.push('coin'); }
    else if (state.invulnerable === 0) { entity.collected = true; hit(); }
  }
  state.entities = state.entities.filter(entity => !entity.collected && entity.y < RACER_HEIGHT + 85);
  state.score = Math.floor(state.distance) + state.coins * 30;
  return events;
}

function readBest() {
  try { const value = Number(localStorage.getItem(BEST_KEY)); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
}
function saveBest(value) { try { localStorage.setItem(BEST_KEY, String(value)); document.dispatchEvent(new CustomEvent('imon:progress', { detail: { key: BEST_KEY, value } })); } catch { /* Racing works without storage. */ } }

export function initRacer() {
  if (document.getElementById('racer-modal')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'racer-modal'; dialog.className = 'racer-modal';
  dialog.setAttribute('aria-labelledby', 'racer-title');
  dialog.innerHTML = `<div class="racer-shell">
    <header class="racer-header"><div><span class="racer-eyebrow">IMON ARCADE / KEEP YOUR LINE</span><h2 id="racer-title">IMON RALLY</h2></div><button type="button" class="racer-close" aria-label="Close IMON Rally">×</button></header>
    <div class="racer-hud"><div><span>SCORE</span><strong id="racer-score">0000</strong></div><div><span>BEST</span><strong id="racer-best">0000</strong></div><div><span>LIVES</span><strong id="racer-lives" aria-label="3 lives">♥ ♥ ♥</strong></div><span id="racer-state">READY</span></div>
    <div class="racer-board-wrap"><canvas id="racer-canvas" width="720" height="480" tabindex="0" aria-label="IMON Rally road. Left and right arrows steer. Up or Space boosts. Down brakes. P pauses." aria-describedby="racer-help">IMON Rally needs a browser with Canvas support.</canvas><div class="racer-overlay"><span class="racer-flag" aria-hidden="true">⚑</span><h3 id="racer-message">Your next great escape.</h3><p id="racer-message-copy">Dodge traffic. Collect coins. Keep all four wheels on the road.</p><button type="button" class="racer-start racer-primary">START YOUR ENGINE →</button></div></div>
    <div class="racer-telemetry"><div><span id="racer-distance">0 m</span><span id="racer-pace">CRUISING</span></div><label for="racer-boost-meter"><span>BOOST</span><progress id="racer-boost-meter" max="100" value="100">100%</progress></label></div>
    <div class="racer-toolbar"><button type="button" class="racer-toggle racer-primary">Start race</button><button type="button" class="racer-restart racer-secondary">Restart ↻</button></div>
    <div class="racer-bottom"><p id="racer-help"><kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> steer<br><kbd>↑</kbd> <kbd>W</kbd> / <kbd>Space</kbd> boost<br><kbd>↓</kbd> <kbd>S</kbd> brake · <kbd>P</kbd> pause<br>Drag the road to steer. <kbd>Esc</kbd> closes.</p><div class="racer-pad" role="group" aria-label="Driving controls"><button type="button" data-racer-control="left" aria-label="Steer left">←</button><button type="button" data-racer-control="right" aria-label="Steer right">→</button><button type="button" data-racer-control="boost" class="racer-boost-button" aria-label="Hold to boost">BOOST ↑</button><button type="button" data-racer-control="brake" aria-label="Hold to brake">BRAKE ↓</button></div></div>
    <details class="racer-rules"><summary>Rally guide</summary><p>Steer around traffic and collect coins for <strong>30 bonus points</strong>. Traffic gets faster the longer you last. Two neighboring lanes stay open in each traffic row.</p><p>You have three lives. Hitting a car or the road edge costs one. Your car briefly becomes invulnerable after a hit. Hold boost for extra speed; release it to recharge. Braking helps with tight turns.</p><p>Your best score stays on this device when browser storage is available. The game automatically pauses when you leave the tab.</p></details>
    <p class="racer-live" role="status" aria-live="polite" aria-atomic="true"></p>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('#racer-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = $('.racer-overlay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const held = { left: new Set(), right: new Set(), brake: new Set(), boost: new Set() };
  const pulseTimers = {};
  let state = createRacerState(), best = readBest(), opener, frame = 0, last = 0, oldOverflow = '', oldOverscroll = '', drag = null;
  const announce = text => { $('.racer-live').textContent = text; };
  const setInput = (action, source, active) => { if (held[action]) active ? held[action].add(source) : held[action].delete(source); };
  function release() {
    Object.values(held).forEach(set => set.clear());
    Object.values(pulseTimers).forEach(clearTimeout);
    dialog.querySelectorAll('[data-racer-control]').forEach(button => button.classList.remove('is-pressed'));
    drag = null;
  }
  function updateHud() {
    if (state.score > best) { best = state.score; saveBest(best); }
    $('#racer-score').textContent = String(state.score).padStart(4, '0');
    $('#racer-best').textContent = String(best).padStart(4, '0');
    $('#racer-lives').textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '♥' : '♡').join(' ');
    $('#racer-lives').setAttribute('aria-label', `${state.lives} ${state.lives === 1 ? 'life' : 'lives'}`);
    $('#racer-state').textContent = { ready: 'READY', running: 'RACING', paused: 'PAUSED', over: 'FINISHED' }[state.status];
    $('#racer-distance').textContent = `${Math.floor(state.distance)} m`;
    $('#racer-pace').textContent = state.boosting ? 'BOOSTING!' : held.brake.size ? 'BRAKING' : state.boostLocked ? 'RELEASE TO RECHARGE' : 'CRUISING';
    $('#racer-boost-meter').value = state.boost;
    $('.racer-toggle').textContent = state.status === 'running' ? 'Pause' : state.status === 'paused' ? 'Resume' : state.status === 'over' ? 'Race again' : 'Start race';
  }
  function showOverlay(title, description, button) {
    $('#racer-message').textContent = title; $('#racer-message-copy').textContent = description;
    $('.racer-start').textContent = button; overlay.hidden = false;
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0; last = 0; release(); state = createRacerState();
    showOverlay('Your next great escape.', 'Dodge traffic. Collect coins. Keep all four wheels on the road.', 'START YOUR ENGINE →');
    updateHud(); draw();
  }
  function start() {
    if (state.status === 'over') reset();
    if (!ctx) { announce('Canvas is unavailable in this browser.'); return; }
    state.status = 'running'; last = 0; overlay.hidden = true;
    updateHud(); canvas.focus({ preventScroll: true }); playSound('start'); announce('Race started. Left and right steer. Space boosts. P pauses.');
    cancelAnimationFrame(frame); frame = requestAnimationFrame(loop);
  }
  function pause() {
    if (state.status !== 'running') return;
    state.status = 'paused'; state.boosting = false; cancelAnimationFrame(frame); frame = 0; last = 0; release();
    showOverlay('A quick pit stop.', 'Your race is right where you left it.', 'BACK TO THE ROAD →'); updateHud(); announce('Race paused.');
  }
  function toggle() { state.status === 'running' ? pause() : start(); }
  function finish() {
    cancelAnimationFrame(frame); frame = 0; release(); updateHud();
    showOverlay('What a ride.', `${Math.floor(state.distance)} metres. ${state.coins} coins. Score ${state.score}. Your next best is one more race away.`, 'RACE AGAIN →');
    announce(`Race finished. Score ${state.score}. Best ${best}.`);
  }
  function loop(time) {
    if (!dialog.open || state.status !== 'running') return;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0; last = time;
    const input = Object.fromEntries(Object.entries(held).map(([key, set]) => [key, set.size > 0]));
    if (drag) input.targetX = drag.x;
    const events = stepRacer(state, input, dt);
    events.forEach(playSound);
    if (events.includes('hit') && !events.includes('crash')) announce(`Collision. ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left.`);
    draw(); updateHud();
    if (state.status === 'over') { finish(); return; }
    frame = requestAnimationFrame(loop);
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function car(x, y, color, player = false) {
    rect(x - 20, y - 21, 7, 14, '#060b17'); rect(x + 13, y - 21, 7, 14, '#060b17');
    rect(x - 20, y + 12, 7, 14, '#060b17'); rect(x + 13, y + 12, 7, 14, '#060b17');
    rect(x - 14, y - 30, 28, 60, color); rect(x - 17, y - 24, 34, 49, color);
    rect(x - 9, y - 17, 18, 13, '#173349'); rect(x - 7, y - 15, 14, 3, '#80b6c5');
    rect(x - 9, y + 10, 18, 9, '#20354a'); rect(x - 5, y - 2, 10, 10, player ? '#fff1af' : '#f0d6d347');
    rect(x - 13, y - 28, 7, 4, '#f8edb0'); rect(x + 6, y - 28, 7, 4, '#f8edb0');
    rect(x - 13, y + 25, 6, 4, '#f07f85'); rect(x + 7, y + 25, 6, 4, '#f07f85');
    if (player && state.boosting) {
      const flame = reduced.matches ? 10 : 10 + Math.floor(state.elapsed * 20) % 3 * 5;
      rect(x - 11, y + 31, 6, flame, '#f7a659'); rect(x + 5, y + 31, 6, flame, '#f7a659');
      rect(x - 9, y + 31, 2, flame - 3, '#fff0a3'); rect(x + 7, y + 31, 2, flame - 3, '#fff0a3');
    }
  }
  function draw() {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, 720, 480, '#102d35');
    const offset = reduced.matches ? 0 : state.roadOffset;
    for (let i = -1; i < 6; i++) {
      const y = i * 125 + offset % 125;
      const alternate = Math.abs(i) % 2;
      rect(12, y, 65, 72, alternate ? '#28374d' : '#352f4b'); rect(17, y + 5, 55, 62, '#414565');
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) rect(24 + col * 15, y + 14 + row * 16, 6, 7, (row + col + i) % 3 ? '#9a94ba' : '#ebcc86');
      rect(662, y + 54, 6, 35, '#6d5960'); rect(645, y + 40, 40, 30, '#347063'); rect(651, y + 34, 28, 40, '#438f75'); rect(650, y + 43, 13, 9, '#8bc79a');
      rect(91, y + 34, 5, 38, '#879a9d'); rect(86, y + 30, 15, 6, '#efd796');
      rect(624, y + 91, 5, 30, '#879a9d'); rect(619, y + 87, 15, 6, '#efd796');
    }
    rect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, 480, '#232a40');
    rect(ROAD_LEFT - 8, 0, 8, 480, '#bd96a1'); rect(ROAD_RIGHT, 0, 8, 480, '#bd96a1');
    for (let y = -30; y < 510; y += 50) {
      const drawY = y + offset % 50;
      rect(ROAD_LEFT - 8, drawY, 8, 25, '#eee3bf'); rect(ROAD_RIGHT, drawY, 8, 25, '#eee3bf');
    }
    rect(ROAD_LEFT + 8, 0, 3, 480, '#c9a968'); rect(ROAD_RIGHT - 11, 0, 3, 480, '#c9a968');
    for (let lane = 1; lane < 5; lane++) for (let y = -70; y < 550; y += 84) rect(ROAD_LEFT + lane * 100 - 2, y + offset % 84, 4, 36, '#8a93ac');
    for (const entity of state.entities) {
      if (entity.type === 'car') car(entity.x, entity.y, ['#bba0e3', '#74b8cc', '#e496a4', '#a4c77d'][entity.color]);
      else {
        rect(entity.x - 8, entity.y - 12, 16, 24, '#b88632'); rect(entity.x - 11, entity.y - 8, 22, 16, '#facc15');
        rect(entity.x - 6, entity.y - 8, 4, 13, '#fff2a0'); rect(entity.x + 2, entity.y - 6, 3, 12, '#aa6f29');
      }
    }
    if (!state.invulnerable || reduced.matches || Math.floor(state.elapsed * 8) % 2) car(state.x, state.y, '#facc15', true);
    if (state.invulnerable) {
      ctx.strokeStyle = '#ffe8a0'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(state.x - 25), state.y - 37, 50, 74);
    }
  }

  function open(trigger) {
    if (dialog.open) return;
    opener = trigger; reset();
    oldOverflow = document.body.style.overflow; oldOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none';
    dialog.showModal(); $('.racer-start').focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-game="racer"]');
    if (!trigger || dialog.contains(trigger)) return;
    event.preventDefault(); open(trigger);
  });
  $('.racer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(frame); frame = 0; last = 0; release();
    if (state.status === 'running') state.status = 'paused';
    document.body.style.overflow = oldOverflow; document.body.style.overscrollBehavior = oldOverscroll;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  $('.racer-start').addEventListener('click', start);
  $('.racer-toggle').addEventListener('click', toggle);
  $('.racer-restart').addEventListener('click', () => { reset(); announce('Race reset. Start when ready.'); $('.racer-start').focus({ preventScroll: true }); });
  dialog.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const control = event.target.closest('[data-racer-control]');
    if (control && (event.code === 'Space' || event.key === 'Enter')) {
      event.preventDefault();
      if (state.status === 'running') { setInput(control.dataset.racerControl, `key:${event.code}`, true); control.classList.add('is-pressed'); }
      return;
    }
    const action = KEY_ACTION[event.key];
    if (action) {
      if (event.code === 'Space' && event.target.tagName === 'BUTTON') return;
      event.preventDefault(); if (state.status === 'running') setInput(action, `key:${event.code}`, true);
    } else if ((event.key === 'p' || event.key === 'P') && !event.repeat) { event.preventDefault(); toggle(); }
  });
  document.addEventListener('keyup', event => {
    for (const set of Object.values(held)) set.delete(`key:${event.code}`);
    if (event.code === 'Space' || event.key === 'Enter') dialog.querySelectorAll('[data-racer-control]').forEach(button => button.classList.remove('is-pressed'));
  });
  const pad = $('.racer-pad');
  pad.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-racer-control]');
    if (!button || state.status !== 'running') return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    setInput(button.dataset.racerControl, `pointer:${event.pointerId}`, true); button.classList.add('is-pressed');
  });
  function releasePointer(event) {
    for (const set of Object.values(held)) set.delete(`pointer:${event.pointerId}`);
    event.target.closest('[data-racer-control]')?.classList.remove('is-pressed');
  }
  pad.addEventListener('pointerup', releasePointer); pad.addEventListener('pointercancel', releasePointer); pad.addEventListener('lostpointercapture', releasePointer);
  pad.addEventListener('click', event => {
    const button = event.target.closest('[data-racer-control]');
    if (!button || event.detail !== 0 || state.status !== 'running') return;
    const action = button.dataset.racerControl;
    clearTimeout(pulseTimers[action]); setInput(action, 'assistive', true);
    pulseTimers[action] = setTimeout(() => setInput(action, 'assistive', false), 180);
  });
  function roadX(event) { const bounds = canvas.getBoundingClientRect(); return (event.clientX - bounds.left) * RACER_WIDTH / bounds.width; }
  canvas.addEventListener('pointerdown', event => {
    if (state.status !== 'running' || !event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: roadX(event) }; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) drag.x = roadX(event); });
  const releaseDrag = event => { if (drag?.id === event.pointerId) drag = null; };
  canvas.addEventListener('pointerup', releaseDrag); canvas.addEventListener('pointercancel', releaseDrag); canvas.addEventListener('lostpointercapture', releaseDrag);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  reset();
}
