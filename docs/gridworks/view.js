import * as Engine from './engine.js';
import { CHAPTERS, campaignXP } from './story.js';
import { initWeather } from '../weather.js';
import { playSound, setSound, isSoundEnabled } from '../audio.js';

const { BUILDINGS, LEVELS } = Engine;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const canvas = $('#city-map'), ctx = canvas.getContext('2d');
const viewport = $('#map-viewport');
const TILE = 32, SAVE_KEY = 'imon-gridworks-cities-v1', META_KEY = 'imon-gridworks-progress-v1';
const fmt = value => Math.round(Number(value) || 0).toLocaleString();
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const definitions = Array.isArray(BUILDINGS) ? Object.fromEntries(BUILDINGS.map(item => [item.id || item.type, item])) : BUILDINGS;
const entries = Object.entries(definitions);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reduced.matches, state, analysis, selectedId = null, tool = null, mode = 'select', overlay = 'normal';
let category = 'power', management = 'mission', paused = false, speed = 1, lastTime = 0, animTime = 0;
let lastHUD = 0, lastSave = 0, lastEvents = 0, toastTimer, hover = { x: 0, y: 0 }, camera = { x: 0, y: 0, zoom: 1 };
let pointer = null, spaceHeld = false, cssWidth = 0, cssHeight = 0, hasFit = false;
let meta = { completed: [], seen: [], active: 0 }, saves = {}, logs = [], lastEngineEvent = 0;
let sandbox = false, storageAvailable = true, angledView = false, cyberView = false;
let quality = 'auto', autoDPR = 1.5, fpsFrames = 0, fpsStarted = 0, slowWindows = 0, fastWindows = 0;
function renderRatio() { return Math.min(devicePixelRatio || 1, quality === 'low' ? 1 : quality === 'high' ? 2 : autoDPR); }
try {
  const stored = JSON.parse(localStorage.getItem(META_KEY) || '{}');
  meta.completed = Array.isArray(stored.completed) ? stored.completed.filter(v => Number.isInteger(v) && v >= 0 && v < LEVELS.length) : [];
  meta.active = Number.isInteger(stored.active) ? clamp(stored.active, 0, LEVELS.length - 1) : 0;
  meta.sandbox = stored.sandbox === true;
  meta.seen = Array.isArray(stored.seen) ? stored.seen.filter(v => Number.isInteger(v) && v >= 0 && v < LEVELS.length) : [];
  saves = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (!saves || typeof saves !== 'object' || Array.isArray(saves)) saves = {};
} catch { storageAvailable = false; }

function buildingName(type) { return definitions[type]?.name || type.replaceAll('_', ' ').replaceAll('-', ' '); }
function categoryOf(type) {
  if (/datacenter|server|cooling|gpu|cpu|storage/.test(type)) return 'compute';
  const meta = definitions[type] || {};
  const c = String(meta.category || '').toLowerCase();
  if (/compute|server|hardware/.test(c)) return 'compute';
  if (/power|energy|utility/.test(c)) return 'power';
  if (/network|data|telecom|communication/.test(c)) return 'network';
  if (/city|residen|business/.test(c)) return 'city';
  return /data.?center|server|cooling|gpu|cpu|storage/.test(type) ? 'compute' : /tower|fiber|cat6|router|switch|firewall|satellite|gateway|network|data/.test(type) ? 'network' : /home|house|residen|business|office|park/.test(type) ? 'city' : 'power';
}
function allCells() { return state?.cells || []; }
function cellAt(x, y) { return allCells().filter(cell => cell.x === x && cell.y === y); }
function cellById(id) { return allCells().find(cell => cell.id === id); }
function statusFor(cell) {
  const source = analysis?.buildings;
  return source instanceof Map ? source.get(cell.id) || {} : source?.[cell.id] || {};
}
function isAssetActive(cell, status = statusFor(cell)) {
  const def = definitions[cell.type];
  if (cell.health < 30) return false;
  if (def.layer === 'data') return status.dataConnected;
  if (def.layer === 'power') return status.connected;
  if (def.category === 'city') return status.served >= .95;
  return status.powered && (!/tower|datacenter|router|switch|gateway|leo/.test(cell.type) || status.dataConnected);
}
function level() { return LEVELS[state?.levelIndex ?? meta.active] || LEVELS[0]; }
function currentKey() { return sandbox ? 'sandbox' : String(state?.levelIndex ?? meta.active); }
function costOf(type) { return Number(definitions[type]?.cost || 0); }
function maxTier(type) { return Number(definitions[type]?.maxTier || definitions[type]?.tierMax || 3); }
function unlocked(type) {
  if (sandbox) return true;
  if (typeof Engine.isUnlocked === 'function') return Engine.isUnlocked(state, type);
  const unlock = definitions[type]?.unlockLevel ?? definitions[type]?.unlock ?? 0;
  return (state.levelIndex || 0) >= Number(unlock);
}
function credits() { return Number(state.credits ?? state.money ?? 0); }
function toast(message, error = false) {
  const el = $('#toast'); clearTimeout(toastTimer); el.textContent = message;
  el.className = `toast visible${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => el.classList.remove('visible'), error ? 4200 : 3000);
}
function log(message, kind = '') {
  logs.unshift({ message, kind, time: state?.elapsed || 0 }); logs = logs.slice(0, 40); renderLogs();
}
function timeText(seconds) { const value = Math.floor(Number(seconds) || 0); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
function renderLogs() {
  $('#event-feed').innerHTML = logs.slice(0, 8).map(item => `<p class="${esc(item.kind)}"><time>${timeText(item.time)}</time>${esc(item.message)}</p>`).join('') || '<p>Your city is waiting for its first connection.</p>';
}
function saveCity(manual = false) {
  if (!state) return;
  try {
    saves[currentKey()] = Engine.serialize(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves)); localStorage.setItem(META_KEY, JSON.stringify(meta));
    storageAvailable = true; $('#hud-save').textContent = 'Saved in this browser';
    if (manual) { toast('City saved. Your next chapter can wait.'); playSound('click'); }
  } catch {
    storageAvailable = false; $('#hud-save').textContent = 'Playing without autosave';
    if (manual) toast('Browser storage is unavailable. This city will last for the current visit.', true);
  }
}
function newGame(index, free = false) {
  if (free && typeof Engine.createSandbox === 'function') return Engine.createSandbox();
  return Engine.createGame(index, { sandbox: free });
}
function loadCity(index, free = false, fresh = false) {
  if (state) saveCity();
  sandbox = free;
  const key = free ? 'sandbox' : String(index);
  let restored;
  if (!fresh && saves[key]) {
    try { restored = Engine.restoreGame(saves[key]); if (restored?.state) restored = restored.state; } catch { restored = null; }
  }
  state = restored?.cells ? restored : newGame(index, free);
  if (!free) Engine.setRegionalLinks(state, Math.min(LEVELS.length - 1, meta.completed.filter(city => city !== index).length));
  meta.active = index; meta.sandbox = free; selectedId = null; tool = null; mode = 'select'; hover = { x: 0, y: 0 };
  paused = false; lastTime = 0; analysis = Engine.analyze(state); logs = []; lastEngineEvent = -1;
  setMode('select'); setPaused(false); renderCatalog(); renderMission(); renderHUD(); renderInspector(true); renderOperations(true); fitMap(); focusStarterOnPhone(); renderCampaign();
  log(restored?.cells ? 'Welcome back. Your city is right where you left it.' : free ? 'Sandbox opened. Build, connect and experiment.' : `Welcome to ${level().name || level().title || `Region ${index + 1}`}.`, 'success');
  $('#city-name').textContent = free ? 'Your open world' : level().name || level().title || `Region ${index + 1}`;
  $('#header-region').textContent = free ? 'SANDBOX / OPEN WORLD' : level().region || level().name || `REGION ${index + 1}`;
  $('#mission-number').textContent = free ? 'SANDBOX / ALL SYSTEMS UNLOCKED' : `REGION ${String(index + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`;
  saveCity(); draw();
  if (!free && !meta.seen.includes(index)) requestAnimationFrame(() => showStory(index));
}
function showStory(index = state.levelIndex, complete = false) {
  const chapter = CHAPTERS[index], mission = LEVELS[index];
  if (!chapter) return;
  if (!meta.seen.includes(index)) { meta.seen.push(index); saveCity(); }
  $('#story-chapter').textContent = `${chapter.milestone ? '✦ MILESTONE · ' : ''}CHAPTER ${String(index + 1).padStart(2, '0')} · ${mission.name}`;
  $('#story-title').textContent = complete ? `Connection restored: ${mission.name}` : chapter.title;
  $('#story-dialog').classList.toggle('rainbow-milestone', chapter.milestone);
  $('#story-content').innerHTML = `<p>${esc(complete ? chapter.completion : chapter.briefing)}</p>${complete ? `<div class="story-reward">✦ +${chapter.xp} CAMPAIGN XP <small>${fmt(campaignXP(meta.completed))} total XP · ${meta.completed.length} / ${LEVELS.length} chapters complete</small></div>` : `<div class="story-task"><b>YOUR FIELD NOTES</b><p>${esc(chapter.hint)}</p></div>`}`;
  $('#story-log').innerHTML = `<h3>YOUR CHAPTER LOG · ${fmt(campaignXP(meta.completed))} XP</h3>${[...new Set([...meta.seen, ...meta.completed])].sort((a,b) => a-b).map(i => `<button data-story-chapter="${i}">${meta.completed.includes(i) ? '✓' : '→'} ${String(i + 1).padStart(2,'0')} · ${esc(CHAPTERS[i].title)}${CHAPTERS[i].milestone ? ' ✦' : ''}</button>`).join('')}`;
  $('#story-begin').textContent = complete ? 'CONTINUE BUILDING →' : 'BEGIN MISSION →';
  if (!$('#story-dialog').open) $('#story-dialog').showModal();
}
function doAction(name, ...args) {
  if (typeof Engine[name] !== 'function') return { ok: false, message: 'This action is not available.' };
  const result = Engine[name](state, ...args);
  if (!result?.ok) { toast(result?.message || 'That action cannot be completed here.', true); playSound('hit'); return result; }
  analysis = Engine.analyze(state); renderHUD(); renderInspector(true); renderOperations(true); renderMission(); renderCatalog(); draw(); saveCity();
  const message = result.message || 'City updated.'; toast(message); log(message, 'success'); playSound(name === 'placeBuilding' ? 'start' : 'click');
  return result;
}

// Pixel artwork stays local and is shared by the map and the construction catalog.
function drawBuilding(target, type, x, y, size, tier = 1, condition = {}, time = 0) {
  target.save(); target.translate(x, y); target.scale(size / 32, size / 32); target.imageSmoothingEnabled = false;
  const r = (x, y, w, h, color) => { target.fillStyle = color; target.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const poly = (points, color) => { target.fillStyle = color; target.beginPath(); points.forEach(([x, y], i) => i ? target.lineTo(Math.round(x), Math.round(y)) : target.moveTo(Math.round(x), Math.round(y))); target.closePath(); target.fill(); };
  const family = `${type} ${buildingName(type)}`.toLowerCase();
  const cable = /cable|fiber|cat.?6|power.?line|power.?link|data.?link/.test(family);
  if (!cable) { r(3, 28, 29, 4, '#173c3788'); r(2, 27, 27, 3, '#b9b798'); r(3, 29, 27, 2, '#696e64'); }
  if (cable) {
    const color = /fiber/.test(family) ? '#82dfe5' : /cat.?6/.test(family) ? '#eeb875' : /data|network/.test(family) ? '#83cfea' : '#e3d077';
    const track = /fiber|cat.?6|data|network/.test(family) ? 19 : 11;
    r(0, track - 1, 32, 4, '#31473e'); r(track - 1, 0, 4, 32, '#31473e'); r(0, track, 32, 2, color); r(track, 0, 2, 32, color); r(track - 2, track - 2, 6, 6, '#738570'); r(track, track, 2, 2, color);
  } else if (/solar/.test(family)) {
    r(7, 24, 3, 5, '#334e48'); r(23, 24, 3, 5, '#334e48'); r(3, 8, 27, 17, '#b1c5b4'); r(5, 10, 23, 13, '#426e99');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) r(6 + i * 6, 11 + j * 6, 4, 4, (i + j) % 2 ? '#6f9cbb' : '#5682ad');
  } else if (/wind/.test(family)) {
    r(14, 12, 4, 17, '#a3bfc0'); r(14, 13, 2, 15, '#d8e4dd'); r(11, 29, 10, 2, '#627f77');
    const angle = time * 1.2;
    for (let i = 0; i < 3; i++) { const a = angle + i * Math.PI * 2 / 3; poly([[16, 12], [16 + Math.cos(a) * 13, 12 + Math.sin(a) * 11], [16 + Math.cos(a + .35) * 9, 12 + Math.sin(a + .35) * 9]], '#d8e6df'); }
    r(14, 10, 4, 4, '#7b9b9c');
  } else if (/hydro|dam/.test(family)) {
    r(1, 5, 30, 23, '#4d9ba2'); for (let i = 0; i < 4; i++) r(2 + (i * 7 + Math.floor(time * 3)) % 20, 7 + i * 5, 9, 1, '#a0dfd5');
    r(8, 6, 17, 23, '#91aba4'); r(9, 7, 15, 4, '#c1d1be'); for (let i = 0; i < 3; i++) { r(10 + i * 5, 14, 3, 15, '#426778'); r(11 + i * 5, 17, 1, 13, '#a0e5d8'); }
  } else if (/nuclear/.test(family)) {
    r(3, 25, 27, 5, '#738a7c'); poly([[3, 25], [7, 17], [7, 9], [15, 9], [15, 17], [19, 25]], '#b7b6a4'); poly([[17, 26], [21, 18], [21, 12], [27, 12], [27, 18], [31, 26]], '#9fada2');
    r(7, 8, 8, 3, '#d8d7bf'); r(21, 11, 6, 3, '#d1d5bd'); r(9, 17, 4, 3, '#859678');
    const float = Math.floor(time) % 3; r(8, 4 - float, 7, 3, '#c5d8cc88'); r(22, 6 - float, 5, 3, '#c5d8cc88');
  } else if (/battery|ups/.test(family)) {
    r(8, 5, 17, 24, '#a3b4a3'); r(12, 2, 9, 3, '#c9d5b7'); r(10, 7, 13, 20, '#2f5d51');
    for (let i = 0; i < 4; i++) r(12, 10 + i * 4, 9, 2, '#92db8a'); r(25, 11, 3, 3, '#e8cc68');
  } else if (/substation|transformer/.test(family)) {
    r(3, 23, 27, 7, '#7e9686'); r(6, 10, 9, 16, '#9cae9c'); r(18, 14, 9, 12, '#b5b49b');
    for (let i = 0; i < 3; i++) { r(7 + i * 3, 5, 1, 7, '#dcd8bd'); r(5 + i * 3, 7, 5, 2, '#6b8c7e'); } r(21, 10, 2, 5, '#dcd8bd'); r(8, 16, 5, 6, '#e7d177');
  } else if (/satellite|leo|gateway|ground.?station/.test(family)) {
    r(13, 18, 4, 11, '#bbc7bd'); r(8, 28, 16, 3, '#7d9691'); poly([[5, 5], [11, 7], [17, 12], [24, 12], [21, 17], [14, 19], [8, 15]], '#ced9d2');
    r(15, 4, 2, 12, '#7b98a5'); r(14, 3, 4, 3, '#95e4e5'); r(24, 5, 4, 2, '#6ec8e0'); r(27, 8, 2, 4, '#6ec8e0');
  } else if (/tower|3g|4g|5g/.test(family)) {
    const color = /5g/.test(family) ? '#b6a3e8' : /4g/.test(family) ? '#77d9d0' : '#d4c083';
    poly([[8, 29], [14, 5], [18, 5], [24, 29], [21, 29], [16, 10], [11, 29]], '#a4b8bc'); r(11, 23, 10, 2, '#7e99a4'); r(12, 17, 8, 2, '#7e99a4'); r(14, 7, 4, 6, color); r(15, 2, 2, 5, '#d3ded6');
    if (motion) { const ring = 5 + Math.floor(time * 2) % 4; r(15 - ring, 6, 2, 4, color); r(17 + ring, 6, 2, 4, color); }
  } else if (/router|switch/.test(family)) {
    r(3, 14, 27, 13, '#829da8'); r(4, 15, 25, 3, '#b2c4c7'); r(5, 20, 4, 3, '#263f54'); r(11, 20, 4, 3, '#263f54'); r(17, 20, 4, 3, '#263f54'); r(24, 20, 2, 2, '#b3ed8a');
    if (/router/.test(family)) { r(6, 4, 2, 10, '#afc1c7'); r(25, 5, 2, 9, '#afc1c7'); }
  } else if (/firewall/.test(family)) {
    r(3, 8, 27, 21, '#b17877'); for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) r(4 + col * 7 + row % 2 * 3, 9 + row * 5, 5, 3, row % 2 ? '#d49d8b' : '#c88a87');
    r(13, 13, 7, 10, '#fad39a'); r(15, 15, 3, 6, '#a75e65');
  } else if (/cooling/.test(family)) {
    r(4, 6, 25, 24, '#81a6b3'); r(6, 8, 21, 18, '#bad0d3'); r(10, 11, 13, 13, '#4d7485');
    const a = time * 2; for (let i = 0; i < 4; i++) { const angle = a + i * Math.PI / 2; r(15 + Math.cos(angle) * 4, 16 + Math.sin(angle) * 4, 4, 4, '#9cd3da'); } r(15, 16, 3, 3, '#d3eeeb');
  } else if (/data.?center|server|compute|gpu|cpu|storage/.test(family)) {
    r(2, 6, 28, 24, '#66869c'); r(3, 8, 2, 20, '#b4d1d2'); r(26, 8, 4, 22, '#3d6179'); r(4, 3, 25, 5, '#c2d9cc'); r(8, 1, 7, 3, '#6c949b'); r(18, 1, 7, 3, '#6c949b'); r(9, 2, 5, 1, '#cde4da'); r(5, 10, 7, 18, '#22374e'); r(14, 10, 7, 18, '#22374e'); r(23, 10, 5, 18, '#22374e');
    for (let row = 0; row < 4; row++) { r(6, 12 + row * 4, 4, 1, '#8ddde2'); r(15, 12 + row * 4, 4, 1, '#8ddde2'); r(24, 12 + row * 4, 2, 1, '#b5da8b'); }
  } else if (/home|house|residen/.test(family)) {
    const roofs = ['#dc7969','#608fa9','#d3a95f','#8b82ba'], roof = roofs[(condition.variant || 0) % roofs.length], glass = condition.active ? '#ffe6a2' : '#8bcee1';
    r(4, 13, 24, 16, '#f1d7a8'); r(23, 14, 5, 15, '#baa987'); poly([[1, 14], [15, 2], [31, 14]], '#714f50'); poly([[2, 12], [15, 1], [29, 12]], roof); r(6, 10, 19, 2, '#f0b199'); r(13, 19, 6, 10, '#5b7176'); r(14, 20, 4, 6, '#3e565f'); r(17, 24, 1, 1, '#f7ce6d'); r(6, 17, 5, 6, '#608591'); r(7, 18, 3, 4, glass); r(21, 17, 5, 6, '#608591'); r(22, 18, 3, 4, glass); r(23, 3, 3, 6, '#8d655d'); r(22, 3, 5, 2, '#e0b9a0'); r(6, 24, 5, 2, '#629664'); r(7, 23, 1, 2, '#ed9eac'); r(10, 23, 1, 2, '#f6d35c'); r(12, 29, 9, 2, '#e2d5b3');
  } else if (/business|office|commercial/.test(family)) {
    r(5, 5, 22, 25, '#8d95b5'); r(7, 3, 18, 3, '#c0c2d2'); for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) r(8 + col * 6, 8 + row * 6, 3, 4, '#d2d5b8'); r(14, 26, 5, 4, '#43566c');
  } else if (/park/.test(family)) {
    r(3, 26, 27, 3, '#739869'); r(13, 14, 4, 13, '#8e7a60'); r(6, 8, 19, 12, '#7dae79'); r(10, 4, 13, 6, '#a3ca8b'); r(5, 14, 8, 5, '#63936d'); r(22, 23, 5, 2, '#e5be8c');
  } else {
    const gas = /gas|backup|generator/.test(family);
    r(3, 15, 27, 15, gas ? '#9c9d81' : '#858b7b'); r(5, 12, 20, 4, '#bfc5a7'); r(6, 5, 5, 11, gas ? '#d5aa7d' : '#677368'); r(6, 4, 5, 3, '#e0b894'); r(20, 8, 5, 8, '#a0947b'); r(8, 20, 5, 4, '#e4ce9b'); r(17, 20, 7, 8, '#4e6e6a');
    if (motion) r(5, 1 + Math.floor(time) % 3, 6, 2, '#c6d3bf66');
  }
  if (!cable && tier > 1) { r(24, 0, 8, 7, '#263c4b'); target.fillStyle = '#f6dc8d'; target.font = '6px monospace'; target.fillText(String(tier), 26, 6); }
  if (condition.warning) { r(0, 1, 5, 5, '#e6a08d'); r(2, 2, 1, 2, '#6b3f3b'); }
  target.restore();
}

const iconCache = new Map();
function iconFor(type) {
  if (!iconCache.has(type)) { const icon = document.createElement('canvas'); icon.width = icon.height = 64; drawBuilding(icon.getContext('2d'), type, 0, 0, 64); iconCache.set(type, icon.toDataURL()); }
  return iconCache.get(type);
}
function renderCatalog() {
  $('#build-catalog').innerHTML = entries.filter(([type]) => categoryOf(type) === category).map(([type, def]) => {
    const available = unlocked(type), unlock = Number(def.unlockLevel ?? def.unlock ?? 0);
    return `<button class="build-card${tool === type ? ' selected' : ''}" data-build="${esc(type)}" ${available ? '' : 'disabled'} aria-pressed="${tool === type}" title="${esc(def.description || buildingName(type))}"><img class="building-icon" src="${iconFor(type)}" alt=""><span><span class="build-card-name">${esc(buildingName(type))}</span><span class="build-card-cost">${fmt(costOf(type))} CR <small>${available ? `MAX T${maxTier(type)}` : `REGION ${unlock + 1}`}</small></span></span>${available ? '' : '<span class="build-card-unlock">LOCKED</span>'}</button>`;
  }).join('') || '<p class="inspector-description">New infrastructure unlocks as your region grows.</p>';
}
function selectTool(type) {
  if (!unlocked(type)) return;
  tool = type; mode = 'build'; selectedId = null;
  $$('.mode-buttons button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
  renderCatalog(); const def = definitions[type];
  $('#tool-description').innerHTML = `<b>${esc(buildingName(type))} · ${fmt(costOf(type))} CR</b><p>${esc(def.description || 'Place on an available tile to expand your infrastructure.')}</p>`;
  $('#selected-tool-name').textContent = `+ ${buildingName(type).toUpperCase()}`;
  $('#map-hint').textContent = `Tap a tile to build ${buildingName(type)} · ${fmt(costOf(type))} CR`;
  viewport.style.cursor = 'crosshair'; closeMobilePanel(); playSound('click'); draw();
}
function setMode(next) {
  mode = next; tool = null;
  $$('.mode-buttons button').forEach(b => { const on = b.dataset.mode === next; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); });
  $('#selected-tool-name').textContent = next === 'pan' ? '✥ PAN MODE' : next === 'demolish' ? '⌫ SELL MODE' : '↖ SELECT MODE';
  $('#map-hint').textContent = next === 'pan' ? 'Drag the map to explore. Scroll or use + / − to zoom.' : next === 'demolish' ? 'Select an asset, then confirm its sale in the inspector.' : 'Select a building to inspect it, or choose a construction tool.';
  viewport.style.cursor = next === 'pan' ? 'grab' : 'default'; renderCatalog();
}
function renderHUD() {
  if (!analysis) return;
  const power = analysis.power || {}, data = analysis.data || {};
  const income = Number(analysis.income ?? analysis.economy?.income ?? 0), maintenance = Number(analysis.maintenance ?? analysis.economy?.maintenance ?? 0);
  const net = Number(analysis.net ?? analysis.economy?.net ?? income - maintenance);
  $('#hud-credits').textContent = fmt(credits()); $('#hud-net').textContent = `${net >= 0 ? '+' : ''}${Number(net.toFixed(1))} CR / min`;
  $('#hud-credits').closest('.hud-item').title = `Revenue ${fmt(income)} CR/min · Operating costs ${fmt(maintenance)} CR/min`;
  $('#hud-net').className = net < 0 ? 'is-negative' : 'is-positive';
  $('#hud-power').textContent = `${fmt(power.generation)} / ${fmt(power.demand)}`;
  $('#hud-power-detail').textContent = `${fmt(power.served)} demand served`;
  $('#hud-power').closest('.hud-item').classList.toggle('is-warning', Number(power.served) + .01 < Number(power.demand));
  $('#hud-data').textContent = `${fmt(data.served)} / ${fmt(data.demand)}`;
  $('#hud-data-detail').textContent = `${fmt(data.capacity ?? data.supply ?? data.generation ?? 0)} network capacity`;
  $('#hud-population').textContent = fmt(analysis.population ?? state.population ?? analysis.stats?.population ?? 0);
  $('#hud-pop-detail').textContent = `${fmt(analysis.customers)} customers · ${fmt(analysis.service)}% service`;
  $('#campaign-xp').textContent = `✦ ${fmt(campaignXP(meta.completed))} XP`;
  $('#mission-number').classList.toggle('rainbow-badge', !sandbox && CHAPTERS[state.levelIndex]?.milestone);
  $('#hud-buildings').textContent = fmt(allCells().length); $('#hud-buildings-detail').textContent = `Region ${sandbox ? '∞' : (state.levelIndex || 0) + 1}`;
  $('#hud-time').textContent = timeText(state.elapsed); $('#hud-save').textContent = storageAvailable ? 'Autosave enabled' : 'This visit only';
  $('#footer-status').textContent = `${sandbox ? 'Sandbox' : `${meta.completed.length} / ${LEVELS.length} regions complete`} · ${paused ? 'Paused' : `Simulation ${speed}×`}`;
}
function objectives() { try { return Engine.getObjectives(state) || []; } catch { return []; } }
function renderMission() {
  const mission = level();
  $('#mission-title').textContent = sandbox ? 'Build without boundaries.' : mission.name || mission.title || 'Your next chapter';
  $('#mission-description').textContent = sandbox ? 'Every building is available. Experiment with your energy mix, test network designs, and create a city that works your way.' : mission.description || mission.brief || 'Connect the city and complete every objective to unlock the next region.';
  $('#mission-region').textContent = sandbox ? 'OPEN WORLD / SANDBOX' : `CAMPAIGN / CHAPTER ${String((state.levelIndex || 0) + 1).padStart(2, '0')}`;
  $('#mission-art-label').textContent = sandbox ? 'YOUR WORLD. YOUR WAY.' : mission.region || mission.name || 'THE NEXT CONNECTION';
  $('.mission-art').classList.toggle('satellite-active', allCells().some(cell => cell.type === 'leo' && isAssetActive(cell)));
  $('#starter-guide').hidden = sandbox || state.levelIndex !== 0 || state.missionComplete;
  $('#mission-complete p').textContent = CHAPTERS[state.levelIndex]?.completion || 'This city is connected.';
  const items = sandbox ? [] : objectives();
  $('#mission-objectives').innerHTML = items.map(item => {
    const progress = item.complete ? 1 : clamp(Number(item.current) / Math.max(1, Number(item.target)), 0, 1);
    return `<div class="objective${item.complete ? ' complete' : ''}"><div class="objective-top"><span class="objective-check">${item.complete ? '✓' : ''}</span><span>${esc(item.label)}</span><small class="objective-value">${fmt(item.current)} / ${fmt(item.target)}</small></div><div class="objective-bar"><span style="width:${Math.round(progress * 100)}%"></span></div></div>`;
  }).join('');
  const complete = !sandbox && state.missionComplete === true;
  $('#mission-complete').hidden = !complete;
  if (complete && !meta.completed.includes(state.levelIndex)) {
    meta.completed.push(state.levelIndex); Engine.setRegionalLinks(state, Math.min(LEVELS.length - 1, meta.completed.filter(city => city !== state.levelIndex).length)); saveCity(); log('Mission complete! A new region is ready to connect.', 'success'); toast('Mission complete. Your next region is unlocked.'); playSound('win'); renderCampaign(); requestAnimationFrame(() => showStory(state.levelIndex, true));
  }
  $('#next-mission').textContent = state.levelIndex >= LEVELS.length - 1 ? 'EXPLORE YOUR REGIONS →' : 'NEXT REGION →';
}
function repairCost(cell) { return Engine.getRepairCost?.(state, cell) ?? 0; }
function upgradeCost(cell) { return Engine.getUpgradeCost?.(state, cell) ?? 0; }
function hardwareMarkup(cell) {
  if (cell.type !== 'datacenter') return '';
  return `<section class="hardware-upgrades"><h3>DATA-CENTER HARDWARE</h3>${Object.entries(Engine.MODULES || {}).map(([key, module]) => {
    const tier = Number(cell.modules?.[key] || 1), unlocked = sandbox || state.levelIndex >= module.unlockLevel;
    const cost = Engine.getModuleUpgradeCost(state, cell, key);
    return `<button data-hardware="${esc(key)}" title="${esc(module.description)}" ${!unlocked || tier >= module.tierMax || credits() < cost ? 'disabled' : ''}><span><b>${esc(module.name)}</b><small>${unlocked ? `T${tier} / ${module.tierMax}` : `UNLOCKS REGION ${module.unlockLevel + 1}`}</small></span><strong>${tier >= module.tierMax ? 'MAX' : `${fmt(cost)} CR ↑`}</strong></button>`;
  }).join('')}<p>CPU, GPU and storage add demand and heat. Keep cooling balanced to avoid throttling.</p></section>`;
}
function renderOperations(force = false) {
  if (!state || !analysis || !force && $('#operator-panel').contains(document.activeElement)) return;
  $('#service-price').value = state.servicePrice || 1;
  $('#service-price-label').textContent = `${Number(state.servicePrice || 1).toFixed(2)}×`;
  $('#service-metrics').innerHTML = [['Customers', fmt(analysis.customers)], ['Service', `${fmt(analysis.service)}%`], ['Revenue', `${fmt(analysis.income)} / min`], ['Operating cost', `${fmt(analysis.maintenance)} / min`], ['Compute', `${fmt(analysis.compute)} units`], ['Heat', `${fmt(analysis.heat)} units`]].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#operator-list').innerHTML = Object.entries(Engine.AUTOMATIONS || {}).map(([key, def]) => {
    const owned = state.automations?.[key], available = sandbox || state.levelIndex >= def.unlockLevel;
    const price = owned ? Engine.getAutomationUpgradeCost(state, key) : def.cost;
    return `<article class="operator-card"><div><span class="operator-symbol">${key === 'maintenance' ? '⚙' : key === 'operator' ? 'ϟ' : '⌁'}</span><h3>${esc(def.name)}</h3><small>${owned ? `TIER ${owned.tier} / ${def.tierMax}` : available ? 'AVAILABLE' : `REGION ${def.unlockLevel + 1}`}</small></div><p>${esc(def.description)}</p>${owned ? `<label class="operator-toggle"><input type="checkbox" data-operator-toggle="${key}" ${owned.enabled ? 'checked' : ''}> Operator enabled</label><label class="reserve-label">RESERVE CREDITS <input type="number" min="0" max="1000000" step="50" value="${owned.reserve}" data-operator-reserve="${key}"></label>` : ''}<button data-operator-action="${owned ? 'upgrade' : 'buy'}" data-operator="${key}" ${!available || credits() < price || owned?.tier >= def.tierMax ? 'disabled' : ''}>${owned?.tier >= def.tierMax ? 'MAXIMUM TIER' : `${owned ? 'UPGRADE' : 'HIRE OPERATOR'} · ${fmt(price)} CR`}</button></article>`;
  }).join('');
}
function selectCell(cell) {
  selectedId = cell?.id ?? null; setManagement('inspect'); renderInspector(true);
  if (window.innerWidth <= 900) openMobilePanel('inspect');
}
function renderInspector(force = false) {
  if (!force && $('#inspector-content').contains(document.activeElement)) return;
  const cell = cellById(selectedId);
  $('#inspector-empty').hidden = Boolean(cell); $('#inspector-content').hidden = !cell;
  if (!cell) return;
  const def = definitions[cell.type] || {}, status = statusFor(cell), tier = Number(cell.tier || 1), health = Number(cell.health ?? 100);
  const active = isAssetActive(cell, status);
  const sameTile = cellAt(cell.x, cell.y);
  const upgradePrice = upgradeCost(cell), repairPrice = repairCost(cell), tierLocked = !sandbox && state.levelIndex < tier;
  const capacityItem = cell.type === 'battery' ? ['Stored energy', `${fmt(cell.energy)} kWs`] : def.layer === 'power' || cell.type === 'substation' ? ['Grid capacity', `${fmt(status.capacity)} kW`] : def.category === 'city' ? ['Coverage', `${fmt(status.coverage * 100)}%`] : ['Data capacity', `${fmt(status.capacity ?? def.capacity ?? 0)} Mbps`];
  const linkItem = def.category === 'power' ? ['Grid connection', status.connected ? 'CONNECTED' : 'ISOLATED'] : ['Backhaul', status.dataConnected ? 'CONNECTED' : def.category === 'city' ? 'WIRELESS SERVICE' : 'NO DATA LINK'];
  const detailEntries = [['Health', `${Math.round(health)}%`], ['Tier', `${tier} / ${maxTier(cell.type)}`], ['Power', def.output ? `${fmt(status.output)} kW` : `${fmt(status.demand)} kW / ${status.powered ? 'ON' : 'OFF'}`], capacityItem, linkItem, ['Service', `${fmt((status.served ?? 0) * 100)}%`]];
  $('#inspector-content').innerHTML = `<div class="inspector-title"><img class="building-icon" src="${iconFor(cell.type)}" alt=""><div><h2>${esc(buildingName(cell.type))}</h2><p>TIER ${tier} / ${categoryOf(cell.type).toUpperCase()}</p></div></div><p class="inspector-description">${esc(def.description || '')}</p><div class="asset-status${active ? '' : ' warning'}">${active ? '● System operational' : '● Needs attention'}${status.status ? ` · ${esc(status.status)}` : ''}</div><div class="inspector-stats">${detailEntries.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>${sameTile.length > 1 ? `<label class="asset-coordinates">ASSETS ON THIS TILE<select id="asset-layer">${sameTile.map(c => `<option value="${esc(c.id)}" ${c.id === cell.id ? 'selected' : ''}>${esc(buildingName(c.type))}</option>`).join('')}</select></label>` : ''}<div class="inspector-actions"><button id="upgrade-asset" ${tier >= maxTier(cell.type) || tierLocked || credits() < upgradePrice ? 'disabled' : ''}>${tier >= maxTier(cell.type) ? 'MAXIMUM TIER' : tierLocked ? `REGION ${tier + 1} UNLOCK` : '↑ UPGRADE'}<small>${tier >= maxTier(cell.type) ? '' : `${fmt(upgradePrice)} CR`}</small></button><button id="repair-asset" ${health >= 100 || credits() < repairPrice ? 'disabled' : ''}>↻ REPAIR<small>${health >= 100 ? 'HEALTHY' : `${fmt(repairPrice)} CR`}</small></button><button id="sell-asset" class="sell-asset">⌫ SELL ASSET<small>${fmt(Engine.getSellValue(state, cell))} CR</small></button></div>${hardwareMarkup(cell)}<p class="asset-coordinates">TILE ${cell.x + 1} / ${cell.y + 1} · ASSET ${esc(cell.id)}</p>`;
  $('#upgrade-asset').onclick = () => doAction('upgradeBuilding', cell.id);
  $('#repair-asset').onclick = () => doAction('repair', cell.id);
  $('#sell-asset').onclick = () => { const result = doAction('demolish', cell.id); if (result?.ok) { selectedId = null; renderInspector(); } };
  if ($('#asset-layer')) $('#asset-layer').onchange = event => { selectedId = sameTile.find(c => String(c.id) === event.target.value)?.id; renderInspector(true); draw(); };
}
function setManagement(next) {
  management = next; $$('.management-tabs [data-management]').forEach(button => { const on = button.dataset.management === next; button.classList.toggle('selected', on); button.setAttribute('aria-pressed', String(on)); });
  $('#mission-panel').hidden = next !== 'mission'; $('#inspector-panel').hidden = next !== 'inspect'; $('#operator-panel').hidden = next !== 'operate'; if (next === 'operate') renderOperations(true);
}
function renderCampaign() {
  const unlockedIndex = Math.max(0, ...meta.completed.map(v => v + 1));
  $('#campaign-grid').innerHTML = LEVELS.map((mission, index) => `<button class="campaign-card${CHAPTERS[index]?.milestone ? ' rainbow-milestone' : ''}${!sandbox && state?.levelIndex === index ? ' current' : ''}${meta.completed.includes(index) ? ' completed' : ''}" data-region="${index}" ${index > unlockedIndex ? 'disabled' : ''}><span class="campaign-number">${CHAPTERS[index]?.milestone ? '✦ MILESTONE' : 'REGION'} ${String(index + 1).padStart(2, '0')}</span><strong>${esc(mission.name || mission.title || `Region ${index + 1}`)}</strong><small>${esc(mission.region || mission.description || 'A new infrastructure challenge')}</small><span class="campaign-status">${meta.completed.includes(index) ? '✓ COMPLETED / REVISIT' : index > unlockedIndex ? 'LOCKED / KEEP BUILDING' : saves[String(index)] ? '↳ CONTINUE CITY' : '→ BEGIN CHAPTER'}</span></button>`).join('');
}
function setPaused(value) { paused = value; $('#pause-button').textContent = value ? '▶' : 'Ⅱ'; $('#pause-button').setAttribute('aria-pressed', String(value)); $('#pause-button').title = value ? 'Resume simulation' : 'Pause simulation'; $('#paused-badge').hidden = !value; lastTime = 0; renderHUD(); }
function openMobilePanel(name) { document.body.dataset.mobilePanel = name; if (name === 'mission' || name === 'inspect') setManagement(name); $$('.mobile-navigation button').forEach(b => b.classList.toggle('selected', b.dataset.mobilePanel === name)); }
function closeMobilePanel() { document.body.dataset.mobilePanel = 'map'; $$('.mobile-navigation button').forEach(b => b.classList.toggle('selected', b.dataset.mobilePanel === 'map')); }

function resizeMap() {
  const box = viewport.getBoundingClientRect(); if (!box.width || !box.height) return;
  if (hasFit) { camera.x += (box.width - cssWidth) / 2; camera.y += (box.height - cssHeight) / 2; }
  cssWidth = box.width; cssHeight = box.height; const ratio = renderRatio();
  canvas.width = Math.round(cssWidth * ratio); canvas.height = Math.round(cssHeight * ratio);
  if (!hasFit) fitMap(); draw();
}
function focusStarterOnPhone() {
  if (!state || !cssWidth) return;
  // Start close to the living town; FIT remains the overview command.
  camera.zoom = cssWidth < 560 ? 1.15 : 1.45;
  camera.x = cssWidth / 2 - (Math.floor(state.width / 2) + .1) * TILE * camera.zoom;
  camera.y = cssHeight / 2 - (Math.floor(state.height / 2) + .5) * TILE * camera.zoom;
  draw();
}
function fitMap() {
  if (!state || !cssWidth || !cssHeight) return;
  camera.zoom = clamp(Math.min((cssWidth - 40) / ((state.width + (angledView ? state.height * .28 : 0)) * TILE), (cssHeight - 65) / (state.height * TILE)), .28, 2);
  camera.x = (cssWidth - state.width * TILE * camera.zoom) / 2; camera.y = (cssHeight - state.height * TILE * camera.zoom) / 2;
  hasFit = true; draw();
}
function zoomAt(factor, x = cssWidth / 2, y = cssHeight / 2) {
  const next = clamp(camera.zoom * factor, .28, 3.2), ratio = next / camera.zoom;
  camera.x = x - (x - camera.x) * ratio; camera.y = y - (y - camera.y) * ratio; camera.zoom = next; draw();
}
function point(event) { const bounds = canvas.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; }
function tilePoint(p) {
  let x = (p.x - camera.x) / camera.zoom, y = (p.y - camera.y) / camera.zoom;
  if (angledView) { y = (y - state.height * TILE * .1) / .8; x += .28 * y - state.height * TILE * .14; }
  return { x: Math.floor(x / TILE), y: Math.floor(y / TILE) };
}
function tileScreenPoint(tile) {
  let x = (tile.x + .5) * TILE, y = (tile.y + .5) * TILE;
  if (angledView) { x += -.28 * y + state.height * TILE * .14; y = y * .8 + state.height * TILE * .1; }
  return { x: x * camera.zoom + camera.x, y: y * camera.zoom + camera.y };
}
function validTile(tile) { return tile.x >= 0 && tile.y >= 0 && tile.x < state.width && tile.y < state.height; }
function actOnTile(tile) {
  if (!validTile(tile)) return;
  hover = tile;
  if (mode === 'build' && tool) { const result = doAction('placeBuilding', tile.x, tile.y, tool); if (result?.ok) $('#map-announcer').textContent = `${buildingName(tool)} built at tile ${tile.x + 1}, ${tile.y + 1}.`; }
  else if (mode !== 'pan') { const found = cellAt(tile.x, tile.y).sort((a, b) => Number(definitions[b.type].layer === 'building') - Number(definitions[a.type].layer === 'building')); const index = found.findIndex(cell => cell.id === selectedId); selectCell(found[index < 0 ? 0 : (index + 1) % found.length]); playSound('click'); }
  draw();
}
// Region-specific, original pixel scenery. Decorative vegetation yields to construction.
const CYBER_BIOME = {grass:['#182748','#1d2d50','#223459'],leaf:['#49336e','#8955a4','#e082cb'],water:'#137d9c',shore:'#506a9b',flower:'#ff75ca',rock:'#7d82ae',sky:'#080e28'};
const BIOMES = [
 {grass:['#79ac59','#7fb75f','#89bf68'],leaf:['#286a49','#438d51','#83c563'],water:'#299fbe',shore:'#c9c58e',flower:'#ffe28b',rock:'#8caa91',sky:'#8dd8f0'},
 {grass:['#72ad6b','#80bb74','#8bc27c'],leaf:['#246b61','#3f9c7e','#89cd8d'],water:'#29aeba',shore:'#dbd5a3',flower:'#f3a5c5',rock:'#9eafa0',sky:'#95def0'},
 {grass:['#89b37a','#93bc81','#9ec58a'],leaf:['#3e655d','#5d8b70','#9ab690'],water:'#68a6b6',shore:'#d8d1b6',flower:'#ece8c4',rock:'#aebbb4',sky:'#b5e3ed'},
 {grass:['#b6b967','#bdc174','#c7c980'],leaf:['#77633f','#b58446','#e2b45c'],water:'#559ba5',shore:'#dbca9a',flower:'#e8a786',rock:'#a3a992',sky:'#f5d49e'},
 {grass:['#a6bcac','#afc2b2','#b6c7b8'],leaf:['#486b68','#638e82','#bfddd2'],water:'#528eab',shore:'#e0e3cd',flower:'#f2d0df',rock:'#b9c9ca',sky:'#d4e7e6'},
 {grass:['#798e8c','#819795','#879d99'],leaf:['#4b6567','#688b83','#8bb3a2'],water:'#487d9d',shore:'#b7c4b0',flower:'#b8c5eb',rock:'#a0b5b2',sky:'#b4c9d9'},
];
function drawScenery(palette, occupied) {
  const cx = Math.floor(state.width / 2), cy = Math.floor(state.height / 2);
  const r = (x,y,w,h,c) => {ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const water = (x,y) => x>=0 && y>=0 && x<state.width && y<state.height && state.terrain?.[y*state.width+x]==='water';
  const road = (x,y) => (y===cy && Math.abs(x-cx)<=6) || (y===cy+3 && Math.abs(x-cx)<=6) || (Math.abs(x-cx)===6 && y>=cy && y<=cy+3);
  const tree = (x,y,n) => {
    r(x+4,y+24,23,5,'#214b3d33'); r(x+13,y+19,4,11,'#775e45'); r(x+14,y+21,2,8,'#a38b5d');
    if ((state.levelIndex >= 8 && state.levelIndex <= 11) || n%4===0) {
      for(let z=0;z<3;z++){const yy=y+2+z*6, w=12+z*6;r(x+16-w/2,yy+4,w,5,palette.leaf[0]);r(x+17-w/2,yy,w-3,6,palette.leaf[1]);r(x+18-w/2,yy,w-7,2,palette.leaf[2]);}
    } else {r(x+6,y+7,21,16,palette.leaf[0]);r(x+3,y+10,24,10,palette.leaf[0]);r(x+7,y+3,17,17,palette.leaf[1]);r(x+4,y+8,20,10,palette.leaf[1]);r(x+9,y+2,10,5,palette.leaf[2]);r(x+6,y+7,7,5,palette.leaf[2]);r(x+22,y+11,5,6,palette.leaf[0]);}
  };
  for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++) {
    const px=x*TILE,py=y*TILE,n=(x*47+y*73+x*y*13+state.levelIndex*31)%101;
    if(water(x,y)) {
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) if(!water(x+dx,y+dy)) {
        r(px+(dx===1?27:0),py+(dy===1?27:0),dx?5:32,dy?5:32,palette.shore);
        r(px+(dx===1?26:dx===-1?5:0),py+(dy===1?26:dy===-1?5:0),dx?1:32,dy?1:32,'#b7e0cb');
      }
      if(n%4===0){r(px+8,py+18,1,7,'#3c795f');r(px+12,py+15,1,10,'#436d52');r(px+11,py+14,3,3,'#ad9770');}
      continue;
    }
    if(overlay!=='normal')continue;
    if(road(x,y)) {
      r(px,py+7,32,18,cyberView?'#36456c':'#cac7a7');r(px,py+10,32,12,cyberView?'#182c48':'#748581');r(px,py+10,32,1,cyberView?'#63e4ed':'#556b68');if(cyberView)r(px,py+22,32,1,'#db66cd');
      if(y===cy+3)r(px+10,py+15,10,1,'#c4cbb1');
      if(Math.abs(x-cx)===6){r(px+10,py,12,32,'#748581');r(px+9,py,1,32,'#c6c9ac');}
    }
    if(occupied.has(`${x},${y}`)||road(x,y))continue;
    const nearTown=Math.abs(x-cx)<5 && y>=cy-2 && y<=cy+2;
    const grove=Math.sin(x*.83+y*.39)+Math.cos(y*.93-x*.24)>.4;
    if(!nearTown && (grove && n<72 || (x<2||y<2||x>state.width-3||y>state.height-3)&&n<75)) {tree(px,py,n);continue;}
    if(n<13) {r(px+9,py+19,15,7,'#4d6a5844');r(px+10,py+16,12,7,palette.rock);r(px+13,py+13,7,5,'#cfceb4');r(px+9,py+20,13,3,'#708b7a');}
    else if(n<38){for(let i=0;i<3;i++){const xx=px+6+i*7, yy=py+8+(n+i*5)%13;r(xx,yy,1,6,'#4d8052');r(xx-1,yy,3,2,i%2?palette.flower:'#e9c2ca');r(xx,yy+3,3,1,'#91b270');}}
    else {r(px+7,py+9,1,4,'#9dc178');r(px+9,py+11,1,2,'#9dc178');if(n%5===0){r(px+18,py+21,5,2,'#94b477');r(px+21,py+19,2,3,'#94b477');}}
  }
  if(overlay!=='normal')return;
  // Village street furniture and moving residents are scenery, not build requirements.
  for(const x of [cx-5,cx+5]){const px=x*TILE,py=(cy+3)*TILE;r(px+3,py-10,2,20,'#53696a');r(px+2,py-13,5,4,'#f8e7a5');r(px+1,py-9,7,2,'#faf0b444');r(px+6,py+27,9,3,'#6c6a50');r(px+7,py+23,7,3,'#bea07b');}
  if(cyberView){
    for(const [xx,label] of [[cx-5,'NOVA'],[cx+4,'01']]){const x=xx*TILE,y=(cy-2)*TILE;if(occupied.has(`${xx},${cy-2}`))continue;r(x+4,y+2,24,19,'#263354');r(x+4,y+2,24,1,'#77f1ed');r(x+4,y+20,24,1,'#ee74d4');r(x+7,y+21,2,10,'#566482');r(x+24,y+21,2,10,'#566482');ctx.fillStyle='#a1f5ee';ctx.font='bold 7px monospace';ctx.fillText(label,x+7,y+14);}
    for(let i=0;i<9;i++){const x=(cx-4)*TILE+i*31,y=(cy+3)*TILE+29;r(x,y,8,1,i%2?'#f08be5':'#75e8e5');}
  }
  const time=motion?animTime:0;
  for(let i=0;i<5;i++){const xx=(cx-4)*TILE+((time*(i%2?7:-5)+i*53+32000)%256),yy=(cy+3)*TILE+(i%2?25:4),step=Math.floor(time*3+i)%2;r(xx-1,yy+6,6,2,'#345c4b44');r(xx,yy,3,3,'#dfb792');r(xx-1,yy+3,5,4,['#cf786c','#7d8fca','#f0ce79','#7cc3b1','#bc8fae'][i]);r(xx,yy+7,1,2+step,'#49606c');r(xx+3,yy+7,1,3-step,'#49606c');}
  const carX=(cx-6)*TILE+((time*11+90)%365),carY=(cy+3)*TILE+12;
  r(carX+1,carY+7,18,3,'#34584d55');r(carX+2,carY,15,7,'#e0b65e');r(carX+6,carY-2,8,5,'#f4d483');r(carX+7,carY-1,6,3,'#97ccd1');r(carX+3,carY+6,3,3,'#3f5053');r(carX+14,carY+6,3,3,'#3f5053');r(carX+17,carY+2,2,2,'#fff3b2');
}
function draw() {
  if (!state || !ctx || !cssWidth) return;
  const ratio = canvas.width / cssWidth;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  const fullW = state.width * TILE, fullH = state.height * TILE;
  if (angledView) ctx.transform(1, 0, -.28, .8, fullH * .14, fullH * .1);
  const palette = cyberView ? CYBER_BIOME : BIOMES[Math.floor(state.levelIndex / 3) % BIOMES.length], occupied = new Set(allCells().map(cell => `${cell.x},${cell.y}`));
  ctx.fillStyle = palette.sky; ctx.fillRect(-600,-600,fullW+1200,fullH+1200);
  if(!cyberView){for(let i=0;i<9;i++){const x=i*143-150+(motion?Math.floor(animTime*2)%70:0),y=-125-(i%3)*58;ctx.fillStyle='#f5fcf0';ctx.fillRect(x,y,67,13);ctx.fillRect(x+12,y-9,37,10);ctx.fillRect(x+24,y-15,19,9);ctx.fillStyle='#c4e9e7';ctx.fillRect(x+4,y+10,59,4);}}
  for(let i=-3;i<15;i++){const xx=i*90, hh=55+((i*i*17+state.levelIndex*11)%65);ctx.fillStyle=cyberView?(i%2?'#1e2951':'#273564'):(i%2?'#739995':'#80a69d');ctx.beginPath();ctx.moveTo(xx,-5);ctx.lineTo(xx+65,-hh);ctx.lineTo(xx+130,-5);ctx.fill();ctx.fillStyle='#d5dfc5';ctx.beginPath();ctx.moveTo(xx+48,-hh+22);ctx.lineTo(xx+65,-hh);ctx.lineTo(xx+85,-hh+25);ctx.lineTo(xx+65,-hh+18);ctx.fill();}
  if(cyberView){for(let i=0;i<24;i++){const x=i*44-70,h=32+(i*37)%91;ctx.fillStyle=i%2?'#111d3c':'#1a294c';ctx.fillRect(x,-h,34,h-5);ctx.fillStyle=i%2?'#e56dc9':'#67d7e1';ctx.fillRect(x,-h,34,1);for(let j=0;j<5;j++)for(let k=0;k<3;k++){ctx.fillStyle=(i+j+k)%3?'#67d7e188':'#e56dc966';ctx.fillRect(x+5+k*8,-h+8+j*14,3,5);}}}
  if (state.levelIndex >= 4 && state.levelIndex <= 7 && !cyberView) {
    ctx.fillStyle='#438ba6';ctx.fillRect(-600,-500,fullW+1200,480);
    ctx.fillStyle='#68b9c2';ctx.fillRect(-600,-90,fullW+1200,65);ctx.fillStyle='#ded5a5';ctx.fillRect(-600,-25,fullW+1200,20);
    for(let i=0;i<34;i++){const wx=i*43-200+(motion?Math.floor(animTime*3)%17:0),wy=-48-(i%5)*39;ctx.fillStyle=i%3?'#a0dfd5':'#d0f1df';ctx.fillRect(wx,wy,19+(i%4)*8,2);}
    ctx.fillStyle='#d5e8db';ctx.fillRect(60,-137,26,5);ctx.fillStyle='#5b7d8c';ctx.fillRect(66,-132,16,3);ctx.fillStyle='#fff2d1';ctx.beginPath();ctx.moveTo(74,-158);ctx.lineTo(74,-138);ctx.lineTo(58,-138);ctx.fill();
  }
  ctx.fillStyle = '#263b38'; ctx.fillRect(-6, -6, fullW + 12, fullH + 12); ctx.fillStyle = '#142c33'; ctx.fillRect(-3, fullH + 6, fullW + 9, 6);
  for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) {
    const n = (x * 37 + y * 61 + (state.levelIndex || 0) * 13) % 19;
    const water = state.terrain?.[y * state.width + x] === 'water';
    ctx.fillStyle = water ? palette.water : overlay === 'normal' ? palette.grass[n % 3] : '#304747';
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.strokeStyle = cyberView ? '#648ac029' : mode === 'build' ? '#284c4260' : '#31564313'; ctx.lineWidth = 1; ctx.strokeRect(x * TILE + .5, y * TILE + .5, TILE, TILE);
    if (water) { ctx.fillStyle = '#87c7c7aa'; ctx.fillRect(x * TILE + 5 + (motion ? Math.floor(animTime * 2 + n) % 7 : 0), y * TILE + 12, 11, 1); ctx.fillRect(x * TILE + 13, y * TILE + 24, 8, 1); }
    else if (overlay === 'normal' && n % 3 === 0) { ctx.fillStyle = '#70916477'; ctx.fillRect(x * TILE + 7 + n, y * TILE + 9, 2, 3); ctx.fillRect(x * TILE + 9 + n, y * TILE + 11, 2, 2); }
  }
  drawScenery(palette, occupied);
  if (!sandbox && state.levelIndex === 0 && !state.missionComplete) {
    [[13, 11, '1'], [14, 11, '2']].forEach(([x, y, label]) => { if (cellAt(x, y).some(cell => definitions[cell.type].layer === 'building')) return; ctx.fillStyle = '#facc1533'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4); ctx.fillStyle = '#fff0a2'; ctx.font = 'bold 17px monospace'; ctx.fillText(label, x * TILE + 11, y * TILE + 22); });
  }
  if (overlay === 'coverage') {
    for (const cell of allCells()) {
      const def = definitions[cell.type] || {}, range = Number(statusFor(cell).radius ?? ((def.radius || 0) + (cell.type === 'leo' ? 0 : cell.tier - 1) * .8));
      if (!range || !/tower|satellite|gateway|leo/.test(cell.type)) continue;
      ctx.fillStyle = '#67d5bb19'; ctx.strokeStyle = '#95ebd066'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc((cell.x + .5) * TILE, (cell.y + .5) * TILE, range * TILE, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  const cells = [...allCells()].sort((a, b) => Number(!/cable|fiber|cat.?6|link|line/.test(a.type)) - Number(!/cable|fiber|cat.?6|link|line/.test(b.type)));
  for (const cell of cells) {
    const status = statusFor(cell), warning = !isAssetActive(cell, status);
    if (overlay === 'power' || overlay === 'data') {
    const relevant = overlay === 'power' ? categoryOf(cell.type) === 'power' : categoryOf(cell.type) === 'network' || categoryOf(cell.type) === 'compute';
      ctx.globalAlpha = relevant ? 1 : .35;
    }
    drawBuilding(ctx, cell.type, cell.x * TILE, cell.y * TILE, TILE, cell.tier, { warning, active: !warning, variant: cell.id }, motion ? animTime : 0); ctx.globalAlpha = 1;
    if (cell.id === selectedId) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.strokeRect(cell.x * TILE + 1, cell.y * TILE + 1, TILE - 2, TILE - 2); }
    if (overlay === 'power' && status.powered !== undefined || overlay === 'data' && status.dataConnected !== undefined) { ctx.fillStyle = (overlay === 'power' ? status.powered : status.dataConnected) ? '#a3edaa' : '#e69c91'; ctx.fillRect(cell.x * TILE + 1, cell.y * TILE + TILE - 3, TILE - 2, 2); }
  }
  if(overlay === 'normal') {
    const time = motion ? animTime : 0, cx = Math.floor(state.width/2), cy = Math.floor(state.height/2);
    for(let i=0;i<4;i++){const x=(cx-5)*TILE+((time*10+i*83)%340),y=(cy-3)*TILE+Math.sin(time*.45+i)*18+i*9,wing=Math.floor(time*4+i)%2?2:-2;ctx.fillStyle=cyberView?'#abdff3':'#fff5d2';ctx.fillRect(Math.round(x),Math.round(y),3,2);ctx.fillRect(Math.round(x-3),Math.round(y+wing),3,2);ctx.fillRect(Math.round(x+3),Math.round(y+wing),3,2);ctx.fillStyle='#47737a44';ctx.fillRect(Math.round(x),Math.round(y+25),5,1);}
    for(let i=0;i<3;i++){const tx=cx-4+i*4,ty=cy+4+(i%2);if(occupied.has(`${tx},${ty}`)||state.terrain?.[ty*state.width+tx]==='water')continue;const hop=motion?Math.max(0,Math.sin(time*1.3+i*2))*2:0,x=tx*TILE+9,y=ty*TILE+16-hop;ctx.fillStyle='#355c4744';ctx.fillRect(x-1,y+6+hop,12,2);ctx.fillStyle=i%2?'#dcb890':'#f8efd9';ctx.fillRect(x,y,8,6);ctx.fillRect(x+6,y-3,5,6);ctx.fillRect(x+7,y-8,2,6);ctx.fillRect(x+10,y-7,2,5);ctx.fillRect(x-2,y+1,3,3);ctx.fillStyle='#756b66';ctx.fillRect(x+10,y-1,1,1);ctx.fillStyle='#e9acb5';ctx.fillRect(x+8,y-6,1,3);}
  }
  if (validTile(hover)) {
    ctx.fillStyle = mode === 'build' ? '#facc1522' : '#b2d4cc17'; ctx.fillRect(hover.x * TILE, hover.y * TILE, TILE, TILE);
    ctx.strokeStyle = mode === 'build' ? '#facc15' : '#9bc6c5'; ctx.lineWidth = 1.5; ctx.strokeRect(hover.x * TILE + 1, hover.y * TILE + 1, TILE - 2, TILE - 2);
    if (mode === 'build' && tool) { ctx.globalAlpha = .65; drawBuilding(ctx, tool, hover.x * TILE, hover.y * TILE, TILE); ctx.globalAlpha = 1; }
  }
  ctx.restore();
  $('#map-coordinate').textContent = validTile(hover) ? `TILE ${String(hover.x + 1).padStart(2, '0')} / ${String(hover.y + 1).padStart(2, '0')}` : 'CITY BOUNDARY';
}

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.build) selectTool(button.dataset.build);
  if (button.dataset.category) { category = button.dataset.category; $$('.build-categories button').forEach(b => { const on = b === button; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }); renderCatalog(); playSound('click'); }
  if (button.dataset.mode) { setMode(button.dataset.mode); draw(); }
  if (button.dataset.overlay) { overlay = button.dataset.overlay; $$('.map-overlays button').forEach(b => { const on = b === button; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }); draw(); }
  if (button.dataset.speed) { speed = Number(button.dataset.speed); $$('.simulation-controls [data-speed]').forEach(b => { const on = b === button; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }); renderHUD(); }
  if (button.dataset.management) setManagement(button.dataset.management);
  if (button.dataset.mobilePanel) button.dataset.mobilePanel === 'map' ? closeMobilePanel() : openMobilePanel(button.dataset.mobilePanel);
  if (button.hasAttribute('data-close-panel')) closeMobilePanel();
  if (button.hasAttribute('data-close-dialog')) button.closest('dialog').close();
  if (button.dataset.region !== undefined) { loadCity(Number(button.dataset.region)); $('#campaign-dialog').close(); closeMobilePanel(); }
  if (button.dataset.hardware) { const cell = cellById(selectedId); if (cell) doAction('upgradeModule', cell.id, button.dataset.hardware); }
  if (button.dataset.operatorAction) doAction(button.dataset.operatorAction === 'buy' ? 'buyAutomation' : 'upgradeAutomation', button.dataset.operator);
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.operatorToggle) doAction('configureAutomation', input.dataset.operatorToggle, { enabled: input.checked });
  if (input.dataset.operatorReserve) doAction('configureAutomation', input.dataset.operatorReserve, { reserve: clamp(Number(input.value) || 0, 0, 1000000) });
});
$('#service-price').oninput = event => { $('#service-price-label').textContent = `${Number(event.target.value).toFixed(2)}×`; };
$('#service-price').onchange = event => doAction('setServicePrice', Number(event.target.value));
$('#pause-button').onclick = () => setPaused(!paused);
$('#zoom-in').onclick = () => zoomAt(1.25); $('#zoom-out').onclick = () => zoomAt(.8); $('#zoom-fit').onclick = fitMap;
$('#save-button').onclick = () => saveCity(true);
$('#restart-button').onclick = () => $('#restart-dialog').showModal();
$('#confirm-restart').onclick = () => { const index = state.levelIndex || 0, free = sandbox; $('#restart-dialog').close(); loadCity(index, free, true); toast('A fresh city. A fresh possibility.'); };
$('#campaign-button').onclick = () => { renderCampaign(); $('#campaign-dialog').showModal(); };
$('#story-button').onclick = () => showStory(sandbox ? meta.active : state.levelIndex);
$('#story-dialog').addEventListener('click', event => { const button = event.target.closest('[data-story-chapter]'); if (button) showStory(Number(button.dataset.storyChapter)); });
$('#starter-guide').addEventListener('click', event => { const button = event.target.closest('[data-starter]'); if (button) { selectTool(button.dataset.starter); hover = { x: button.dataset.starter === 'coal' ? 13 : 14, y: 11 }; closeMobilePanel(); draw(); } });
// First-time players see the quick start after the opening story closes, never
// stacked above another dialog. GUIDE remains available for later reference.
let quickStartSeen = false;
try { quickStartSeen = localStorage.getItem('imon-gridworks-guide-v1') === 'seen'; } catch {}
function openQuickStart() {
  if (document.querySelector('dialog[open]')) return;
  $('#help-dialog').showModal();
  $('#help-dialog').querySelector('button[aria-label="Close guide"]')?.focus({ preventScroll: true });
}
$('#help-button').onclick = openQuickStart;
$('#help-dialog').addEventListener('close', () => {
  quickStartSeen = true;
  try { localStorage.setItem('imon-gridworks-guide-v1', 'seen'); } catch {}
});
$('#story-dialog').addEventListener('close', () => {
  if (!quickStartSeen && !sandbox && state?.levelIndex === 0 && meta.completed.length === 0) {
    requestAnimationFrame(openQuickStart);
  }
});
$('#sandbox-button').onclick = () => { loadCity(LEVELS.length - 1, true); $('#campaign-dialog').close(); closeMobilePanel(); };
$('#next-mission').onclick = () => { if (state.levelIndex >= LEVELS.length - 1) { renderCampaign(); $('#campaign-dialog').showModal(); } else loadCity(state.levelIndex + 1); };
$('#sound-button').onclick = () => { const on = setSound(!isSoundEnabled()); $('#sound-button').setAttribute('aria-pressed', String(on)); $('#sound-button span').textContent = `SOUND ${on ? 'ON' : 'OFF'}`; if (on) playSound('start'); };
const renderControls = document.createElement('div'); renderControls.className = 'render-controls'; renderControls.setAttribute('role','group'); renderControls.setAttribute('aria-label','World appearance and rendering quality'); renderControls.innerHTML = '<button id="cyber-view" aria-pressed="false" title="Toggle the neon cyberpunk world">✦ CYBER OFF</button><button id="render-quality" title="Cycle Auto, Low, and High canvas rendering quality">QUALITY: AUTO</button><output id="render-fps" title="Measured animation frames per second; not GPU usage">FPS —</output>'; viewport.append(renderControls);
$('#cyber-view').onclick = () => { cyberView = !cyberView; document.body.dataset.palette = cyberView ? 'cyber' : 'natural'; $('#cyber-view').textContent = cyberView ? '✦ CYBER ON' : '✦ CYBER OFF'; $('#cyber-view').setAttribute('aria-pressed', String(cyberView)); draw(); };
$('#render-quality').onclick = () => { quality = ['auto','low','high'][(['auto','low','high'].indexOf(quality)+1)%3]; $('#render-quality').textContent = `QUALITY: ${quality.toUpperCase()}`; slowWindows=fastWindows=0; resizeMap(); };
const weather = initWeather({ onThunder: () => playSound('hit') }); $('#weather-layer').style.zIndex = '2'; weather.setMotion(motion);
const weatherLabel = document.createElement('label'); weatherLabel.className = 'weather-control'; weatherLabel.textContent = 'WEATHER'; const weatherSelect = document.createElement('select'); weatherSelect.setAttribute('aria-label','Decorative weather effects'); weatherSelect.title = 'Visual atmosphere; simulation weather is managed separately'; weatherSelect.innerHTML = ['clear','rain','storm','snow','fog','wind','aurora','fireflies','leaves'].map(type => `<option value="${type}">${type.toUpperCase()}</option>`).join(''); weatherLabel.append(weatherSelect); renderControls.insertBefore(weatherLabel, $('#render-fps')); weatherSelect.onchange = () => weather.setWeather(weatherSelect.value);
const angleButton = document.createElement('button'); angleButton.id = 'view-angle'; angleButton.textContent = 'VIEW: TOP-DOWN'; angleButton.setAttribute('aria-pressed', 'false'); angleButton.title = 'Switch between top-down and angled map views'; $('#motion-button').before(angleButton);
angleButton.onclick = () => { angledView = !angledView; angleButton.textContent = angledView ? 'VIEW: ANGLED' : 'VIEW: TOP-DOWN'; angleButton.setAttribute('aria-pressed', String(angledView)); draw(); };
$('#motion-button').onclick = () => { motion = !motion; weather.setMotion(motion); document.body.dataset.motion = motion ? 'on' : 'off'; $('#motion-button').setAttribute('aria-pressed', String(motion)); $('#motion-button').textContent = `MOTION ${motion ? 'ON' : 'OFF'}`; draw(); };
$('#fullscreen-button').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('Fullscreen is not available in this browser. The game already fills this tab.'); } catch { toast('Fullscreen is unavailable here. Keep playing in this tab.'); } };
document.addEventListener('fullscreenchange', () => { $('#fullscreen-button span').textContent = document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN'; setTimeout(() => { resizeMap(); fitMap(); }, 50); });
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 && event.button !== 1) return;
  const p = point(event); pointer = { id: event.pointerId, start: p, camera: { ...camera }, moved: false, pan: mode === 'pan' || event.button === 1 || spaceHeld };
  canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); if (pointer.pan) viewport.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', event => {
  const p = point(event); hover = tilePoint(p);
  if (pointer && event.pointerId === pointer.id) {
    const dx = p.x - pointer.start.x, dy = p.y - pointer.start.y;
    if (Math.hypot(dx, dy) > 6) pointer.moved = true;
    if (pointer.pan || pointer.moved && mode === 'select') { pointer.pan = true; camera.x = pointer.camera.x + dx; camera.y = pointer.camera.y + dy; viewport.style.cursor = 'grabbing'; }
  }
  draw();
});
canvas.addEventListener('pointerup', event => { if (!pointer || event.pointerId !== pointer.id) return; const wasPan = pointer.pan, moved = pointer.moved; pointer = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); viewport.style.cursor = mode === 'pan' ? 'grab' : mode === 'build' ? 'crosshair' : 'default'; if (!wasPan && !moved) actOnTile(tilePoint(point(event))); });
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('wheel', event => { event.preventDefault(); const p = point(event); zoomAt(event.deltaY < 0 ? 1.13 : .885, p.x, p.y); }, { passive: false });
canvas.addEventListener('keydown', event => {
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[event.key]) { event.preventDefault(); const [dx, dy] = moves[event.key]; hover = { x: clamp(hover.x + dx, 0, state.width - 1), y: clamp(hover.y + dy, 0, state.height - 1) }; const {x: px, y: py} = tileScreenPoint(hover); if (px < 30 || px > cssWidth - 30) camera.x += cssWidth / 2 - px; if (py < 30 || py > cssHeight - 30) camera.y += cssHeight / 2 - py; const cells = cellAt(hover.x, hover.y); $('#map-announcer').textContent = `Tile ${hover.x + 1}, ${hover.y + 1}. ${cells.length ? cells.map(c => buildingName(c.type)).join(', ') : 'Empty'}.`; draw(); }
  if (event.key === 'Enter') { event.preventDefault(); actOnTile(hover); }
  if (event.key === ' ') { event.preventDefault(); spaceHeld = true; viewport.style.cursor = 'grab'; }
  if (event.key === 'Escape') { setMode('select'); selectedId = null; renderInspector(); draw(); }
});
window.addEventListener('keyup', event => { if (event.key === ' ') spaceHeld = false; });
window.addEventListener('blur', () => { pointer = null; spaceHeld = false; lastTime = 0; saveCity(); });
window.addEventListener('pagehide', () => saveCity());
document.addEventListener('visibilitychange', () => { lastTime = 0; fpsStarted=0; fpsFrames=0; if (document.hidden) saveCity(); });
new ResizeObserver(resizeMap).observe(viewport);
function loop(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, .2) : 0; lastTime = now;
  if (!document.hidden) {
    if (!fpsStarted) fpsStarted = now;
    fpsFrames++;
    if (now - fpsStarted >= 1000) {
      const fps = Math.round(fpsFrames * 1000 / (now - fpsStarted)); fpsFrames = 0; fpsStarted = now;
      $('#render-fps').textContent = `${fps} FPS · ${renderRatio().toFixed(1)}×`;
      if (quality === 'auto') {
        slowWindows = fps < 42 ? slowWindows + 1 : 0; fastWindows = fps > 57 ? fastWindows + 1 : 0;
        if (slowWindows >= 3 && autoDPR > 1) { autoDPR = Math.max(1, autoDPR-.25); slowWindows = 0; resizeMap(); }
        else if (fastWindows >= 10 && autoDPR < 1.5) { autoDPR = Math.min(1.5, autoDPR+.25); fastWindows = 0; resizeMap(); }
      }
    }
    if (motion) animTime += dt;
    if (!paused && !document.querySelector('dialog[open]') && dt) Engine.tick(state, dt * speed);
    if (now - lastHUD > 500) { analysis = Engine.analyze(state); renderHUD(); renderMission(); if (management === 'inspect') renderInspector(); if (management === 'operate') renderOperations(); lastHUD = now; }
    if (now - lastEvents > 1500) { const events = state.events || []; for (const event of events.filter(item => (item.time ?? 0) > lastEngineEvent)) log(event.message || event.title || 'City systems updated.', /incident|storm|failure|cyber/i.test(event.title || '') ? 'warning' : ''); if (events.length) lastEngineEvent = events.at(-1).time ?? 0; lastEvents = now; }
    if (now - lastSave > 12000) { saveCity(); lastSave = now; }
    draw();
  }
  requestAnimationFrame(loop);
}
try {
  loadCity(meta.active, meta.sandbox); resizeMap(); fitMap(); focusStarterOnPhone();
  document.body.dataset.motion = motion ? 'on' : 'off'; $('#motion-button').textContent = `MOTION ${motion ? 'ON' : 'OFF'}`; $('#motion-button').setAttribute('aria-pressed', String(motion));
  requestAnimationFrame(loop);
} catch (error) {
  console.error('Gridworks could not start:', error);
  const message = document.createElement('div'); message.className = 'startup-error'; message.textContent = 'Gridworks could not open this save. Reload to try again, or open the region menu to start a fresh city.'; document.body.append(message);
}
