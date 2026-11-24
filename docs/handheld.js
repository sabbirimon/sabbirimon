// Keep the playfield's input coordinates independent of the surrounding display.
const games = [
  {host: '.cabinet', board: '.screen', type: 'canvas'},
  {host: '.arcade-modal', board: '.arcade-board', type: 'canvas'},
  {host: '.racer-modal', board: '.racer-board-wrap', type: 'canvas'},
  {host: '.puzzle-modal', board: '.puzzle-board-wrap', type: 'square'},
  {host: '.ludo-modal', board: '.ludo-board', type: 'square'},
  {host: '.slots-dialog', board: '.slots-machine-wrap', type: 'panel'},
  {host: '.quiz-modal', board: '.quiz-main', type: 'panel'},
  {host: '.brain-cabinet', board: '.brain-display', type: 'panel'}
];
let preferred = 'wide';
try { if (localStorage.getItem('imon-game-screen') === 'classic') preferred = 'classic'; } catch {}
let expanded = null;
let locked = false;
let nativeHost = null;
let fullscreenTicket = 0;
const hostSelector = games.map(game => game.host).join(',');
const orientation = window.screen.orientation;

function button(text, action) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.dataset.hhAction = action;
  return el;
}

function updateView(host) {
  host.dataset.hhRatio = preferred;
  host.querySelectorAll('[data-hh-action="classic"],[data-hh-action="wide"]').forEach(el => {
    el.setAttribute('aria-pressed', String(el.dataset.hhAction === preferred));
  });
}

function showExpanded(host, on) {
  host.classList.toggle('hh-expanded', on);
  document.documentElement.classList.toggle('hh-game-open', on);
  const full = host.querySelector('[data-hh-action="full"]');
  full.textContent = on ? 'Exit full screen' : 'Full screen';
  full.setAttribute('aria-pressed', String(on));
  if (!on) {
    if (locked) { try { orientation.unlock(); } catch {} }
    locked = false;
    host.querySelector('[data-hh-action="rotate"]').setAttribute('aria-pressed', 'false');
    host.querySelector('.hh-status').textContent = '';
  }
  expanded = on ? host : null;
}

async function leave(host) {
  if (expanded !== host) return;
  ++fullscreenTicket;
  showExpanded(host, false);
  if (nativeHost === host && document.fullscreenElement) {
    nativeHost = null;
    try { await document.exitFullscreen(); } catch {}
  }
}

async function enter(host) {
  if (expanded === host) return;
  if (expanded) await leave(expanded);
  const ticket = ++fullscreenTicket;
  showExpanded(host, true);
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    // Dialogs themselves cannot request native fullscreen. Keep the modal in the top layer.
    const target = host.tagName === 'DIALOG' ? document.documentElement : host;
    try {
      await target.requestFullscreen();
      if (ticket === fullscreenTicket && expanded === host) nativeHost = host;
      else if (document.fullscreenElement === target && !expanded) await document.exitFullscreen();
    } catch { /* The CSS expanded view also works on iOS and in embedded browsers. */ }
  }
}

async function rotate(host, el, note) {
  if (!orientation?.lock) {
    note.textContent = 'Turn your device to use landscape. Enable auto-rotate if needed.';
    return;
  }
  if (locked) {
    try { orientation.unlock(); } catch {}
    locked = false;
    el.setAttribute('aria-pressed', 'false');
    note.textContent = '';
    return;
  }
  if (expanded !== host) await enter(host);
  try {
    await orientation.lock('landscape');
    if (expanded !== host) { orientation.unlock(); return; }
    locked = true;
    el.setAttribute('aria-pressed', 'true');
    note.textContent = 'Landscape locked. Tap Rotate again to unlock.';
  } catch { note.textContent = 'Turn your device to use landscape. Enable auto-rotate if needed.'; }
}

function attach(host) {
  if (host.hasAttribute('data-hh-ratio')) return;
  const game = games.find(item => host.matches(item.host));
  const board = host.querySelector(game.board);
  if (!board) return;
  let frame = board;
  if (game.type !== 'canvas') {
    frame = document.createElement('div');
    board.before(frame);
    frame.append(board);
  }
  frame.classList.add('hh-screen', 'hh-' + game.type);
  if (game.type === 'canvas') {
    const canvas = board.querySelector('canvas');
    const measure = () => {
      const ratio = String(canvas.width / canvas.height);
      if (frame.style.getPropertyValue('--hh-native') !== ratio) frame.style.setProperty('--hh-native', ratio);
    };
    measure();
    // Snake and Surf share a canvas whose dimensions change at cartridge selection.
    if (host.matches('.arcade-modal')) new MutationObserver(measure).observe(host, {attributes:true, attributeFilter:['data-game']});
  }
  const bar = document.createElement('div');
  bar.className = 'hh-view';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Game display');
  const ratio = document.createElement('div');
  ratio.className = 'hh-ratios';
  ratio.setAttribute('role', 'group');
  ratio.setAttribute('aria-label', 'Screen shape');
  ratio.append(button('4:3', 'classic'), button('Landscape', 'wide'));
  const full = button('Full screen', 'full');
  const turn = button('Rotate', 'rotate');
  full.setAttribute('aria-pressed','false');
  turn.setAttribute('aria-pressed','false');
  const note = document.createElement('span');
  note.className = 'hh-status';
  note.setAttribute('role', 'status');
  bar.append(ratio, full, turn, note);
  // Keep the selector outside setup/round panels so it remains available between rounds.
  const anchor = host.querySelector('.ludo-header') || frame;
  if (anchor.matches('.ludo-header')) anchor.after(bar);
  else anchor.before(bar);
  updateView(host);
  bar.addEventListener('click', event => {
    const el = event.target.closest('button');
    if (!el) return;
    const action = el.dataset.hhAction;
    if (action === 'full') { if (expanded === host) leave(host); else enter(host); }
    else if (action === 'rotate') rotate(host, el, note);
    else {
      preferred = action;
      try { localStorage.setItem('imon-game-screen', preferred); } catch {}
      document.querySelectorAll('[data-hh-ratio]').forEach(updateView);
    }
  });
  host.addEventListener('close', () => leave(host));
}

document.querySelectorAll(hostSelector).forEach(attach);
// Home arcade dialogs are appended directly to body when a game loads.
new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) {
    if (node.nodeType === 1 && node.matches(hostSelector)) attach(node);
  }
}).observe(document.body, {childList:true});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && nativeHost) {
    const host = nativeHost;
    nativeHost = null;
    if (expanded === host) showExpanded(host, false);
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded) {
    event.preventDefault();
    event.stopImmediatePropagation();
    leave(expanded);
  }
}, true);
