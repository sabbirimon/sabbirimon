import { initPlayerCard } from './player-card.js';
import { initExperience } from './experience.js';
import { initArcade } from './arcade.js';
import { initLudo } from './ludo.js';
import { initPuzzle } from './puzzle.js';
import { initSlots } from './slots.js';
import { initRacer } from './racer.js';
import { initQuiz } from './quiz.js';
import { initNews } from './news.js';
import { initGameSoundControls } from './audio.js';
import { initOrbs } from './orbs.js';
import { initAuth } from './auth.js';
import { initWordmark } from './logo.js';
import { initWorldMap } from './world-map-ui.js';
import { initCommandPalette } from './command-palette-ui.js';
import { initAchievements } from './achievements-ui.js';
import { initSiteNav } from './site-nav.js';
import { initGitHubStats } from './github-stats.js';
import { initPixelDisplay } from './pixel-display.js';
const $ = s => document.querySelector(s);
const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
document.addEventListener('imon:toast', event => toast(event.detail));
// The site name is drawn as pixel art, not typed in a font.
initWordmark(document);
// The page headings use the wide pixel face, which is drawn rather than
// downloaded, so it never shifts the layout when the font arrives.
initPixelDisplay(document);
initExperience();
initPlayerCard();
initOrbs();
initWorldMap();
initArcade(); initLudo(); initPuzzle(); initSlots(); initRacer(); initQuiz(); initNews(); initGameSoundControls();
initAuth();
initCommandPalette();
initAchievements();
initSiteNav();
// The GitHub numbers come from a daily snapshot, so the strip is drawn
// from a local file and works offline.
initGitHubStats()?.load();
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter; let count = 0;
  document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  document.querySelectorAll('.project-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; if (!card.hidden) count++; });
  $('#filter-status').textContent = `${count} projects shown.`;
}));
$('#surprise-game').addEventListener('click', () => { const games = ['snake','surf','ludo','2048','slots','racer','quiz']; document.querySelector(`button[data-game="${games[Math.floor(Math.random() * games.length)]}"]`).click(); });
$('#copy-profile').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('https://github.com/sabbirimon'); $('#copy-profile').textContent = 'Copied! ✓'; toast('Profile link copied.'); setTimeout(() => { $('#copy-profile').textContent = 'Copy profile link ⧉'; }, 2500); }
  catch { toast('Profile: github.com/sabbirimon'); }
});
const quests = ['Making AI feel more local.', 'Connecting devices and ideas.', 'Learning what happens under the hood.', 'Chasing one more high score.'];
let quest = 0, typeTimer;
setInterval(() => {
  if (document.body.dataset.motion === 'off' || document.hidden) return;
  const next = quests[++quest % quests.length]; let i = 0; clearInterval(typeTimer); $('#side-quest').textContent = '';
  typeTimer = setInterval(() => { if (document.body.dataset.motion === 'off') { $('#side-quest').textContent = next; clearInterval(typeTimer); return; } $('#side-quest').textContent = next.slice(0, ++i); if (i >= next.length) clearInterval(typeTimer); }, 50);
}, 7000);
const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; if (document.body.dataset.motion !== 'off') entry.target.classList.add('reveal'); reveal.unobserve(entry.target); }), { threshold: .08 });
document.querySelectorAll('.project-card,.game-card,.about-card,.gridworks-feature').forEach(el => reveal.observe(el));
// The Snake best is the highest score across every mode and speed, so a
// great Night run shows on the card just like a Classic one.
const SNAKE_BEST_KEYS = ['easy','normal','hard'].flatMap(level => [level, `walls-${level}`, `night-${level}`, `timed-${level}`]);
function syncScores() { const best = Math.max(...SNAKE_BEST_KEYS.map(d => Number(read(`sabbir-arcade-v1-snake-${d}`, '0')) || 0)); $('[data-best-preview="snake"]').textContent = String(best).padStart(3,'0'); }
syncScores(); document.addEventListener('arcade:score', syncScores);
if ('serviceWorker' in navigator) {
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !refreshing) { refreshing = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(async registration => { registration.update().catch(() => {}); await navigator.serviceWorker.ready; $('#offline-status').textContent = '✓ Games ready for offline adventures'; }).catch(() => { $('#offline-status').textContent = 'Online arcade ready'; });
}

document.getElementById('copy-whatsapp')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('@imons');toast('WhatsApp username copied: @imons');}catch{toast('WhatsApp: @imons');}});
