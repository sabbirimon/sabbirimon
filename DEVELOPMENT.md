# IMON World

A buildless GitHub Pages site in `docs/`, with original pixel scenery, browser games, visitor-local weather, and daily public content. The profile README and its animated artwork live at the repository root and in `assets/`.

The canonical production address is [imon.com.bd](https://imon.com.bd/), with [Gridworks](https://imon.com.bd/gridworks/) at `/gridworks/`. The custom domain has a valid TLS certificate, HTTPS enforcement is enabled, and `www.imon.com.bd` redirects to the canonical apex domain. Repository and source-code links continue to point to GitHub.

## Run and check

Use Node.js 22+ and Python 3.10+. The site has no npm runtime dependencies.

```sh
python3 scripts/serve.py
```

Open `http://127.0.0.1:4173/docs/`. Assets, module imports, the manifest, and the service worker use relative URLs so the site works at both the custom-domain root and the local preview path. Test keyboard and touch controls, narrow screens, reduced motion, dialog focus restoration, and offline reload after a successful first visit.

```sh
node --test tests/*.test.mjs
python3 scripts/check-site.py
```

The static checker validates local references, imports, offline assets, source HTML IDs, daily data, and the `docs/CNAME` custom-domain declaration. Browser QA remains necessary for layout and interaction. During local service-worker development, close other local preview tabs and unregister this site's worker if a previous cache obscures changes.

## The AI lab

`docs/ai-lab.html` teaches Python, machine learning and system design through 54 exercises in five chapters: Python for models, AI safety, System design, Working with APIs and Working with data. The course lives in `docs/data/ai-course.json` and is loaded at runtime, so a new exercise is a JSON entry and a reference answer, with no build step.

The Python runs in the browser. `docs/ai-lab.js` is a teaching interpreter — a tokenizer, a statement parser, an expression parser and a statement executor — not a Python runtime. It covers `def`/`return`, `if`/`elif`/`else`, `for`, `while`, lists, dictionaries, tuples, strings, the common builtins and `import math`. It is deliberately small: an exercise that needs a feature the subset does not have will teach the wrong lesson.

Two learning modules extend it, and both are pure browser-side code:

- `docs/ai-api.js` is a fake HTTP client for `api.example.com` with users, documents, search, health and a predict route. `import requests` and `import http` both reach it. It returns a status code and a body, retries on a 5xx or a 429, never retries on a 404, and supports a timeout and headers. It never touches the network.
- `docs/ai-sql.js` is an in-memory SQL engine. `import sqlite3` gives a connection with `execute`, `query`, `tables` and `close`, plus `CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE` and `DROP TABLE`, `WHERE` with `AND`/`OR`/`NOT`/`LIKE`/`IN`/`IS NULL`, `ORDER BY`, `LIMIT`, and the `SUM`/`COUNT`/`AVG`/`MIN`/`MAX` aggregates. Each run starts with a fresh database.

Neither module needs a server. This is deliberate: GitHub Pages serves static files only, so a lab that required a backend would not work on the published site.

The interpreter stops a runaway loop with two guards, because a phone is much slower than a laptop: a step count, which catches a runaway loop quickly on a fast machine, and a wall-clock budget, which is the real limit. A legitimate program is never stopped on a slow device by the step count alone.

`docs/ai-lab.webmanifest` gives the lab its own installable identity on a phone, separate from the main site manifest. Below 900px the course rail becomes a drawer and the brief comes first, so a learner lands on the current exercise instead of a list of fifty-four. Safe-area insets keep the page clear of a notch and the home indicator.

## The Code Lab

`docs/lab.html` is the browser practice lab for HTML, CSS and JavaScript. The page is split in two: the lesson on the left, the workbench on the right. The workbench holds a file rail, a tab bar, an editor, a live preview and a terminal, so a learner can write code and see it run without leaving the page.

The lab is a set of small modules, each with pure exported helpers and all DOM access inside its `init` body:

- `docs/lab-notes.js` holds the note library. Each note explains one tag, property or API. An exercise names what it is about in its `requirements`, and the matching notes are shown; an exercise that names nothing falls back to the general notes for its language.
- `docs/lab-chapters.js` holds the fourteen chapters. Each carries a goal, study material with worked examples, the exam instructions and the outcome, so the panel above the rail teaches before the task is attempted.
- `docs/lab-feedback.js` turns a wrong answer into "what is wrong, where it is, and how to fix it". It finds the first line that breaks the rule the checker was looking for and names the file it is in.
- `docs/lab-reward.js` pays out the coins on a correct answer. The coins fly once per exercise, so the same exercise cannot be farmed for points.
- `docs/lab-progress.js` draws the track under the course bar — every chapter and how far through it the learner is.
- `docs/lab-lookup.js` searches a free public service for what other people have written about the tag or property the learner just met. See the third-party services list below.

`docs/lab-curriculum.js` imports the Codédex `html-101` and `css-101` courses from `docs/data/lab-curriculum.json` and turns each entry into a runnable exercise with a real checker. The importer must carry the entry's `requirements` through, because the notes panel and the lookup both read them.

`docs/lab.html` pins the brief to the top of the lesson column and gives the workbench the viewport height, so the editor never scrolls away and the space under the code carries the notes rather than emptiness. `docs/lab-layout.css` overrides `docs/lab.css` and must load after it — `tests/css.test.mjs` checks that order, because a stylesheet that loads in the wrong order silently loses every rule it sets.

## Publishing and daily content

Select **GitHub Actions** as the repository's Pages source. `.github/workflows/pages.yml` tests and deploys `docs/` on pushes to `main`, manual runs, and daily at **06:15 Asia/Dhaka** (`00:15 UTC`). GitHub may delay scheduled runs.

The custom domain is declared twice on purpose: in the repository's Pages settings and in `docs/CNAME`. The file keeps the published artifact self-describing, so a settings reset cannot silently drop the domain. DNS for the apex must stay **DNS only** (grey cloud): GitHub Pages already serves a valid certificate for `imon.com.bd`, and a proxied record can serve a stale cached `301` that redirects the apex to itself.

Every run refreshes the public JSON, stamps the service-worker cache version with the Dhaka date and run ID, checks the site, and uploads the deployment artifact. Generated daily changes are included in that artifact; the workflow does **not** commit them back to the repository.

```sh
python3 scripts/refresh-daily.py
```

- **News:** [Hacker News's official API](https://github.com/HackerNews/API) supplies community-ranked titles and source links. Titles are not editorially verified claims. The browser can refresh visible news from the same API; failed requests retain a clearly labeled cached snapshot.
- **Science & space:** [The Space Devs / Spaceflight News API](https://github.com/TheSpaceDevs/spaceflightnewsapi) supplies publisher headlines and original story links, without reproducing article bodies. Both news feeds refresh every 30 minutes while visible and have independent daily/offline snapshots.
- **Quiz:** [Open Trivia DB](https://opentdb.com/) supplies 30 daily computer questions under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its attribution and license link travel with each pack. Question order and answer choices are shuffled, and entities are decoded. If the API is unavailable, the dated pack uses the original local question bank instead. Visitors can choose 5, 20, or 30 questions.
- **Weather:** [ipapi](https://ipapi.co/api/) estimates a city from the visitor's public IP; VPNs, networks, and provider limits can make it inaccurate or unavailable. Rounded coordinates are sent to [Open-Meteo](https://open-meteo.com/) for weather, with its [attribution/license](https://open-meteo.com/en/licence). The live clock and day/night phase always use the browser's local time zone. Precise device location is requested only through an explicit location control. City/weather cache data stays in the browser; IP addresses and coordinates are not persisted by the site.
- **Code Lab lookup:** [The Stack Exchange API](https://api.stackexchange.com/docs) answers the Code Lab's "Search for it" button with real questions from Stack Overflow, so a learner can read how other people use a tag or property without leaving the page. It is free, needs no key, and sends `Access-Control-Allow-Origin: *`, so the browser calls it directly from the static site. Only the search words are sent — never the learner's code. The service reports its own daily request allowance; when it is spent the panel says so and the built-in notes stay on screen. MDN's search API was the first choice, but it sends no CORS header, so a static host cannot call it at all.

API outages do not justify invented headlines or a live label on stale data. Keep the existing unavailable/cached states and source attributions when changing these modules.

## Audio and game behavior

Music, ambience, and game sound effects all start **off**. The sound mixer lets visitors combine rain, wind, water, birds, crickets, and music, generated with the browser’s Web Audio API. Crickets are preselected for a first visit, but the master playback control stays off until the visitor plays audio. The mixer remembers selected layers and volume locally when browser storage is available. Weather can also generate optional thunder ambience. These sounds are synthesized, not recordings. Browser audio starts only after a user gesture. A separate game-effects switch uses `audio.js`. Hidden tabs suspend ambience. No audio library or new runtime dependency is required.

Ludo uses an explicit local variant: roll six to release a token, exact roll to finish, and four tokens home to win. Starting/starred squares are safe; captures on other squares return all rival tokens there to their yards. A six, capture, or finishing token grants one bonus roll. Three consecutive sixes forfeit the third roll without undoing prior moves. Stacks do not block, and a capture is not required before entering the home lane. Human players share one device; computer seats act locally.

Dev Slots is a free collectible toy. Spins have no payment or wager, and XP/cards have no cash value. Keep those boundaries intact. Game best scores, collections, preferences, and the 2048 board use optional browser storage; storage failures must not prevent play.

## Artwork

Interactive pixel scenes, the globe, and game graphics use original code/vector artwork. The three illustrated landscape backgrounds use original AI-generated artwork; generation prompts and provenance are in `docs/art/PROMPTS.md`. Font license files are in `docs/fonts/`. Regenerate the profile GIF with `python3 scripts/generate-profile-gif.py` after installing Pillow and `rsvg-convert` (librsvg); its SVG remains the editable source and reduced-motion alternative.

## Gridworks campaign

`docs/gridworks/` is a standalone 18-city management game with a pure simulation engine and a responsive canvas UI. Cities, campaign progress, and preferences save locally in the visitor's browser. Power and data travel through separate layers; Cat6 reach, fiber capacity, generation, hardware, coverage, maintenance, prices, and customer satisfaction affect service revenue. Later chapters unlock regional links, LEO ground stations, and paid automation with budget reserves. All game currency is fictional.

The original storyline follows an engineer and NOVA reconnecting a fragmented world. Milestone chapters use rainbow badges. The game supports keyboard construction, touch pan/zoom, map overlays, fullscreen, pause/speed controls, and sound off by default.

The world atlas shows 18 cities across four fictional continents and five countries. Top-down and angled cameras, vivid terrain and Cyber palettes, and Auto/Low/High quality controls are available. FPS is measured from animation frames; the site does not claim to read GPU utilization. Automatic quality lowers render resolution on sustained slow frames. Simulation network analysis runs on simulation steps, not every fractional animation frame.

Regenerate the large README entrance button with `uv run --python 3.13 --with pillow python scripts/generate-entry-button.py`. Its static PNG is the reduced-motion alternative.

World Studio has 41 presets, including Neon Coast, Energy Ridge and Riverbend Mills. `?scene=waterfall-valley`, `?scene=twilight-lake`, and `?scene=neon-forest` link into individual worlds. The illustrated assets total about 1.61 MB and are cached for offline use. The globe renders an Earth-inspired sphere using an original hand-drawn texture; campaign countries and city positions remain fictional.

The profile now includes an animated entry button and a controller-themed arcade link. The About card has wave, code, and play poses with manual controls and reduced-motion support. Gridworks opens its quick-start guide after the first story briefing; GUIDE reopens the button reference, first connections, ISP pricing, and save instructions.

## World controls and weather

The weather deck offers three rain and three snow levels, rain or condensation on glass, earthquake, thunderstorm, lightning, wind, clouds, fog, fireflies and clear skies. Each button pairs a pixel sprite with a text label. Visitors can pause/play animation, select Gentle/Normal/Vivid intensity, and independently adjust Density and Strength from 25% to 200%. World Studio includes a live animation preview and the same controls, plus scenery, time, colors, and optional sound volume. Custom effects are decorative artwork, not weather alerts.

Live mode follows the visitor’s browser time and automatically rotates phase-appropriate illustrated scenes at 1, 5, 15 or 60-minute intervals. Manual scenery selection disables rotation. Rotation pauses in hidden tabs and with Motion Off or the operating system’s reduced-motion preference; the site respects that preference. Unavailable real weather uses a clearly labeled decorative firefly/wind fallback. Scenery, colors, motion, weather intensity, density, strength, and sound-volume preferences are stored locally when browser storage is available.

Weather uses Canvas 2D and audio uses Web Audio, with no new dependencies. For browser QA, check each main-deck effect and its Studio preview, pause/play, all intensity settings, the independent sliders, sound off on entry, mixer layer combinations and saved selections, user-enabled audio, and reduced motion. Keep the run/check and publishing commands above as the release workflow.

## Search and sharing

The homepage has a descriptive title and summary, an HTTPS canonical URL, Open Graph and Twitter sharing metadata, and JSON-LD for the public Person and WebSite identities. Names and topics match visible content: Sabbir Hassan Imon, IMON, open-source projects, local-first AI, Android, and pixel browser games. There is no hidden keyword text or invented credential.

`docs/robots.txt` allows crawling and points to `https://imon.com.bd/sitemap.xml`. The sitemap lists the canonical homepage and the real sub-pages; scene query strings and section fragments are not separate pages. Keep metadata and the sitemap aligned when adding real routes. The existing social preview is `docs/social-card.png`.

Every page in the sitemap declares its own `<link rel="canonical">` pointing at the exact sitemap entry, and carries a description. `scripts/check-site.py` fails the build when a listed page has no canonical tag, when that tag disagrees with the sitemap, when a page has no description, or when any JSON-LD block on any page is malformed. Those four rules exist because each one fails silently in production: a missing canonical splits one page across two addresses, and a broken JSON-LD block is ignored by every crawler without an error anywhere.

Each sub-page carries its own structured data type: `LearningResource` for the two labs, `VideoGame` for Gridworks, `WebApplication` for the toolbox, and the `Person`/`WebSite` graph on the homepage.

These files help crawlers understand the site; indexing and ranking are not guaranteed. After publishing, the owner can submit the sitemap and inspect both URLs in Google Search Console. Maintenance references: [Google’s SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [site-name structured data](https://developers.google.com/search/docs/appearance/site-names), and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). No SEO package or tracking script is required.

### Describing the site to AI agents

Two static files let a language model or a crawler understand the site without guessing at it:

- `docs/llms.txt` is a hand-written plain-text map: what the site is, what each page does, which public APIs it contacts, and the conventions an automated reader should follow (use the canonical URLs, read the HTML directly, no page-content API exists).
- `docs/.well-known/agents.json` is the same information as structured JSON — entry points, machine-readable data files, third-party hosts and the reason each is contacted, the content and licensing posture, and the privacy summary.

Both are linked from every page with `<link rel="alternate">`, and both are listed in `robots.txt` alongside the crawler-specific rules. `scripts/check-site.py` parses both and fails the build when an entry point or machine-readable path does not exist on disk, so the map cannot drift away from the real site.

Both files are static and carry nothing about a visitor. Asking for one is an ordinary web request, so the host that serves it sees an IP address — the same as any other request to the site. `docs/privacy.html` explains this in its own section.

### Final weather polish

Rain uses layered smooth strokes with weather-dependent drop sizes, flow and gust angles; wind, fog, clouds and lightning use soft drawing with subtle reflection ripples. Snow, stars and firefly lights are intentionally small. Foreground trees sway, and wind turbines rotate faster as wind strength increases. World Studio’s Rotor speed control adjusts turbine blades and windmill sails from stopped to triple speed. The Riverbend waterwheel turns with the current. Cyberpunk uses gentle, sparse drizzle and retains the sound preference. The main weather deck and World Studio share density, strength and intensity settings.

Rain on glass and fogged glass are decorative window effects with the same intensity, density and strength controls. Lightning uses strength-controlled glows/reflections with deliberately spaced flashes. The Earthquake control opens a pixel city with a repeating building-collapse/rebuild vignette; it is visual decoration and never modifies Gridworks saves.
