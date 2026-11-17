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

The static checker validates local references, imports, offline assets, source HTML IDs, and daily data. It intentionally ignores unused legacy bundles under `docs/assets/`. Browser QA remains necessary for layout and interaction. During local service-worker development, close other local preview tabs and unregister this site's worker if a previous cache obscures changes.

## Publishing and daily content

Select **GitHub Actions** as the repository's Pages source. `.github/workflows/pages.yml` tests and deploys `docs/` on pushes to `main`, manual runs, and daily at **06:15 Asia/Dhaka** (`00:15 UTC`). GitHub may delay scheduled runs.

Every run refreshes the public JSON, stamps the service-worker cache version with the Dhaka date and run ID, checks the site, and uploads the deployment artifact. Generated daily changes are included in that artifact; the workflow does **not** commit them back to the repository.

```sh
python3 scripts/refresh-daily.py
```

- **News:** [Hacker News's official API](https://github.com/HackerNews/API) supplies community-ranked titles and source links. Titles are not editorially verified claims. The browser can refresh visible news from the same API; failed requests retain a clearly labeled cached snapshot.
- **Science & space:** [The Space Devs / Spaceflight News API](https://github.com/TheSpaceDevs/spaceflightnewsapi) supplies publisher headlines and original story links, without reproducing article bodies. Both news feeds refresh every 30 minutes while visible and have independent daily/offline snapshots.
- **Quiz:** [Open Trivia DB](https://opentdb.com/) supplies 30 daily computer questions under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Its attribution and license link travel with each pack. Question order and answer choices are shuffled, and entities are decoded. If the API is unavailable, the dated pack uses the original local question bank instead. Visitors can choose 5, 20, or 30 questions.
- **Weather:** [ipapi](https://ipapi.co/api/) estimates a city from the visitor's public IP; VPNs, networks, and provider limits can make it inaccurate or unavailable. Rounded coordinates are sent to [Open-Meteo](https://open-meteo.com/) for weather, with its [attribution/license](https://open-meteo.com/en/licence). The live clock and day/night phase always use the browser's local time zone. Precise device location is requested only through an explicit location control. City/weather cache data stays in the browser; IP addresses and coordinates are not persisted by the site.

API outages do not justify invented headlines or a live label on stale data. Keep the existing unavailable/cached states and source attributions when changing these modules.

## Audio and game behavior

Music, ambience, and game sound effects all start **off**. The Music & ambience switch enables optional sounds generated with the browser’s Web Audio API, including rain, wind, water, and thunder; these are synthesized sounds, not recordings. Browser audio starts only after a user gesture. A separate game-effects switch uses `audio.js`, while the ambience volume control saves its setting locally. Hidden tabs suspend ambience. No audio library or new runtime dependency is required.

Ludo uses an explicit local variant: roll six to release a token, exact roll to finish, and four tokens home to win. Starting/starred squares are safe; captures on other squares return all rival tokens there to their yards. A six, capture, or finishing token grants one bonus roll. Three consecutive sixes forfeit the third roll without undoing prior moves. Stacks do not block, and a capture is not required before entering the home lane. Human players share one device; computer seats act locally.

Dev Slots is a free collectible toy. Spins have no payment or wager, and XP/cards have no cash value. Keep those boundaries intact. Game best scores, collections, preferences, and the 2048 board use optional browser storage; storage failures must not prevent play.

## Artwork

Interactive pixel scenes, the globe, and game graphics use original code/vector artwork. The three illustrated landscape backgrounds use original AI-generated artwork; generation prompts and provenance are in `docs/art/PROMPTS.md`. Font license files are in `docs/fonts/`. Regenerate the profile GIF with `python3 scripts/generate-profile-gif.py` after installing Pillow and `rsvg-convert` (librsvg); its SVG remains the editable source and reduced-motion alternative.

## Gridworks campaign

`docs/gridworks/` is a standalone 18-city management game with a pure simulation engine and a responsive canvas UI. Cities, campaign progress, and preferences save locally in the visitor's browser. Power and data travel through separate layers; Cat6 reach, fiber capacity, generation, hardware, coverage, maintenance, prices, and customer satisfaction affect service revenue. Later chapters unlock regional links, LEO ground stations, and paid automation with budget reserves. All game currency is fictional.

The original storyline follows an engineer and NOVA reconnecting a fragmented world. Milestone chapters use rainbow badges. The game supports keyboard construction, touch pan/zoom, map overlays, fullscreen, pause/speed controls, and sound off by default.

The world atlas shows 18 cities across four fictional continents and five countries. Top-down and angled cameras, vivid terrain and Cyber palettes, and Auto/Low/High quality controls are available. FPS is measured from animation frames; the site does not claim to read GPU utilization. Automatic quality lowers render resolution on sustained slow frames. Simulation network analysis runs on simulation steps, not every fractional animation frame.

Regenerate the large README entrance button with `uv run --python 3.13 --with pillow python scripts/generate-entry-button.py`. Its static PNG is the reduced-motion alternative.

The expanded art collection has 13 landscapes and 33 presets. `?scene=waterfall-valley`, `?scene=twilight-lake`, and `?scene=neon-forest` link into individual worlds. The illustrated assets total about 1.61 MB and are cached for offline use. The globe renders an Earth-inspired sphere using an original hand-drawn texture; campaign countries and city positions remain fictional.

The profile now includes an animated entry button and a controller-themed arcade link. The About card has wave, code, and play poses with manual controls and reduced-motion support. Gridworks opens its quick-start guide after the first story briefing; GUIDE reopens the button reference, first connections, ISP pricing, and save instructions.

## World controls and weather

The visible weather control deck offers Light rain, Heavy rain, Snow, Thunderstorm, Lightning, Wind, Clouds, Fog, Fireflies, and Clear. Visitors can pause/play animation, select Gentle/Normal/Vivid intensity, and independently adjust Density and Strength from 25% to 200%. World Studio includes a live animation preview and the same controls, plus scenery, time, colors, and optional sound volume. Custom effects are decorative artwork, not weather alerts.

Live mode follows the visitor’s browser time and automatically rotates phase-appropriate illustrated scenes at 1, 5, 15 or 60-minute intervals. Manual scenery selection disables rotation. Rotation pauses in hidden tabs and with Motion Off or the operating system’s reduced-motion preference; the site respects that preference. Unavailable real weather uses a clearly labeled decorative firefly/wind fallback. Scenery, colors, motion, weather intensity, density, strength, and sound-volume preferences are stored locally when browser storage is available.

Weather uses Canvas 2D and audio uses Web Audio, with no new dependencies. For browser QA, check each main-deck effect and its Studio preview, pause/play, all intensity settings, the independent sliders, sound off on entry, user-enabled audio, and reduced motion. Keep the run/check and publishing commands above as the release workflow.

## Search and sharing

The homepage has a descriptive title and summary, an HTTPS canonical URL, Open Graph and Twitter sharing metadata, and JSON-LD for the public Person and WebSite identities. Names and topics match visible content: Sabbir Hassan Imon, IMON, open-source projects, local-first AI, Android, and pixel browser games. There is no hidden keyword text or invented credential.

`docs/robots.txt` allows crawling and points to `https://imon.com.bd/sitemap.xml`. The sitemap lists only the canonical homepage and `/gridworks/`; scene query strings and section fragments are not separate pages. Keep metadata and the sitemap aligned when adding real routes. The existing social preview is `docs/social-card.png`.

These files help crawlers understand the site; indexing and ranking are not guaranteed. After publishing, the owner can submit the sitemap and inspect both URLs in Google Search Console. Maintenance references: [Google’s SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [site-name structured data](https://developers.google.com/search/docs/appearance/site-names), and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). No SEO package or tracking script is required.
