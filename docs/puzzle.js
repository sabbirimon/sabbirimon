/* Original DOM-based 2048. Game logic has no browser dependencies. */
import { playSound } from './audio.js';
const SIZE = 4;
const DIRECTIONS = ['left', 'right', 'up', 'down'];
const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
const SESSION_KEY = 'sabbir-2048-session-v1';
const BEST_KEY = 'sabbir-2048-best-v1';

export function canMove2048(board) {
  if (board.some(value => value === 0)) return true;
  for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
    const i = row * SIZE + col;
    if (col < SIZE - 1 && board[i] === board[i + 1]) return true;
    if (row < SIZE - 1 && board[i] === board[i + SIZE]) return true;
  }
  return false;
}

export function move2048(board, direction) {
  if (!DIRECTIONS.includes(direction)) throw new RangeError('Unknown 2048 direction.');
  const next = [...board];
  let gained = 0;
  for (let line = 0; line < SIZE; line++) {
    const indices = Array.from({ length: SIZE }, (_, position) =>
      direction === 'left' || direction === 'right' ? line * SIZE + position : position * SIZE + line);
    if (direction === 'right' || direction === 'down') indices.reverse();
    const values = indices.map(i => board[i]).filter(Boolean);
    const merged = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        const value = values[i] * 2;
        merged.push(value); gained += value; i++;
      } else merged.push(values[i]);
    }
    indices.forEach((index, position) => { next[index] = merged[position] || 0; });
  }
  return { board: next, gained, changed: next.some((value, i) => value !== board[i]), won: next.some(value => value >= 2048) };
}

export function spawn2048Tile(board, random = Math.random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return { board: [...board], index: null, value: 0 };
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const value = random() < 0.9 ? 2 : 4;
  const next = [...board];
  next[index] = value;
  return { board: next, index, value };
}

export function create2048State(random = Math.random) {
  const first = spawn2048Tile(Array(16).fill(0), random);
  const second = spawn2048Tile(first.board, random);
  return { board: second.board, score: 0, won: false, continued: false, over: false };
}

export function advance2048(state, direction, random = Math.random) {
  if (state.over) return { state, changed: false, gained: 0, spawned: null, firstWin: false };
  const move = move2048(state.board, direction);
  if (!move.changed) return { state, changed: false, gained: 0, spawned: null, firstWin: false };
  const spawn = spawn2048Tile(move.board, random);
  return {
    state: { ...state, board: spawn.board, score: state.score + move.gained, won: state.won || move.won, over: !canMove2048(spawn.board) },
    changed: true, gained: move.gained, spawned: spawn.index, firstWin: !state.won && move.won,
  };
}

export function valid2048Board(board) {
  return Array.isArray(board) && board.length === 16 && board.every(value =>
    value === 0 || (Number.isSafeInteger(value) && value >= 2 && 2 ** Math.round(Math.log2(value)) === value));
}

function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
function write(key, value) { try { localStorage.setItem(key, value); document.dispatchEvent(new CustomEvent('imon:progress', { detail: { key, value } })); } catch { /* Storage is optional. */ } }
function storedScore(value) { const number = Number(value); return Number.isSafeInteger(number) && number >= 0 ? number : 0; }
function restoredState() {
  try {
    const stored = JSON.parse(read(SESSION_KEY));
    if (!stored || !valid2048Board(stored.board) || stored.board.filter(Boolean).length < 2 || storedScore(stored.score) !== stored.score) return null;
    return { board: [...stored.board], score: stored.score, won: stored.board.some(value => value >= 2048), continued: stored.continued === true, over: !canMove2048(stored.board) };
  } catch { return null; }
}

export function initPuzzle() {
  if (document.getElementById('puzzle-modal')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'puzzle-modal';
  dialog.className = 'puzzle-modal';
  dialog.setAttribute('aria-labelledby', 'puzzle-title');
  dialog.setAttribute('aria-describedby', 'puzzle-intro');
  dialog.innerHTML = `<div class="puzzle-shell">
    <header class="puzzle-header"><div><span class="puzzle-eyebrow">IMON ARCADE / 03</span><h2 id="puzzle-title">2048<span aria-hidden="true">.</span></h2></div><button type="button" class="puzzle-close" aria-label="Close 2048">×</button></header>
    <p id="puzzle-intro" class="puzzle-intro">Small tiles. Big brain energy.</p>
    <div class="puzzle-hud"><div><span>SCORE</span><strong id="puzzle-score">0</strong></div><div><span>PERSONAL BEST</span><strong id="puzzle-best">0</strong></div><div class="puzzle-goal"><span>THE QUEST</span><strong>2048</strong></div></div>
    <div class="puzzle-board-wrap">
      <div class="puzzle-board" id="puzzle-board" role="grid" aria-label="2048 board. Four rows and four columns." aria-describedby="puzzle-controls-help" tabindex="0"></div>
      <div class="puzzle-overlay" hidden><span class="puzzle-overlay-star" aria-hidden="true">✦</span><h3 id="puzzle-result-title"></h3><p id="puzzle-result-copy"></p><button type="button" class="puzzle-result-action puzzle-primary"></button><button type="button" class="puzzle-result-undo puzzle-secondary">Undo the last move</button></div>
    </div>
    <div class="puzzle-actions"><button type="button" class="puzzle-undo puzzle-secondary" disabled><span aria-hidden="true">↶</span> Undo</button><button type="button" class="puzzle-restart puzzle-primary">New game <span aria-hidden="true">↻</span></button></div>
    <div class="puzzle-bottom"><p id="puzzle-controls-help"><strong>Slide. Match. Repeat.</strong><br>Arrow keys / W A S D, swipe,<br>or use the buttons.<br><kbd>U</kbd> undo · <kbd>Esc</kbd> close</p><div class="puzzle-dpad" role="group" aria-label="Slide all tiles"><button type="button" data-puzzle-direction="up" aria-label="Slide tiles up">↑</button><button type="button" data-puzzle-direction="left" aria-label="Slide tiles left">←</button><button type="button" data-puzzle-direction="down" aria-label="Slide tiles down">↓</button><button type="button" data-puzzle-direction="right" aria-label="Slide tiles right">→</button></div></div>
    <details class="puzzle-rules"><summary>How to reach 2048</summary><p>Slide the whole board in one direction. Two matching tiles become one: <strong>2 + 2 = 4</strong>, then 8, 16, and beyond. Each tile merges once per move.</p><p>A new 2 or 4 appears after a valid move. Keep some space open! Reach 2048 to win, then keep playing for a bigger score. If there are no empty cells or matching neighbors, the round ends.</p><p>Undo takes back one move, including its new tile. Your board and best score are saved on this device when browser storage is available.</p></details>
    <p class="puzzle-local-note">NO TIMER. NO RUSH. JUST ONE MORE MOVE.</p>
    <p class="puzzle-live" role="status" aria-live="polite" aria-atomic="true"></p>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const board = $('#puzzle-board');
  const overlay = $('.puzzle-overlay');
  const cells = [];
  for (let row = 0; row < 4; row++) {
    const rowElement = document.createElement('div');
    rowElement.className = 'puzzle-row'; rowElement.setAttribute('role', 'row');
    for (let col = 0; col < 4; col++) {
      const cell = document.createElement('div');
      cell.className = 'puzzle-tile'; cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', String(row + 1)); cell.setAttribute('aria-colindex', String(col + 1));
      rowElement.append(cell); cells.push(cell);
    }
    board.append(rowElement);
  }

  let state = restoredState() || create2048State();
  let undoState = null;
  let best = Math.max(storedScore(read(BEST_KEY)), state.score);
  let opener, oldOverflow = '', oldOverscroll = '', swipe = null, overlayKind = null;
  const announce = message => { $('.puzzle-live').textContent = message; };
  const clone = value => ({ ...value, board: [...value.board] });
  function persist() {
    write(SESSION_KEY, JSON.stringify(state));
    if (state.score > best) best = state.score;
    write(BEST_KEY, String(best));
  }

  function render(spawned = null, focusResult = false) {
    cells.forEach((cell, index) => {
      const value = state.board[index];
      cell.textContent = value ? String(value) : '';
      cell.dataset.value = String(value);
      cell.classList.toggle('puzzle-tile-new', index === spawned);
      cell.classList.toggle('puzzle-tile-large', value >= 1024);
      cell.classList.toggle('puzzle-tile-legendary', value > 2048);
      cell.setAttribute('aria-label', `Row ${Math.floor(index / 4) + 1}, column ${index % 4 + 1}: ${value || 'empty'}`);
    });
    $('#puzzle-score').textContent = state.score.toLocaleString();
    $('#puzzle-best').textContent = best.toLocaleString();
    $('.puzzle-undo').disabled = !undoState;
    $('.puzzle-result-undo').hidden = !undoState;
    overlayKind = state.won && !state.continued ? 'win' : state.over ? 'over' : null;
    overlay.hidden = !overlayKind;
    board.setAttribute('aria-disabled', String(Boolean(overlayKind)));
    if (overlayKind) {
      $('#puzzle-result-title').textContent = overlayKind === 'win' ? 'Quest complete!' : 'A full little world.';
      $('#puzzle-result-copy').textContent = overlayKind === 'win' ? 'You made 2048. Your next adventure? 4096.' : `No moves left. You scored ${state.score.toLocaleString()} points. Ready for another round?`;
      $('.puzzle-result-action').textContent = overlayKind === 'win' ? 'Keep playing →' : 'Try again ↻';
      if (focusResult) $('.puzzle-result-action').focus({ preventScroll: true });
    }
  }

  function move(direction) {
    if (!dialog.open || overlayKind) return;
    const next = advance2048(state, direction);
    if (!next.changed) { announce(`No tiles can move ${direction}. Try another direction.`); return; }
    undoState = clone(state); state = next.state; persist(); render(next.spawned, true);
    playSound(next.firstWin ? 'win' : state.over ? 'crash' : next.gained ? 'merge' : 'move');
    announce(next.firstWin ? `You reached 2048! Score ${state.score}. Keep playing or undo this move.` : state.over ? `No moves left. Final score ${state.score}.` : `Moved ${direction}.${next.gained ? ` Plus ${next.gained} points.` : ''} Score ${state.score}. Highest tile ${Math.max(...state.board)}.`);
  }

  function undo() {
    if (!undoState) return;
    state = undoState; undoState = null; persist(); render();
    playSound('move');
    announce(`Last move undone. Score ${state.score}.`);
    board.focus({ preventScroll: true });
  }

  function restart() {
    state = create2048State(); undoState = null; persist(); render();
    playSound('start');
    announce('New game. Two tiles. A fresh start.');
    board.focus({ preventScroll: true });
  }

  function open(trigger) {
    if (dialog.open) return;
    opener = trigger;
    oldOverflow = document.body.style.overflow;
    oldOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none';
    render(); dialog.showModal();
    (overlayKind ? $('.puzzle-result-action') : board).focus({ preventScroll: true });
    announce(state.score ? `Welcome back. Score ${state.score}. Your board is ready.` : 'Merge matching tiles to reach 2048.');
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-game="2048"]');
    if (!trigger || dialog.contains(trigger)) return;
    event.preventDefault(); open(trigger);
  });
  $('.puzzle-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    swipe = null; persist();
    document.body.style.overflow = oldOverflow; document.body.style.overscrollBehavior = oldOverscroll;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  $('.puzzle-undo').addEventListener('click', undo);
  $('.puzzle-result-undo').addEventListener('click', undo);
  $('.puzzle-restart').addEventListener('click', restart);
  $('.puzzle-result-action').addEventListener('click', () => {
    if (overlayKind === 'win') {
      state.continued = true; persist(); render(null, true);
      if (!overlayKind) { board.focus({ preventScroll: true }); announce('Keep going! Next stop: 4096.'); }
    } else restart();
  });
  $('.puzzle-dpad').addEventListener('click', event => {
    const button = event.target.closest('[data-puzzle-direction]');
    if (button) move(button.dataset.puzzleDirection);
  });
  dialog.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = KEYS[event.key];
    if (direction) { event.preventDefault(); if (!event.repeat) move(direction); }
    else if (event.key.toLowerCase() === 'u') { event.preventDefault(); if (!event.repeat) undo(); }
    else if (event.code === 'Space' && event.target === board) event.preventDefault();
  });
  board.addEventListener('pointerdown', event => {
    if (overlayKind || !event.isPrimary || event.button !== 0) return;
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointerup', event => {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  const cancelSwipe = () => { swipe = null; };
  board.addEventListener('pointercancel', cancelSwipe);
  board.addEventListener('lostpointercapture', cancelSwipe);
  window.addEventListener('blur', cancelSwipe);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSwipe(); });
  persist(); render();
}
