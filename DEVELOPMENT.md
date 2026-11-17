# IMON World

A buildless GitHub Pages site in `docs/`, with original pixel scenery, browser games, visitor-local weather, and daily public content. The profile README and its animated artwork live at the repository root and in `assets/`.

## Run and check

Use Node.js 22+ and Python 3.10+. The site has no npm runtime dependencies.

```sh
python3 scripts/serve.py --directory docs
```

Open `http://127.0.0.1:4173/`. For a project-path check, serve the repository's parent folder and open this checkout's `docs/` path. Test keyboard and touch controls, narrow screens, reduced motion, dialog focus restoration, and offline reload after a successful first visit.

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

Game sound effects start **off**, controlled by `audio.js`. Procedural ambience starts enabled but remains silent until the first user gesture unlocks browser audio; it has a separate control. Hidden tabs suspend ambience, and motion settings respect reduced-motion preferences.

Ludo uses an explicit local variant: roll six to release a token, exact roll to finish, and four tokens home to win. Starting/starred squares are safe; captures on other squares return all rival tokens there to their yards. A six, capture, or finishing token grants one bonus roll. Three consecutive sixes forfeit the third roll without undoing prior moves. Stacks do not block, and a capture is not required before entering the home lane. Human players share one device; computer seats act locally.

Dev Slots is a free collectible toy. Spins have no payment or wager, and XP/cards have no cash value. Keep those boundaries intact. Game best scores, collections, preferences, and the 2048 board use optional browser storage; storage failures must not prevent play.

## Artwork

Pixel scenes and game graphics are original code/vector artwork. Font license files are in `docs/fonts/`. Regenerate the profile GIF with `python3 scripts/generate-profile-gif.py` after installing Pillow and `rsvg-convert` (librsvg); its SVG remains the editable source and reduced-motion alternative.

## Gridworks campaign

`docs/gridworks/` is a standalone 18-city management game with a pure simulation engine and a responsive canvas UI. Cities, campaign progress, and preferences save locally in the visitor's browser. Power and data travel through separate layers; Cat6 reach, fiber capacity, generation, hardware, coverage, maintenance, prices, and customer satisfaction affect service revenue. Later chapters unlock regional links, LEO ground stations, and paid automation with budget reserves. All game currency is fictional.

The original storyline follows an engineer and NOVA reconnecting a fragmented world. Milestone chapters use rainbow badges. The game supports keyboard construction, touch pan/zoom, map overlays, fullscreen, pause/speed controls, and sound off by default.

The world atlas shows 18 cities across four fictional continents and five countries. Top-down and angled cameras, vivid terrain and Cyber palettes, and Auto/Low/High quality controls are available. FPS is measured from animation frames; the site does not claim to read GPU utilization. Automatic quality lowers render resolution on sustained slow frames. Simulation network analysis runs on simulation steps, not every fractional animation frame.
