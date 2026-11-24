/* Original, dependency-free arcade games. Canvas artwork is drawn in code. */
import { playSound, setSound, isSoundEnabled } from './audio.js';
import { SNAKE_BODY, SNAKE_TAIL, SNAKE_TAIL_TIP, SNAKE_TIP, SNAKE_HEADS, SNAKE_FOOD, SNAKE_TONGUE, SCENES, BOARD, sceneCells, wallBlocks } from './arcade-sprites.js';
const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const KEY_DIRECTION = { ArrowUp: 'up', w: 'up', W: 'up', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left' };
const W = 720, H = 480;

/* Snake draws its own board size, which comes straight from the sprite
   module: the playfield plus the margin that holds the stone wall. Keeping
   it derived means the art and the canvas can never drift apart. */
const SNAKE_W = BOARD.margin * 2 + BOARD.width;
const SNAKE_H = BOARD.margin * 2 + BOARD.height;

/* The Snake modes.
   A mode changes the rules and the look of the board. The level, which is
   picked separately, only changes the speed. */
export const SNAKE_MODES = ['classic', 'walls', 'night', 'timed'];
export const SNAKE_MODE_CONFIG = {
  classic: { label: 'Classic', note: 'Walls kill. Eat the fruit, grow long, stay clear of yourself.', wraps: false, dim: false, seconds: 0, points: 10 },
  walls: { label: 'Wraparound', note: 'The walls are open — you wrap around to the other side.', wraps: true, dim: false, seconds: 0, points: 10 },
  night: { label: 'Night', note: 'The board is dark. Only a small circle around the head is lit.', wraps: false, dim: true, seconds: 0, points: 20 },
  timed: { label: 'Timed', note: 'Sixty seconds on the clock. Every fruit is worth ten, and the clock bonus is fifty.', wraps: false, dim: false, seconds: 60, points: 10 }
};
const SNAKE_LEVELS = { easy: 0.19, normal: 0.14, hard: 0.095 };

/** The rules for a mode. An unknown mode falls back to Classic. */
export function snakeMode(mode) {
  return SNAKE_MODE_CONFIG[mode] || SNAKE_MODE_CONFIG.classic;
}

/**
 * Where a best score is kept.
 *
 * Classic keeps the old key, so a score earned before the modes existed is
 * still there. Every other mode gets a key of its own.
 */
export function snakeStorageKey(mode, level) {
  if (!mode || mode === 'classic') return `sabbir-arcade-v1-snake-${level}`;
  return `sabbir-arcade-v1-snake-${mode}-${level}`;
}

/** Every key a Snake score can live under. */
export function snakeStorageKeys() {
  const keys = [];
  for (const mode of SNAKE_MODES) for (const level of Object.keys(SNAKE_LEVELS)) keys.push(snakeStorageKey(mode, level));
  return keys;
}

/** How long the snake waits between steps, on a given level and score. */
export function snakeLevelInterval(level, score = 0) {
  return Math.max(0.055, (SNAKE_LEVELS[level] ?? 0.14) - score / 10000);
}

export function placeSnakeFood(state, random = Math.random) {
  const occupied = new Set(state.body.map(p => `${p.x},${p.y}`));
  const free = [];
  for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) {
    if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  }
  return free.length ? free[Math.min(free.length - 1, Math.floor(random() * free.length))] : null;
}

export function createSnakeState(random = Math.random, mode = 'classic') {
  const config = snakeMode(mode);
  // The snake starts in the middle of the board with room to run in every
  // direction, so the opening seconds are not spent dodging a wall.
  const startX = Math.floor(BOARD.cols / 2), startY = Math.floor(BOARD.rows / 2);
  const state = { cols: BOARD.cols, rows: BOARD.rows, body: [{ x: startX, y: startY }, { x: startX - 1, y: startY }, { x: startX - 2, y: startY }], direction: 'right', queue: [], food: null, score: 0, status: 'ready', mode: config === SNAKE_MODE_CONFIG.classic && mode === 'classic' ? 'classic' : mode, timeLeft: config.seconds };
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
  const config = snakeMode(state.mode);
  state.direction = state.queue.shift() || state.direction;
  const [dx, dy] = DIRECTIONS[state.direction];
  const head = { x: state.body[0].x + dx, y: state.body[0].y + dy };
  // In Walls mode the board has no edges, so a snake that leaves one side
  // comes back in on the other instead of dying.
  if (config.wraps) {
    head.x = (head.x + state.cols) % state.cols;
    head.y = (head.y + state.rows) % state.rows;
  }
  const eating = state.food && head.x === state.food.x && head.y === state.food.y;
  const collisionBody = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= state.cols || head.y < 0 || head.y >= state.rows || collisionBody.some(p => p.x === head.x && p.y === head.y)) {
    state.status = 'over';
    return 'crash';
  }
  state.body.unshift(head);
  if (!eating) state.body.pop();
  else {
    state.score += config.points;
    state.food = placeSnakeFood(state, random);
    if (!state.food) { state.status = 'won'; return 'win'; }
    return 'eat';
  }
  return 'move';
}

/**
 * Run the clock down in Timed mode.
 *
 * The clock ticks on real time, not on snake steps, so a slow device does
 * not get extra seconds. It returns 'timeout' when the minute is up.
 */
export function tickSnakeClock(state, dt) {
  const config = snakeMode(state?.mode);
  if (!config.seconds || state?.status !== 'running') return null;
  state.timeLeft = Math.max(0, (state.timeLeft ?? config.seconds) - dt);
  if (state.timeLeft > 0) return null;
  state.status = 'over';
  state.score += 50;
  return 'timeout';
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
function safeWrite(key, value) { try { localStorage.setItem(key, String(value)); document.dispatchEvent(new CustomEvent('imon:progress', { detail: { key, value } })); } catch { /* Games still work in private storage modes. */ } }

export function initArcade() {
  if (document.getElementById('arcade-modal')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'arcade-modal';
  dialog.className = 'arcade-modal';
  dialog.setAttribute('aria-labelledby', 'arcade-dialog-title');
  dialog.innerHTML = `<div class="arcade-shell">
    <header class="arcade-header"><div><span class="arcade-eyebrow">SABBIR'S POCKET ARCADE</span><h2 id="arcade-dialog-title">Pixel Snake</h2></div><button type="button" class="arcade-close" aria-label="Close game">×</button></header>
    <div class="arcade-hud"><div><span>SCORE</span><strong id="arcade-score">0000</strong></div><div><span>PERSONAL BEST</span><strong id="arcade-best">0000</strong></div><div class="arcade-life"><span id="arcade-detail-label">LENGTH</span><strong id="arcade-detail">03</strong></div><span class="arcade-state" id="arcade-state">READY</span></div>
    <div class="arcade-board"><canvas id="arcade-canvas" width="864" height="576" tabindex="0" aria-label="Game board. Use arrow keys or W A S D to move. Space pauses the game.">This game needs a browser with Canvas support. Use the direction buttons below to move.</canvas><div class="arcade-overlay"><span class="arcade-overlay-icon" aria-hidden="true">✦</span><h3 id="arcade-message">Small snake. Big ambition.</h3><p id="arcade-description">Collect the fruit. Grow your score. Mind the walls.</p><button type="button" class="arcade-start arcade-btn">LET'S PLAY <span aria-hidden="true">▶</span></button></div></div>
    <div class="arcade-toolbar"><div class="arcade-actions"><button type="button" class="arcade-toggle arcade-btn">Start game</button><button type="button" class="arcade-restart arcade-secondary">Restart</button></div><div class="arcade-settings"><label for="arcade-mode">Mode <select id="arcade-mode"><option value="walls" selected>Wraparound</option><option value="classic">Classic</option><option value="night">Night</option><option value="timed">Timed</option></select></label><label><input type="checkbox" id="snake-path"> Turn preview</label><label for="snake-skin">Skin <select id="snake-skin"><option value="fern">Fern</option><option value="lagoon">Lagoon</option><option value="ember">Ember</option></select></label><label for="arcade-difficulty">Speed <select id="arcade-difficulty"><option value="easy">Chill</option><option value="normal" selected>Classic</option><option value="hard">Turbo</option></select></label><button type="button" class="arcade-sound arcade-secondary" aria-pressed="false" aria-label="Turn game sound on">Sound off</button></div></div>
    <p class="arcade-mode-note" data-arcade-mode-note role="status" aria-live="polite"></p>
    <div class="arcade-bottom"><p id="arcade-help"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>W A S D</kbd> to move<br><kbd>Space</kbd> pause · <kbd>Esc</kbd> close</p><div class="arcade-dpad" aria-label="Touch direction controls"><button type="button" data-direction="up" aria-label="Move up">↑</button><button type="button" data-direction="left" aria-label="Move left">←</button><button type="button" data-direction="down" aria-label="Move down">↓</button><button type="button" data-direction="right" aria-label="Move right">→</button></div><p class="arcade-save-note">YOUR BEST STAYS<br>ON THIS DEVICE <span aria-hidden="true">★</span></p></div>
    <p class="arcade-announcement" aria-live="polite" aria-atomic="true"></p>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('#arcade-canvas'), ctx = canvas.getContext('2d');
  const overlay = $('.arcade-overlay');
  const difficultySelect = $('#arcade-difficulty');
  const skinSelect = $('#snake-skin');
  const skinColors = {
    fern: {},
    lagoon: {'#5fd068':'#49cadc','#3aa04a':'#19698a','#8bef92':'#a4fbf3','#4bb35c':'#123a57','#4fc463':'#5fe6e2','#2f8f4e':'#297ba3','#1f6b39':'#124664'},
    ember: {'#5fd068':'#f47946','#3aa04a':'#984048','#8bef92':'#ffd586','#4bb35c':'#44213a','#4fc463':'#ffa162','#2f8f4e':'#b44b54','#1f6b39':'#652445'}
  };
  skinSelect.addEventListener('change',()=>{if(game==='snake') draw();});
  const modeSelect = $('#arcade-mode');
  const modeNote = $('[data-arcade-mode-note]');
  const input = { up: false, right: false, down: false, left: false };
  const padPulseTimers = new Map();
  let game = 'snake', state, frame = 0, previousTime = 0, accumulator = 0, best = 0, difficulty = 'normal', mode = 'walls', trigger, swipe;
  let snakeBackdrop = null;
  let oldOverflow = '', oldOverscroll = '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The Surf game keeps its own keys; Snake adds the mode to the key.
  const key = () => game === 'snake' ? snakeStorageKey(mode, difficulty) : `sabbir-arcade-v1-${game}-${difficulty}`;
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
    // In Timed mode the third box becomes the clock instead of the length.
    const timed = game === 'snake' && snakeMode(mode).seconds > 0;
    $('#arcade-detail-label').textContent = timed ? 'TIME' : (game === 'snake' ? 'LENGTH' : 'LIVES');
    $('#arcade-detail').textContent = timed
      ? String(Math.ceil(state.timeLeft ?? 0)).padStart(2, '0')
      : game === 'snake' ? String(state.body.length).padStart(2, '0') : '♥'.repeat(state.lives) + '♡'.repeat(3 - state.lives);
    $('#arcade-state').textContent = ({ ready: 'READY', running: 'PLAYING', paused: 'PAUSED', over: 'GAME OVER', won: 'YOU WON!' })[state.status];
    $('.arcade-toggle').textContent = state.status === 'running' ? 'Pause' : state.status === 'paused' ? 'Resume' : state.status === 'ready' ? 'Start game' : 'Play again';
    const locked = state.status === 'running' || state.status === 'paused';
    difficultySelect.disabled = locked;
    if (modeSelect) modeSelect.disabled = locked;
  }

  function showOverlay(title, description, button) {
    $('#arcade-message').textContent = title;
    $('#arcade-description').textContent = description;
    $('.arcade-start').innerHTML = `${button} <span aria-hidden="true">▶</span>`;
    overlay.hidden = false;
  }

  function reset() {
    cancelAnimationFrame(frame); frame = 0; previousTime = 0; accumulator = 0; release();
    difficulty = difficultySelect.value;
    if (game === 'snake') mode = modeSelect?.value || 'walls';
    state = game === 'snake' ? createSnakeState(Math.random, mode) : createSurfState();
    best = safeRead(key());
    const isSnake = game === 'snake';
    $('#arcade-dialog-title').textContent = isSnake ? 'Pixel Snake' : 'Pixel Surf';
    $('#arcade-detail-label').textContent = isSnake ? 'LENGTH' : 'LIVES';
    canvas.setAttribute('aria-label', `${isSnake ? 'Pixel Snake' : 'Pixel Surf'} game board. Arrow keys or W A S D to move. Space to pause. Swipe or use the direction buttons on touchscreens.`);
    // Snake draws a wider board than Surf, so the canvas is sized per game.
    canvas.width = isSnake ? SNAKE_W : W;
    canvas.height = isSnake ? SNAKE_H : H;
    snakeBackdrop = null;
    dialog.dataset.game = game;
    skinSelect.closest('label').hidden=!isSnake;
    $('#snake-path').closest('label').hidden=!isSnake;
    if (modeSelect) modeSelect.closest('label').hidden = !isSnake;
    if (modeNote) {
      modeNote.hidden = !isSnake;
      modeNote.textContent = isSnake ? snakeMode(mode).note : '';
    }
    showOverlay(isSnake ? 'Small snake. Big ambition.' : 'Catch a little pixel paradise.', isSnake ? snakeMode(mode).note : 'Dodge the reefs. Collect golden coins. You have three lives.', "LET'S PLAY");
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
    // The clock running out has its own message, because the run was not
    // lost — it simply ran out of time.
    const timedOut = game === 'snake' && snakeMode(mode).seconds > 0 && state.timeLeft <= 0;
    const title = won ? 'You filled the whole world!' : timedOut ? "Time's up!" : game === 'snake' ? 'One more bite?' : 'Another wave awaits.';
    const tail = won ? 'Perfect run. Legendary snake.' : timedOut ? 'A fifty point bonus for the clock. Another minute is waiting.' : 'A fresh adventure is one click away.';
    showOverlay(title, `Score ${state.score} · Personal best ${Math.max(best, state.score)}. ${tail}`, 'PLAY AGAIN');
    updateHud(); announce(`${won ? 'You won' : timedOut ? 'Time is up' : 'Game over'}. Score ${state.score}.`);
  }

  function loop(time) {
    if (!dialog.open || state.status !== 'running') return;
    const elapsed = previousTime ? (time - previousTime) / 1000 : 0;
    const dt = Math.min(elapsed, 0.05);
    previousTime = time;
    if (game === 'snake') {
      accumulator += dt;
      const interval = snakeLevelInterval(difficulty, state.score);
      while (accumulator >= interval && state.status === 'running') {
        const previousHead = state.body[0];
        const event = stepSnake(state);
        const head = state.body[0];
        if (event !== 'move') beep(event);
        else if (Math.abs(head.x - previousHead.x) > 1 || Math.abs(head.y - previousHead.y) > 1) beep('portal');
        accumulator -= interval;
      }
      // The clock runs on real time, so a slow device does not get extra
      // seconds and a backgrounded tab does not lose the whole minute.
      const seconds = Math.ceil(state.timeLeft);
      if (state.status === 'running' && tickSnakeClock(state, elapsed) === 'timeout') beep('win');
      else if (seconds <= 6 && Math.ceil(state.timeLeft) < seconds) beep('clock');
    } else stepSurf(state, input, dt, difficulty).forEach(beep);
    draw(); updateHud();
    if (state.status !== 'running') { finish(); return; }
    frame = requestAnimationFrame(loop);
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function pixelStar(x, y, color, size = 4) { rect(x - size, y, size * 3, size, color); rect(x, y - size, size, size * 3, color); }

  /**
   * Draw a sprite table at a position on the board.
   *
   * The tables are authored on a 30 × 30 grid, so they are scaled down to
   * the cell size before they are drawn.
   */
  function sprite(table, x, y, colors) {
    const factor = BOARD.cell / 30;
    for (const [rx, ry, rw, rh, colour] of table) {
      rect(x + rx * factor, y + ry * factor, Math.max(1, rw * factor), Math.max(1, rh * factor), colors?.[colour] || colour);
    }
  }

  /**
   * The board the snake plays on.
   *
   * The ground, the scattered pebbles and the stone wall are all static, so
   * they are painted once onto an offscreen canvas and blitted every frame.
   * That keeps the per-frame work down to the snake itself.
   */
  function snakeScene() {
    const scene = SCENES[state.mode] || SCENES.classic;
    const canvas = document.createElement('canvas');
    canvas.width = SNAKE_W; canvas.height = SNAKE_H;
    const c = canvas.getContext('2d');
    const fill = (x, y, w, h, colour) => { c.fillStyle = colour; c.fillRect(Math.round(x), Math.round(y), w, h); };
    const { cols, rows, cell, margin } = BOARD;
    fill(0, 0, SNAKE_W, SNAKE_H, scene.ground);
    // A flat checkerboard is the snake.io arena: two very close tones, so the
    // grid reads without fighting the snake for attention.
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      if ((x + y) % 2 === 0) fill(margin + x * cell, margin + y * cell, cell, cell, scene.groundAlt);
    }
    // A faint grid line on every cell edge, so the arena feels measured.
    for (let x = 0; x <= cols; x += 1) fill(margin + x * cell, margin, 1, rows * cell, scene.path);
    for (let y = 0; y <= rows; y += 1) fill(margin, margin + y * cell, cols * cell, 1, scene.path);
    // Scattered specks break up the flat ground without becoming scenery.
    for (const spot of sceneCells(scene, cols, rows, state.mode)) {
      const x = margin + spot.x * cell, y = margin + spot.y * cell;
      if (spot.kind === 'flower') {
        fill(x + cell * 0.42, y + cell * 0.42, 3, 3, scene.flower);
        fill(x + cell * 0.52, y + cell * 0.52, 2, 2, scene.flower);
      } else {
        fill(x + cell * 0.38, y + cell * 0.62, 5, 2, scene.pebble);
        fill(x + cell * 0.46, y + cell * 0.56, 2, 2, scene.pebble);
      }
    }
    // The stone wall. It sits in the margin around the playfield, so the
    // edge the snake dies on is exactly the edge the player can see.
    //
    // It is drawn as masonry: a solid body with a mortar joint between
    // every block, and a continuous lit cap along the face that points at
    // the playfield. The cap is drawn as one unbroken line rather than
    // block by block, because that line *is* the boundary of the board —
    // it has to read as a single wall the snake cannot pass.
    //
    // In Walls mode the border is an open archway instead, because the
    // snake is allowed through it.
    const open = snakeMode(state.mode).wraps;
    const archFrom = margin + cols * cell * 0.35, archTo = margin + cols * cell * 0.65;
    const blocks = wallBlocks(BOARD);
    // A block is part of the archway when the mode allows wrapping and
    // the block sits in the gap in the top or bottom course.
    const isArch = block => open && (block[4] === 'top' || block[4] === 'bottom')
      && block[0] >= archFrom && block[0] < archTo;

    // The body of the wall, one solid course of stone.
    for (const block of blocks) {
      if (isArch(block)) continue;
      const [wx, wy, ww, wh] = block;
      fill(wx, wy, ww, wh, scene.wall);
    }
    // The mortar joints, so the wall reads as stacked stone rather than as
    // a dashed line. Every joint is a dark line across the course.
    for (const block of blocks) {
      if (isArch(block)) continue;
      const [wx, wy, ww, wh, edge] = block;
      if (edge === 'top' || edge === 'bottom') {
        // A vertical joint between neighbouring blocks.
        fill(wx, wy, 2, wh, scene.wallEdge);
      } else {
        // A horizontal joint between neighbouring blocks.
        fill(wx, wy, ww, 2, scene.wallEdge);
      }
    }
    // The lit cap along the inner face. It is drawn in three passes — the
    // cap itself, a shadow under it and a hard outline at the very edge
    // of the playfield — so the boundary reads as a wall with depth.
    const cap = 7;
    const playLeft = margin, playTop = margin;
    const playRight = margin + cols * cell, playBottom = margin + rows * cell;
    if (!open) {
      // Top course: the cap is on the bottom face of the wall.
      fill(playLeft, playTop - cap, playRight - playLeft, cap, scene.wallTop);
      fill(playLeft, playTop - 2, playRight - playLeft, 2, scene.wallEdge);
      // Bottom course: the cap is on the top face.
      fill(playLeft, playBottom, playRight - playLeft, cap, scene.wallTop);
      fill(playLeft, playBottom + cap - 2, playRight - playLeft, 2, scene.wallEdge);
      // Left course: the cap is on the right face.
      fill(playLeft - cap, playTop, cap, playBottom - playTop, scene.wallTop);
      fill(playLeft - 2, playTop, 2, playBottom - playTop, scene.wallEdge);
      // Right course: the cap is on the left face.
      fill(playRight, playTop, cap, playBottom - playTop, scene.wallTop);
      fill(playRight + cap - 2, playTop, 2, playBottom - playTop, scene.wallEdge);
    } else {
      // In Walls mode the top and bottom are open, so only the side
      // courses keep their cap.
      fill(playLeft - cap, playTop, cap, playBottom - playTop, scene.wallTop);
      fill(playLeft - 2, playTop, 2, playBottom - playTop, scene.wallEdge);
      fill(playRight, playTop, cap, playBottom - playTop, scene.wallTop);
      fill(playRight + cap - 2, playTop, 2, playBottom - playTop, scene.wallEdge);
      // The archway needs a lintel, so the gap reads as a doorway the
      // snake is meant to go through rather than as missing wall.
      for (const y of [playTop - cell, playBottom]) {
        fill(archFrom, y, archTo - archFrom, cell, scene.wallTop);
        fill(archFrom, y + (y < playTop ? cell - 6 : 0), archTo - archFrom, 6, scene.wall);
      }
    }
    return canvas;
  }

  function drawSnake() {
    const scene = SCENES[state.mode] || SCENES.classic;
    if (!snakeBackdrop || snakeBackdrop.dataset.mode !== state.mode) {
      snakeBackdrop = snakeScene();
      snakeBackdrop.dataset.mode = state.mode;
    }
    ctx.drawImage(snakeBackdrop, 0, 0);
    if ($('#snake-path').checked) {
      let {x,y}=state.body[0];
      for(let i=0;i<3;i++){
        const dir=state.queue[Math.min(i,state.queue.length-1)]||state.direction;
        const [dx,dy]=DIRECTIONS[dir]; x+=dx;y+=dy;
        if(snakeMode(state.mode).wraps){x=(x+state.cols)%state.cols;y=(y+state.rows)%state.rows}
        if(x<0||x>=state.cols||y<0||y>=state.rows)break;
        ctx.fillStyle='#ffeaa5';ctx.fillRect(BOARD.margin+(x+.5)*BOARD.cell-2,BOARD.margin+(y+.5)*BOARD.cell-2,4,4);
      }
    }
    const { cell, margin } = BOARD;

    if (state.food) {
      const x = margin + state.food.x * cell, y = margin + state.food.y * cell;
      // In the last ten seconds of a Timed run the fruit flashes, so the
      // player feels the clock without having to look away from the snake.
      const flashing = snakeMode(state.mode).seconds && state.timeLeft <= 10 && !reducedMotion.matches;
      const table = flashing && Math.floor(state.timeLeft * 4) % 2 === 0 ? SNAKE_FOOD.gold : SNAKE_FOOD.apple;
      sprite(table, x, y);
    }

    // The body is drawn tail first, so the head sits on top of it.
    const body = state.body;
    for (let index = body.length - 1; index >= 0; index -= 1) {
      const part = body[index];
      const x = margin + part.x * cell, y = margin + part.y * cell;
      let table = SNAKE_BODY;
      if (index === 0) table = SNAKE_HEADS[state.direction] || SNAKE_HEADS.right;
      else if (index === body.length - 1) table = SNAKE_TIP;
      else if (index === body.length - 2) table = SNAKE_TAIL_TIP;
      else if (index === body.length - 3) table = SNAKE_TAIL;
      sprite(table, x, y, skinColors[skinSelect.value]);
      // The tongue flicks when the fruit is within reach.
      if (index === 0 && state.food) {
        const gap = Math.abs(state.food.x - part.x) + Math.abs(state.food.y - part.y);
        if (gap <= 2 && !(reducedMotion.matches && Math.floor(state.timeLeft * 4) % 2 === 0)) sprite(SNAKE_TONGUE, x, y);
      }
    }

    // Night mode dims the whole board and lights a small circle around the
    // head. The light is drawn in pixel rings, not a gradient, so it keeps
    // the style of the rest of the game.
    if (scene.dim) {
      ctx.globalAlpha = scene.dim;
      ctx.fillStyle = '#050912';
      ctx.fillRect(margin, margin, BOARD.width, BOARD.height);
      ctx.globalAlpha = 1;
      const head = body[0];
      const cx = margin + head.x * cell + cell / 2, cy = margin + head.y * cell + cell / 2;
      for (let ring = 3; ring >= 1; ring -= 1) {
        const radius = ring * cell;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#ffd98a';
        for (let angle = 0; angle < 32; angle += 1) {
          const px = cx + Math.cos(angle / 32 * Math.PI * 2) * radius;
          const py = cy + Math.sin(angle / 32 * Math.PI * 2) * radius;
          ctx.fillRect(Math.round(px) - 7, Math.round(py) - 7, 14, 14);
        }
      }
      ctx.globalAlpha = 1;
    }
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
    if (state) document.dispatchEvent(new CustomEvent('arcade:score', { detail: { game, difficulty, mode, score: state.score, best } }));
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
  modeSelect?.addEventListener('change', reset);
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
