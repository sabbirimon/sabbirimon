// A fresh version is stamped by the daily deployment workflow.
const VERSION = 'imon-world-art-v22';
const SCOPE = self.registration.scope;
const CACHE = VERSION + ':' + SCOPE;
const FILES = ['./','index.html','style.css','studio.css','lesson-controls.js','arcade/','arcade/index.html','arcade/games.css','arcade/games.js','arcade/play.js','meshlit/','hyperl/','project-downloads.css','player-card.css','player-card.js','app.js','world.js','art/neon-coast.webp','art/waterfall-valley.webp','art/twilight-lake.webp','art/neon-forest.webp','weather.js','hail.js','weather-icons.js','experience.js','experience.css','sound-mixer.js','sound-mixer.css','local-context.js','ambient.js','audio.js','arcade.js','arcade-sprites.js','arcade.css','ludo.js','ludo.css','puzzle.js','puzzle.css','slots.js','slots.css','racer.js','racer.css','quiz.js','quiz.css','news.js','news.css','orbs.js','orbs.css','art/orbs.svg','github-stats.js','github-stats.css','data/github-stats.json','world-map.js','world-map-ui.js','world-map.css','command-palette.js','command-palette-ui.js','command-palette.css','site-header.css','site-nav.js','achievements.js','achievements-ui.js','achievements.css','art/world-countries.json','auth.js','auth.css','auth-callback.html','login.html','privacy.html','privacy.css','sitemap.xml','pixel-art.js','pixel-art.css','nes.css','lab.js','lab.css','lab-output.js','lab-quiz.js','lab-quiz-ui.js','lab.html','lab-curriculum.js','lab-notes.js','lab-layout.css','lab-chapters.js','lab-feedback.js','lab-reward.js','lab-progress.js','lab-lookup.js','lab-preferred.js','ai-lab.js','ai-lab-ui.js','ai-lab.css','ai-lab.html','ai-lab.webmanifest','ai-lab-chapters.js','ai-api.js','ai-sql.js','data/ai-course.json','circuits.js','circuits-ui.js','circuits-chapters.js','circuits.css','circuits.html','data/circuits-course.json','logo.js','pixel-type.js','pixel-display.js','pixel-display.css','wordmark.css','data/lab-curriculum.json','data/news.json','data/science.json','data/quiz.json','data/quiz-bank.json','gridworks/','gridworks/index.html','gridworks/engine.js','gridworks/view.js','gridworks/story.js','gridworks/globe.js','gridworks/globe-renderer.js','gridworks/globe.css','gridworks/style.css','tools/','tools/index.html','tools/style.css','tools/tools.js','site-services.js','site-choices.js','site-public.js','site-public.css','quests.js','quests.css','quests.html','sitemap.html','fonts/silkscreen-regular.ttf','courses.html','course-quiz.js','learning-art.js','tools/library.js','art/learning-meadow.webp','art/lab-code.webp','art/lab-ai.webp','art/lab-circuits.webp','data/course-index.json','llms.txt','.well-known/agents.json','icon.svg','manifest.webmanifest','fonts/press-start-2p.ttf','fonts/mulish-regular.ttf','fonts/mulish-extra-bold.ttf'];
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
  if(url.pathname.includes('/admin/')) return;
  if(url.pathname.endsWith('/auth-callback.html') && url.search) return;
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
