import { playSound } from './audio.js';

export const SLOT_SYMBOLS = ['terminal', 'bug', 'coffee', 'chip', 'rocket', 'braces'];
export const DEV_REWARDS = [
  { id: 'duck', name: 'Rubber Duck Debugger', icon: 'bug', title: 'Explain it out loud.', tip: 'Describe the expected result and the actual result, one step at a time. A clear explanation often reveals the missing assumption.', code: 'console.table(rows)' },
  { id: 'coffee', name: 'Midnight Coffee', icon: 'coffee', title: 'Check before you commit.', tip: 'Get a compact overview of changed and untracked files before you stage your work.', code: 'git status --short' },
  { id: 'merge', name: 'Merge Wizard', icon: 'braces', title: 'Catch messy diffs.', tip: 'Check your diff for conflict markers and whitespace errors before committing.', code: 'git diff --check' },
  { id: 'cache', name: 'Cache Whisperer', icon: 'chip', title: 'Know your cache headers.', tip: 'This HTTP response header tells caches not to store the response. Use it for content that must not be cached.', code: 'Cache-Control: no-store' },
  { id: 'terminal', name: 'Terminal Explorer', icon: 'terminal', title: 'Find your bearings.', tip: 'Print the current working directory before running commands with relative paths.', code: 'pwd' },
  { id: 'bug', name: 'Bug Hunter', icon: 'bug', title: 'Make assumptions visible.', tip: 'In JavaScript, console.assert logs a message when its condition is false.', code: 'console.assert(condition, "Check failed")' },
  { id: 'rocket', name: 'Rocket Builder', icon: 'rocket', title: 'Check the build.', tip: 'If your package.json defines a build script, run it before shipping your change.', code: 'npm run build' },
  { id: 'pixel', name: 'Pixel Architect', icon: 'braces', title: 'Keep your pixels crisp.', tip: 'Use pixelated image rendering when scaling pixel artwork so it keeps its blocky edges.', code: 'image-rendering: pixelated;' },
  { id: 'commit', name: 'Commit Curator', icon: 'terminal', title: 'Read the recent history.', tip: 'See the five most recent Git commits with a compact, one-line summary for each.', code: 'git log --oneline -5' },
  { id: 'test', name: 'Test Pilot', icon: 'rocket', title: 'Give changes a safety net.', tip: 'Run tests with the built-in Node.js test runner in a project that uses it.', code: 'node --test' },
  { id: 'branch', name: 'Branch Gardener', icon: 'chip', title: 'Give an idea its own branch.', tip: 'Create and switch to a new Git branch before beginning your next experiment.', code: 'git switch -c feature/my-idea' },
  { id: 'signal', name: 'Signal Keeper', icon: 'coffee', title: 'Ask for a response.', tip: 'On macOS or Linux, send four ICMP echo requests. A blocked ping does not necessarily mean a website is down.', code: 'ping -c 4 example.com' }
];

const KEY = 'imon-dev-slots-v1';
const rewardIds = new Set(DEV_REWARDS.map(card => card.id));
const safeInteger = value => Number.isFinite(value) ? Math.max(0, Math.min(1_000_000_000, Math.floor(value))) : 0;

export function cleanSlotsState(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const collection = {};
  if (value.collection && typeof value.collection === 'object') {
    for (const [id, count] of Object.entries(value.collection)) {
      if (rewardIds.has(id) && safeInteger(count) > 0) collection[id] = safeInteger(count);
    }
  }
  return { xp: safeInteger(value.xp), spins: safeInteger(value.spins), collection };
}

export function evaluateReels(reels) {
  if (!Array.isArray(reels) || reels.length !== 3 || reels.some(symbol => !SLOT_SYMBOLS.includes(symbol))) {
    throw new TypeError('A spin needs exactly three valid developer symbols.');
  }
  const distinct = new Set(reels).size;
  return distinct === 1
    ? { tier: 'triple', prizeTier: 'grand', label: 'GRAND DEPLOY!', xp: 200 }
    : distinct === 2
      ? { tier: 'pair', prizeTier: 'mini', label: 'MINI MATCH!', xp: 75 }
      : { tier: 'build', prizeTier: 'discovery', label: 'DISCOVERY DROP!', xp: 25 };
}

function randomIndex(length, random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random samples must be in [0, 1).');
  return Math.floor(value * length);
}

// Every visible cell and the collectible use independent, uniformly sampled draws.
// The default one-row signature remains compatible with existing model callers.
export function createSpin(random = Math.random, rowCount = 1) {
  if (![1, 3, 5].includes(rowCount)) throw new RangeError('Choose one, three, or five rows.');
  const rows = Array.from({ length: rowCount }, () => Array.from({ length: 3 }, () => SLOT_SYMBOLS[randomIndex(SLOT_SYMBOLS.length, random)]));
  return { reels: rows[Math.floor(rowCount / 2)], rows, cardId: DEV_REWARDS[randomIndex(DEV_REWARDS.length, random)].id };
}
export function evaluateRows(rows) {
  if (!Array.isArray(rows) || ![1,3,5].includes(rows.length)) throw new TypeError('A board has one, three, or five complete rows.');
  const rowResults = rows.map(evaluateReels);
  const rank = { build: 0, pair: 1, triple: 2 };
  const best = rowResults.reduce((winner, result) => rank[result.tier] > rank[winner.tier] ? result : winner);
  return { ...best, xp: rowResults.reduce((sum,result)=>sum+result.xp,0), rowResults, winningRows: rowResults.flatMap((result,i)=>result.tier!=='build'?[i]:[]) };
}
export function awardSpin(previous, outcome) {
  const result = evaluateRows(outcome?.rows || [outcome?.reels]);
  if (!rewardIds.has(outcome?.cardId)) throw new TypeError('Unknown developer collectible.');
  const state = cleanSlotsState(previous), isNew = !state.collection[outcome.cardId];
  return {
    state: {
      xp: safeInteger(state.xp + result.xp), spins: safeInteger(state.spins + 1),
      collection: { ...state.collection, [outcome.cardId]: safeInteger((state.collection[outcome.cardId] || 0) + 1) }
    },
    result, isNew,
    card: { ...DEV_REWARDS.find(card => card.id === outcome.cardId), prizeTier: result.prizeTier }
  };
}

const ICONS = {
  terminal: '<path fill="#e2e8f0" d="M1 2h14v10H9v2h3v1H4v-1h3v-2H1z"/><path fill="#0f2340" d="M3 4h10v6H3z"/><path fill="#86efac" d="M4 5h1v1h1v1H5v1H4V7h1V6H4zm4 3h3v1H8z"/>',
  bug: '<path fill="#f9a8d4" d="M5 4h6v8H5zM6 3h4v1H6zM6 12h4v1H6zM4 5h1v2H3V6h1zm7 0h1v1h1v1h-2zM2 8h3v1H2zm9 0h3v1h-3zM3 11h2v1H4v1H3zm8 0h2v2h-1v-1h-1zM5 1h1v2H5zm5 0h1v2h-1z"/><path fill="#581c87" d="M7 5h1v1H7zm2 0h1v1H9zM8 7h1v5H8z"/>',
  coffee: '<path fill="#e2e8f0" d="M2 5h10v7H3v-1H2zm10 1h3v4h-3V9h2V7h-2zM1 13h13v1H1z"/><path fill="#a16207" d="M3 6h8v2H3z"/><path fill="#fde68a" d="M4 1h1v2H4zm3 1h1v2H7zm3-1h1v2h-1z"/>',
  chip: '<path fill="#c4b5fd" d="M4 3h8v10H4zM1 5h3v1H1zm0 3h3v1H1zm0 3h3v1H1zM12 5h3v1h-3zm0 3h3v1h-3zm0 3h3v1h-3zM6 1h1v2H6zm3 0h1v2H9zM6 13h1v2H6zm3 0h1v2H9z"/><path fill="#4c1d95" d="M6 5h4v6H6z"/><path fill="#a5f3fc" d="M7 6h2v3H7z"/>',
  rocket: '<path fill="#e2e8f0" d="M7 1h2v2h1v2h1v7H5V5h1V3h1z"/><path fill="#7dd3fc" d="M7 4h2v3H7z"/><path fill="#fda4af" d="M3 9h2v4H2v-2h1zm8 0h2v2h1v2h-3z"/><path fill="#facc15" d="M6 12h4v2H9v2H7v-2H6z"/>',
  braces: '<path fill="#86efac" d="M3 2h3v2H4v3H2v2h2v3h2v2H3v-1H2v-3H0V6h2V3h1zm7 0h3v1h1v3h2v4h-2v3h-1v1h-3v-2h2V9h2V7h-2V4h-2z"/><path fill="#fde68a" d="M7 6h2v4H7z"/>'
};

function icon(symbol, className = '') {
  return `<svg class="slots-icon ${className}" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">${ICONS[symbol]}</svg>`;
}

export function initSlots() {
  if (document.getElementById('imon-slots-dialog')) return;
  let state;
  try { state = cleanSlotsState(JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { state = cleanSlotsState(); }
  let opener, busy = false, timers = [], spinFrame = 0, rowCount = 3;
  const previewGrid = rows => Array.from({length:rows},(_,row)=>[0,2,4].map(offset=>SLOT_SYMBOLS[(row+offset)%SLOT_SYMBOLS.length]));
  let currentGrid = previewGrid(rowCount), currentResult = null;
  const dialog = document.createElement('dialog');
  dialog.id = 'imon-slots-dialog'; dialog.className = 'slots-dialog';
  dialog.setAttribute('aria-labelledby', 'slots-title'); dialog.setAttribute('aria-describedby', 'slots-disclaimer');
  dialog.innerHTML = `<div class="slots-shell">
    <header class="slots-header"><div><p class="slots-eyebrow">IMON ARCADE / BONUS ROOM</p><h2 id="slots-title">IMON DEV SLOTS</h2></div><button class="slots-close" type="button" aria-label="Close developer slots">×</button></header>
    <p id="slots-disclaimer" class="slots-disclaimer">Free play · Virtual rewards only</p>
    <p class="slots-intro">Pull the lever. Roll three cylinders. Every visible row earns XP, and every spin unlocks a useful developer fact.</p>
    <div class="slots-stats"><div><span>PLAY XP</span><strong data-slots-xp>0</strong></div><div><span>SPINS</span><strong data-slots-spins>0</strong></div><div><span>COLLECTION</span><strong data-slots-count>0 / 12</strong></div></div>
    <div class="slots-line-selector"><label for="slots-row-count">VISIBLE PAY LINES</label><select id="slots-row-count"><option value="3">3 rows</option><option value="5">5 rows</option></select><span>Every row is a real result</span></div>
    <div class="slots-machine-wrap"><div class="slots-machine"><div class="slots-machine-top"><i></i><i></i><span>SHIP A LITTLE LUCK</span><i></i><i></i></div><div class="slots-reels" role="img" aria-label="Ready to spin"></div><div class="slots-machine-bottom"><span>ALL ROWS COUNT</span><span class="slots-led" aria-hidden="true"></span></div></div><button type="button" class="slots-lever" aria-label="Pull lever to spin all reels"><span class="slots-lever-knob"></span><span class="slots-lever-arm"></span><span class="slots-lever-base"></span><span class="slots-lever-label">PULL</span></button></div>
    <div class="slots-action"><button type="button" class="slots-spin">SPIN · FREE <span aria-hidden="true">↻</span></button><span>No bets. No purchases. Just play.</span></div>
    <div class="slots-announcement" role="status" aria-live="polite" aria-atomic="true">Ready when you are. Every spin earns a tech reward.</div>
    <div class="slots-line-results" aria-label="Results for every row" hidden></div>
    <section class="slots-reward" aria-label="Your latest reward" hidden></section>
    <details class="slots-rules"><summary>How rewards work</summary><p>Choose three or five visible rows. Every one of the three cells in every row is sampled independently from six equally likely symbols. Each horizontal row is a pay line: three matches earn a Grand reward and 200 XP; a pair earns a Mini reward and 75 XP; every other row earns a Discovery reward and 25 XP. Your spin earns the sum of all rows, and the highest matching tier decorates your developer fact.</p><p>Every spin independently draws one of 12 facts with equal probability. All visible stopped symbols are actual results. Rolling strips are animation only; outcomes are never adjusted to create a near miss. XP and cards have no cash value. Your collection is saved in this browser when storage is available.</p></details>
    <button type="button" class="slots-gallery-toggle" aria-expanded="false" aria-controls="slots-gallery">VIEW MY COLLECTION <span data-slots-gallery-count>0 / 12</span></button>
    <section id="slots-gallery" class="slots-gallery" aria-label="Developer collectible gallery" hidden></section>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const spinButton = $('.slots-spin'), lever = $('.slots-lever'), reels = $('.slots-reels'), announcement = $('.slots-announcement'), rowSelect = $('#slots-row-count');
  function cell(symbol) { return `<div class="slots-cell">${icon(symbol)}<span>${symbol.toUpperCase()}</span></div>`; }
  function renderReels(grid, result = null) {
    reels.style.setProperty('--rows', String(grid.length));
    reels.innerHTML = [0,1,2].map(col=>`<div class="slots-reel"><div class="slots-strip">${grid.map(row=>cell(row[col])).join('')}</div></div>`).join('') + (result ? result.winningRows.map(row=>`<span class="slots-payline slots-payline-${result.rowResults[row].prizeTier}" style="--row:${row}" aria-hidden="true"></span>`).join('') : '');
    reels.setAttribute('aria-label', grid.map((row,i)=>`Row ${i+1}: ${row.join(', ')}`).join('. '));
  }
  function renderState() {
    $('[data-slots-xp]').textContent = state.xp.toLocaleString(); $('[data-slots-spins]').textContent = state.spins.toLocaleString();
    const count = `${Object.keys(state.collection).length} / ${DEV_REWARDS.length}`;
    $('[data-slots-count]').textContent = count; $('[data-slots-gallery-count]').textContent = count;
    $('#slots-gallery').innerHTML = DEV_REWARDS.map(card => { const count = state.collection[card.id] || 0; return `<article class="slots-collectible ${count ? 'unlocked' : 'locked'}">${icon(card.icon)}<h3>${count ? card.name : 'Undiscovered'}</h3><span>${count ? `Collected ×${count}` : 'Keep exploring'}</span>${count ? `<p>${card.title}</p>` : ''}</article>`; }).join('');
  }
  function cancelSpin() {
    timers.forEach(clearTimeout); timers=[]; if(spinFrame)cancelAnimationFrame(spinFrame);spinFrame=0;
    busy=false;spinButton.disabled=false;lever.disabled=false;rowSelect.disabled=false;
    dialog.classList.remove('is-spinning');reels.removeAttribute('aria-busy');renderReels(currentGrid,currentResult);
  }
  function completeSpin(outcome) {
    if (!dialog.open || !busy) return;
    const award = awardSpin(state,outcome);state=award.state;currentGrid=outcome.rows;currentResult=award.result;
    try { localStorage.setItem(KEY,JSON.stringify(state)); } catch {}
    cancelSpin();renderState();
    const lineResults=$('.slots-line-results');lineResults.hidden=false;
    lineResults.innerHTML=award.result.rowResults.map((result,i)=>`<span class="slots-line-${result.prizeTier}"><strong>ROW ${i+1}</strong> ${result.prizeTier.toUpperCase()} +${result.xp} XP</span>`).join('');
    const reward=$('.slots-reward');reward.hidden=false;reward.className=`slots-reward slots-tier-${award.result.tier}`;
    reward.innerHTML=`<div class="slots-reward-art">${icon(award.card.icon)}<span>${award.result.prizeTier.toUpperCase()}</span></div><div class="slots-reward-copy"><p class="slots-reward-label">${award.result.prizeTier.toUpperCase()} TECH REWARD · +${award.result.xp} XP</p><h3>${award.card.name}</h3><strong>${award.card.title}</strong><p>${award.card.tip}</p><code>${award.card.code.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</code><small>${award.isNew?'New fact added to your collection.':'Already discovered. Your collection count grows.'}</small></div>`;
    announcement.textContent=`${award.result.label} ${rowCount} rows earned ${award.result.xp} XP. ${award.isNew?'New fact':'Collected again'}: ${award.card.name}.`;
    playSound(award.result.tier==='triple'?'win':'coin');
  }
  function spin() {
    if(busy)return;
    const outcome=createSpin(Math.random,rowCount);busy=true;spinButton.disabled=true;lever.disabled=true;rowSelect.disabled=true;
    announcement.textContent='Reels rolling… Every row has its own result.';reels.setAttribute('aria-busy','true');$('.slots-line-results').hidden=true;
    const noMotion=matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.dataset.motion==='off'||document.documentElement.dataset.motion==='off';
    playSound('roll');
    if(noMotion){completeSpin(outcome);return;}
    reels.style.setProperty('--rows',String(rowCount));
    reels.innerHTML=[0,1,2].map(col=>{const lead=18+col*6;const rolling=Array.from({length:lead},(_,i)=>SLOT_SYMBOLS[(i+col*2)%SLOT_SYMBOLS.length]);return `<div class="slots-reel" data-reel="${col}" style="--steps:${lead};--duration:${780+col*180}ms"><div class="slots-strip">${rolling.map(cell).join('')}${outcome.rows.map(row=>cell(row[col])).join('')}</div></div>`;}).join('');
    void reels.offsetHeight;
    spinFrame=requestAnimationFrame(()=>{dialog.classList.add('is-spinning');spinFrame=0;});
    [0,1,2].forEach(col=>timers.push(setTimeout(()=>{if(!busy)return;reels.querySelector(`[data-reel="${col}"]`)?.classList.add('is-settled');playSound('click');},780+col*180)));
    timers.push(setTimeout(()=>completeSpin(outcome),1180));
  }
  spinButton.addEventListener('click',spin);lever.addEventListener('click',spin);
  rowSelect.addEventListener('change',()=>{rowCount=Number(rowSelect.value);currentGrid=previewGrid(rowCount);currentResult=null;renderReels(currentGrid);$('.slots-line-results').hidden=true;announcement.textContent=`${rowCount} real pay lines selected. Ready to spin.`;});
  $('.slots-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{cancelSpin();opener?.focus({preventScroll:true});});
  $('.slots-gallery-toggle').addEventListener('click',event=>{const button=event.currentTarget,open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));$('#slots-gallery').hidden=!open;playSound('click');});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-game="slots"]');if(!button)return;event.preventDefault();opener=button;cancelSpin();renderState();announcement.textContent='Ready when you are. Every spin earns a tech reward.';if(!dialog.open)dialog.showModal();spinButton.focus({preventScroll:true});});
  renderState();renderReels(currentGrid);
}
