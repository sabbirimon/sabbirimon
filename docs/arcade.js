/* Original, dependency-free arcade games. Canvas artwork is drawn in code. */
import { playSound, setSound, isSoundEnabled } from './audio.js';
const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const KEY_DIRECTION = { ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left' };
const W = 720, H = 480;

export function placeSnakeFood(state, random = Math.random) {
  const occupied = new Set(state.body.map(p => `${p.x},${p.y}`));
  const free = [];
  for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) {
    if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  }
  return free.length ? free[Math.min(free.length - 1, Math.floor(random() * free.length))] : null;
}

export function createSnakeState(random = Math.random) {
  const state = { cols: 24, rows: 16, body: [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }], direction: 'right', queue: [], food: null, score: 0, status: 'ready' };
  state.food = placeSnakeFood(state, random);
  return state;
}

export function queueSnakeDirection(state, direction) {
  if (!DIRECTIONS[direction] || state.queue.length >= 2) return false;
  const previous = state.queue.at(-1) || state.direction;
  const [px, py] = DIRECTIONS[previous], [nx, ny] = DIRECTIONS[direction];
  if (previous === direction || (px + nx === 0 && py + ny === 0)) return false;
  state.queue.push(direction);
  return true;
}

export function stepSnake(state, random = Math.random) {
  if (state.status !== 'running') return 'idle';
  state.direction = state.queue.shift() || state.direction;
  const [dx, dy] = DIRECTIONS[state.direction];
  const head = { x: state.body[0].x + dx, y: state.body[0].y + dy };
  const eating = state.food && head.x === state.food.x && head.y === state.food.y;
  const collisionBody = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= state.cols || head.y < 0 || head.y >= state.rows || collisionBody.some(p => p.x === head.x && p.y === head.y)) {
    state.status = 'over';
    return 'crash';
  }
  state.body.unshift(head);
  if (!eating) state.body.pop();
  else {
    state.score += 10;
    state.food = placeSnakeFood(state, random);
    if (!state.food) { state.status = 'won'; return 'win'; }
    return 'eat';
  }
  return 'move';
}

export function createSurfState() {
  return { x: W / 2, y: 355, distance: 0, coins: 0, lives: 3, score: 0, elapsed: 0, spawnIn: 0.7, invulnerable: 0, entities: [], gap: 3, status: 'ready', wake: [] };
}

export function spawnSurfRow(state, random = Math.random) {
  // Two adjacent lanes always remain open; the safe corridor shifts at most one lane.
  state.gap = Math.max(0, Math.min(6, state.gap + Math.floor(random() * 3) - 1));
  for (let lane = 0; lane < 8; lane++) {
    if (lane === state.gap || lane === state.gap + 1) continue;
    if (random() > 0.76) continue;
    state.entities.push({ type: 'reef', x: lane * 90 + 45, y: -55, w: 42 + Math.floor(random() * 12), h: 40, variant: Math.floor(random() * 3) });
  }
  state.entities.push({ type: 'coin', x: state.gap * 90 + 90, y: -100, w: 19, h: 19 });
}

export function stepSurf(state, input, dt, difficulty = 'normal', random = Math.random) {
  if (state.status !== 'running') return [];
  dt = Math.min(0.05, Math.max(0, dt));
  const events = [];
  const base = { easy: 115, normal: 145, hard: 175 }[difficulty] || 145;
  const speed = Math.min(base + 120, base + state.elapsed * 1.7);
  state.elapsed += dt;
  state.distance += speed * dt / 15;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const magnitude = Math.hypot(dx, dy) || 1;
  state.x = Math.max(22, Math.min(W - 22, state.x + dx / magnitude * 310 * dt));
  state.y = Math.max(90, Math.min(H - 32, state.y + dy / magnitude * 265 * dt));
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    spawnSurfRow(state, random);
    state.spawnIn = Math.max(0.95, 1.7 - state.elapsed * 0.004);
  }
  for (const entity of state.entities) {
    entity.y += speed * dt;
    if (entity.collected) continue;
    const hit = Math.abs(entity.x - state.x) < entity.w / 2 + 9 && Math.abs(entity.y - state.y) < entity.h / 2 + 17;
    if (!hit) continue;
    if (entity.type === 'coin') { entity.collected = true; state.coins++; events.push('coin'); }
    else if (state.invulnerable === 0) {
      entity.collected = true;
      state.lives--;
      state.invulnerable = 1.8;
      events.push('hit');
      if (state.lives <= 0) { state.status = 'over'; events.push('crash'); break; }
    }
  }
  state.entities = state.entities.filter(e => !e.collected && e.y < H + 70);
  state.score = Math.floor(state.distance) + state.coins * 25;
  return events;
}

function safeRead(key) { try { return Math.max(0, Number(localStorage.getItem(key)) || 0); } catch { return 0; } }
function safeWrite(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* Games still work in private storage modes. */ } }

export function initArcade() {
  if (document.getElementById('arcade-modal')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'arcade-modal';
  dialog.className = 'arcade-modal';
  dialog.setAttribute('aria-labelledby', 'arcade-dialog-title');
  dialog.innerHTML = `<div class="arcade-shell">
    <header class="arcade-header"><div><span class="arcade-eyebrow">SABBIR'S POCKET ARCADE</span><h2 id="arcade-dialog-title">Pixel Snake</h2></div><button type="button" class="arcade-close" aria-label="Close game">×</button></header>
    <div class="arcade-hud"><div><span>SCORE</span><strong id="arcade-score">0000</strong></div><div><span>PERSONAL BEST</span><strong id="arcade-best">0000</strong></div><div class="arcade-life"><span id="arcade-detail-label">LENGTH</span><strong id="arcade-detail">03</strong></div><span class="arcade-state" id="arcade-state">READY</span></div>
    <div class="arcade-board"><canvas id="arcade-canvas" width="720" height="480" tabindex="0" aria-label="Game board. Use arrow keys or W A S D to move. Space pauses the game.">This game needs a browser with Canvas support. Use the direction buttons below to move.</canvas><div class="arcade-overlay"><span class="arcade-overlay-icon" aria-hidden="true">✦</span><h3 id="arcade-message">Small snake. Big ambition.</h3><p id="arcade-description">Collect the fruit. Grow your score. Mind the walls.</p><button type="button" class="arcade-start arcade-btn">LET'S PLAY <span aria-hidden="true">▶</span></button></div></div>
    <div class="arcade-toolbar"><div class="arcade-actions"><button type="button" class="arcade-toggle arcade-btn">Start game</button><button type="button" class="arcade-restart arcade-secondary">Restart</button></div><div class="arcade-settings"><label for="arcade-difficulty">Level <select id="arcade-difficulty"><option value="easy">Chill</option><option value="normal" selected>Classic</option><option value="hard">Turbo</option></select></label><button type="button" class="arcade-sound arcade-secondary" aria-pressed="false" aria-label="Turn game sound on">Sound off</button></div></div>
    <div class="arcade-bottom"><p id="arcade-help"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W A S D</kbd> to move<br><kbd>Space</kbd> pause · <kbd>Esc</kbd> close</p><div class="arcade-dpad" aria-label="Touch direction controls"><button type="button" data-direction="up" aria-label="Move up">↑</button><button type="button" data-direction="left" aria-label="Move left">←</button><button type="button" data-direction="down" aria-label="Move down">↓</button><button type="button" data-direction="right" aria-label="Move right">→</button></div><p class="arcade-save-note">YOUR BEST STAYS<br>ON THIS DEVICE <span aria-hidden="true">★</span></p></div>
    <p class="arcade-announcement" aria-live="polite" aria-atomic="true"></p>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('#arcade-canvas'), ctx = canvas.getContext('2d');
  const overlay = $('.arcade-overlay');
  const difficultySelect = $('#arcade-difficulty');
  const input = { up: false, right: false, down: false, left: false };
  const padPulseTimers = new Map();
  let game = 'snake', state, frame = 0, previousTime = 0, accumulator = 0, best = 0, difficulty = 'normal', trigger, swipe;
  let oldOverflow = '', oldOverscroll = '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = () => `sabbir-arcade-v1-${game}-${difficulty}`;
  const announce = text => { $('.arcade-announcement').textContent = text; };
  const release = () => {
    Object.keys(input).forEach(k => { input[k] = false; });
    padPulseTimers.forEach(timer => clearTimeout(timer));
    padPulseTimers.clear();
    dialog.querySelectorAll('.arcade-dpad .is-pressed').forEach(button => button.classList.remove('is-pressed'));
  };

  const beep = type => playSound(type);

  function updateHud() {
    $('#arcade-score').textContent = String(state.score).padStart(4, '0');
    if (state.score > best) { best = state.score; safeWrite(key(), best); }
    $('#arcade-best').textContent = String(best).padStart(4, '0');
    $('#arcade-detail').textContent = game === 'snake' ? String(state.body.length).padStart(2, '0') : '♥'.repeat(state.lives) + '♡'.repeat(3 - state.lives);
    $('#arcade-state').textContent = ({ ready: 'READY', running: 'PLAYING', paused: 'PAUSED', over: 'GAME OVER', won: 'YOU WON!' })[state.status];
    $('.arcade-toggle').textContent = state.status === 'running' ? 'Pause' : state.status === 'paused' ? 'Resume' : state.status === 'ready' ? 'Start game' : 'Play again';
    difficultySelect.disabled = state.status === 'running' || state.status === 'paused';
  }

  function showOverlay(title, description, button) {
    $('#arcade-message').textContent = title;
    $('#arcade-description').textContent = description;
    $('.arcade-start').innerHTML = `${button} <span aria-hidden="true">▶</span>`;
    overlay.hidden = false;
  }

  function reset() {
    cancelAnimationFrame(frame); frame = 0; previousTime = 0; accumulator = 0; release();
    state = game === 'snake' ? createSnakeState() : createSurfState();
    difficulty = difficultySelect.value;
    best = safeRead(key());
    const isSnake = game === 'snake';
    $('#arcade-dialog-title').textContent = isSnake ? 'Pixel Snake' : 'Pixel Surf';
    $('#arcade-detail-label').textContent = isSnake ? 'LENGTH' : 'LIVES';
    canvas.setAttribute('aria-label', `${isSnake ? 'Pixel Snake' : 'Pixel Surf'} game board. Arrow keys or W A S D to move. Space to pause. Swipe or use the direction buttons on touchscreens.`);
    dialog.dataset.game = game;
    showOverlay(isSnake ? 'Small snake. Big ambition.' : 'Catch a little pixel paradise.', isSnake ? 'Eat fruit, grow longer, and stay clear of yourself and the walls.' : 'Dodge the reefs. Collect golden coins. You have three lives.', "LET'S PLAY");
    updateHud(); draw();
  }

  function start() {
    if (state.status === 'over' || state.status === 'won') reset();
    state.status = 'running'; overlay.hidden = true; previousTime = 0; accumulator = 0;
    updateHud(); beep('start'); announce(`${game === 'snake' ? 'Pixel Snake' : 'Pixel Surf'} started.`);
    canvas.focus({ preventScroll: true });
    cancelAnimationFrame(frame); frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (state?.status !== 'running') return;
    state.status = 'paused'; cancelAnimationFrame(frame); frame = 0; release();
    showOverlay('A tiny breather.', 'Your adventure will be right here.', 'RESUME'); updateHud(); announce('Game paused.');
  }

  function toggle() { if (state.status === 'running') pause(); else start(); }

  function finish() {
    cancelAnimationFrame(frame); frame = 0;
    const won = state.status === 'won';
    showOverlay(won ? 'You filled the whole world!' : game === 'snake' ? 'One more bite?' : 'Another wave awaits.', `Score ${state.score} · Personal best ${Math.max(best, state.score)}. ${won ? 'Perfect run. Legendary snake.' : 'A fresh adventure is one click away.'}`, 'PLAY AGAIN');
    updateHud(); announce(`${won ? 'You won' : 'Game over'}. Score ${state.score}.`);
  }

  function loop(time) {
    if (!dialog.open || state.status !== 'running') return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    if (game === 'snake') {
      accumulator += dt;
      const interval = Math.max(0.055, ({ easy: 0.19, normal: 0.14, hard: 0.095 }[difficulty]) - state.score / 10000);
      while (accumulator >= interval && state.status === 'running') {
        const event = stepSnake(state); if (event !== 'move') beep(event); accumulator -= interval;
      }
    } else stepSurf(state, input, dt, difficulty).forEach(beep);
    draw(); updateHud();
    if (state.status !== 'running') { finish(); return; }
    frame = requestAnimationFrame(loop);
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function pixelStar(x, y, color, size = 4) { rect(x - size, y, size * 3, size, color); rect(x, y - size, size, size * 3, color); }

  function drawSnake() {
    rect(0, 0, W, H, '#0d1927');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
      rect(x * 30 + 1, y * 30 + 1, 28, 28, (x + y) % 2 === 0 ? '#102332' : '#122737');
    }
    // Tiny grass patches make the board feel like a pixel garden.
    for (const [x, y] of [[14, 17], [687, 22], [12, 456], [694, 450]]) {
      rect(x, y, 3, 9, '#30533c'); rect(x + 5, y - 4, 3, 13, '#30533c');
    }
    if (state.food) {
      const x = state.food.x * 30, y = state.food.y * 30;
      rect(x + 6, y + 10, 19, 13, '#fc647f'); rect(x + 9, y + 7, 13, 19, '#fc647f');
      rect(x + 10, y + 10, 5, 5, '#ffbdad'); rect(x + 15, y + 3, 3, 7, '#9cde80'); rect(x + 18, y + 3, 6, 3, '#63c28b');
    }
    [...state.body].reverse().forEach((part, reverseIndex) => {
      const i = state.body.length - 1 - reverseIndex;
      const x = part.x * 30, y = part.y * 30;
      rect(x + 3, y + 5, 25, 24, '#1d594b');
      rect(x + 2, y + 2, 25, 24, i === 0 ? '#baf294' : i % 2 ? '#76dba4' : '#8ee3aa');
      rect(x + 5, y + 3, 16, 3, '#c8f6b0');
      if (i === 0) {
        let eyes;
        if (state.direction === 'right') eyes = [[19, 7], [19, 18]];
        else if (state.direction === 'left') eyes = [[6, 7], [6, 18]];
        else if (state.direction === 'up') eyes = [[7, 6], [18, 6]];
        else eyes = [[7, 19], [18, 19]];
        eyes.forEach(([ex, ey]) => { rect(x + ex - 1, y + ey - 1, 6, 6, '#f4ffe8'); rect(x + ex, y + ey, 4, 4, '#17312a'); });
      }
    });
  }

  function drawReef(e) {
    const x = e.x - e.w / 2, y = e.y - e.h / 2;
    rect(x - 7, y + 7, e.w + 14, e.h + 7, '#83e9dc');
    rect(x - 3, y + 1, e.w + 6, e.h + 7, '#f8d98a');
    if (e.variant === 2) {
      rect(x + 2, y + 2, e.w - 4, e.h - 4, '#7186a0'); rect(x + 8, y - 5, e.w - 16, e.h - 3, '#a4afbb');
      rect(x + 10, y - 3, 10, 7, '#cad4dd'); rect(x + 20, y + 15, 9, 4, '#7186a0');
    } else {
      rect(x + 2, y - 2, e.w - 4, e.h - 5, '#37a783'); rect(x + 6, y - 7, e.w - 12, e.h - 8, '#6ad69c');
      if (e.variant === 1) {
        rect(e.x - 3, y - 17, 6, 27, '#946144'); rect(e.x - 4, y - 18, 8, 8, '#3e826c');
        rect(e.x - 22, y - 20, 42, 7, '#40b780'); rect(e.x - 15, y - 27, 29, 7, '#7ce2a5');
        rect(e.x - 25, y - 12, 13, 7, '#40b780'); rect(e.x + 12, y - 12, 13, 7, '#40b780');
      } else { rect(x + 10, y + 5, 7, 6, '#b8f2a5'); rect(x + 29, y + 17, 5, 5, '#b8f2a5'); }
    }
  }

  function drawSurf() {
    rect(0, 0, W, H, '#177f9a');
    const drift = reducedMotion.matches ? 0 : state.distance * 6;
    for (let row = -1; row < 14; row++) {
      const y = (row * 42 + drift % 42);
      for (let col = 0; col < 8; col++) {
        const x = col * 103 + (row % 2 ? 31 : 5);
        rect(x, y, 31, 3, '#279bb1'); rect(x + 31, y - 4, 20, 3, '#279bb1');
        if ((row + col) % 4 === 0) rect(x + 9, y + 13, 17, 3, '#56c5ce');
      }
    }
    // Distant shoreline stays decorative; only the reefs have collision boxes.
    rect(0, 0, 6, H, '#4eb7b8'); rect(W - 6, 0, 6, H, '#4eb7b8');
    [...state.entities].sort((a, b) => a.y - b.y).forEach(e => {
      if (e.type === 'reef') drawReef(e);
      else {
        const x = e.x - 10, y = e.y - 10;
        rect(x - 3, y + 5, 26, 15, '#168297'); rect(x + 3, y, 14, 23, '#e7a649'); rect(x, y + 3, 20, 17, '#ffe192');
        rect(x + 8, y + 4, 4, 14, '#e9ad4a'); rect(x + 3, y + 4, 3, 8, '#fff7c8');
      }
    });
    const x = Math.round(state.x), y = Math.round(state.y);
    rect(x - 20, y + 16, 40, 7, '#73dedb'); rect(x - 26, y + 26, 52, 4, '#49bbca'); rect(x - 32, y + 36, 64, 3, '#3babbd');
    if (state.invulnerable && Math.floor(state.elapsed * 10) % 2 === 0 && !reducedMotion.matches) return;
    // Original little surfer, purple wetsuit, gold board, and oversized pixel hair.
    rect(x - 12, y - 28, 24, 57, '#eeb06a'); rect(x - 8, y - 33, 16, 66, '#ffe2a2'); rect(x - 3, y - 27, 6, 55, '#fff1be');
    rect(x - 6, y + 5, 5, 14, '#2e315f'); rect(x + 3, y + 5, 5, 14, '#2e315f');
    rect(x - 12, y - 9, 24, 21, '#ae8ef5'); rect(x - 8, y - 7, 16, 11, '#c7afff');
    rect(x - 20, y - 7, 8, 7, '#f5bd9e'); rect(x + 12, y - 7, 8, 7, '#f5bd9e');
    rect(x - 9, y - 24, 18, 17, '#e9aa8b'); rect(x - 11, y - 28, 22, 10, '#28304d'); rect(x - 13, y - 23, 6, 11, '#28304d');
    rect(x - 4, y - 17, 3, 3, '#30324d'); rect(x + 4, y - 17, 3, 3, '#30324d');
    if (state.invulnerable) { pixelStar(x - 28, y - 20, '#fff7c8', 3); pixelStar(x + 26, y + 9, '#fff7c8', 3); }
  }

  function draw() {
    if (!ctx || !state) return;
    ctx.imageSmoothingEnabled = false;
    game === 'snake' ? drawSnake() : drawSurf();
  }

  function open(which, opener) {
    if (which !== 'snake' && which !== 'surf') return;
    trigger = opener;
    game = which;
    reset();
    oldOverflow = document.body.style.overflow;
    oldOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none';
    dialog.showModal();
    $('.arcade-start').focus({ preventScroll: true });
  }

  function close() {
    cancelAnimationFrame(frame); frame = 0; release();
    document.body.style.overflow = oldOverflow; document.body.style.overscrollBehavior = oldOverscroll;
    if (state?.status === 'running') state.status = 'paused';
    trigger?.focus({ preventScroll: true });
    if (state) document.dispatchEvent(new CustomEvent('arcade:score', { detail: { game, difficulty, score: state.score, best } }));
  }

  document.addEventListener('click', event => {
    const launch = event.target.closest('[data-game="snake"], [data-game="surf"]');
    if (launch && launch !== dialog && !dialog.contains(launch)) { event.preventDefault(); open(launch.dataset.game, launch); }
  });
  $('.arcade-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $('.arcade-start').addEventListener('click', start);
  $('.arcade-toggle').addEventListener('click', toggle);
  $('.arcade-restart').addEventListener('click', () => { reset(); announce('Game reset. Select Start game when ready.'); });
  difficultySelect.addEventListener('change', reset);
  function syncSoundButton() {
    const sound = isSoundEnabled();
    $('.arcade-sound').setAttribute('aria-pressed', String(sound));
    $('.arcade-sound').setAttribute('aria-label', `Turn all game sound ${sound ? 'off' : 'on'}`);
    $('.arcade-sound').textContent = sound ? 'Sound on' : 'Sound off';
  }
  document.addEventListener('imon:sound', syncSoundButton);
  syncSoundButton();
  $('.arcade-sound').addEventListener('click', () => {
    setSound(!isSoundEnabled());
    if (isSoundEnabled()) beep('coin');
  });
  dialog.addEventListener('keydown', event => {
    const direction = KEY_DIRECTION[event.key];
    const editing = event.target.tagName === 'SELECT';
    if (editing) return;
    if (direction) {
      event.preventDefault();
      if (state.status !== 'running') return;
      if (game === 'snake') { if (!event.repeat) queueSnakeDirection(state, direction); }
      else input[direction] = true;
    } else if (event.code === 'Space' && event.target.tagName !== 'BUTTON') { event.preventDefault(); if (!event.repeat) toggle(); }
    else if (event.key === 'p' || event.key === 'P') { event.preventDefault(); if (!event.repeat) toggle(); }
  });
  document.addEventListener('keyup', event => { const dir = KEY_DIRECTION[event.key]; if (dir) input[dir] = false; });
  $('.arcade-dpad').addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-direction]');
    if (!button) return;
    event.preventDefault();
    if (state.status !== 'running') return;
    const dir = button.dataset.direction;
    clearTimeout(padPulseTimers.get(dir)); padPulseTimers.delete(dir);
    button.setPointerCapture(event.pointerId);
    if (game === 'snake') queueSnakeDirection(state, dir); else input[dir] = true;
    button.classList.add('is-pressed');
  });
  // Native keyboard activation and assistive technologies synthesize a click with
  // detail 0. Pointer controls are already handled above and must not queue twice.
  $('.arcade-dpad').addEventListener('click', event => {
    const button = event.target.closest('[data-direction]');
    if (!button || event.detail !== 0 || state.status !== 'running') return;
    const dir = button.dataset.direction;
    if (game === 'snake') { queueSnakeDirection(state, dir); return; }
    clearTimeout(padPulseTimers.get(dir));
    input[dir] = true;
    button.classList.add('is-pressed');
    padPulseTimers.set(dir, setTimeout(() => {
      input[dir] = false;
      button.classList.remove('is-pressed');
      padPulseTimers.delete(dir);
    }, 120));
  });
  function releasePad(event) {
    const button = event.target.closest('[data-direction]');
    if (button) { input[button.dataset.direction] = false; button.classList.remove('is-pressed'); }
  }
  $('.arcade-dpad').addEventListener('pointerup', releasePad);
  $('.arcade-dpad').addEventListener('pointercancel', releasePad);
  $('.arcade-dpad').addEventListener('lostpointercapture', releasePad);
  canvas.addEventListener('pointerdown', event => {
    if (state.status !== 'running') return;
    swipe = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!swipe || state.status !== 'running') return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.hypot(dx, dy) < 12) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (game === 'snake') { queueSnakeDirection(state, dir); swipe = { x: event.clientX, y: event.clientY }; }
    else { release(); input[dir] = true; }
  });
  const releaseSwipe = () => { swipe = null; release(); };
  canvas.addEventListener('pointerup', releaseSwipe);
  canvas.addEventListener('pointercancel', releaseSwipe);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
}
