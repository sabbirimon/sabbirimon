// A fresh version is stamped by the daily deployment workflow.
const VERSION = 'imon-world-art-v4';
const SCOPE = self.registration.scope;
const CACHE = VERSION + ':' + SCOPE;
const FILES = ['./','index.html','style.css','player-card.css','player-card.js','app.js','world.js','art/waterfall-valley.webp','art/twilight-lake.webp','art/neon-forest.webp','weather.js','experience.js','experience.css','local-context.js','ambient.js','audio.js','arcade.js','arcade.css','ludo.js','ludo.css','puzzle.js','puzzle.css','slots.js','slots.css','racer.js','racer.css','quiz.js','quiz.css','news.js','news.css','data/news.json','data/science.json','data/quiz.json','data/quiz-bank.json','gridworks/','gridworks/index.html','gridworks/engine.js','gridworks/view.js','gridworks/story.js','gridworks/globe.js','gridworks/globe-renderer.js','gridworks/globe.css','gridworks/style.css','icon.svg','manifest.webmanifest','fonts/press-start-2p.ttf','fonts/mulish-regular.ttf','fonts/mulish-extra-bold.ttf'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file,SCOPE).href))).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const legacy = keys.some(key => key.startsWith('workbox-precache-') && key.endsWith(SCOPE));
    await Promise.all(keys.filter(key => key !== CACHE && (((key.startsWith('sabbir-world-') || key.startsWith('imon-world-')) && key.endsWith(':' + SCOPE)) || (key.startsWith('workbox-precache-') && key.endsWith(SCOPE)))).map(key => caches.delete(key)));
    await self.clients.claim();
    // The old bundled application cannot receive our update message; refresh only its scope once.
    if (legacy) for (const client of await self.clients.matchAll({type:'window'})) if (client.url.startsWith(SCOPE)) await client.navigate(client.url).catch(() => {});
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(SCOPE) || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && (FILES.some(file => new URL(file,SCOPE).pathname === url.pathname) || event.request.mode === 'navigate')) await cache.put(event.request,response.clone());
      return response;
    } catch {
      const hit = await cache.match(event.request,{ignoreSearch:true});
      if (hit) return hit;
      if (event.request.mode === 'navigate') return await cache.match(new URL(url.pathname.includes('/gridworks') ? 'gridworks/index.html' : 'index.html',SCOPE).href) || Response.error();
      return Response.error();
    }
  })());
});
