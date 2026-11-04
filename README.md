# Portfolio

A React + Vite portfolio for Yuvaraj Pradhan. Its fixed navigation rail, large editorial sections, geometric visuals, and switchable color slides are inspired by the interaction patterns of the Endfield reference site; no artwork or assets from that site are used. The small button at the bottom of the portfolio menu opens a separate gaming page.

The shared sidebar also has a light/dark mode button. Dark is the default; the choice is saved locally and carries across both pages. Light-theme styling is in `src/light.css`.
On mobile, the intro of each page also shows a direct link to the other page. Inside the menu, the navigation list scrolls on short screens while the theme and page-switch controls stay visible at the bottom.

VERCEL DEPLOYED LINK - https://yuvaraj-pradhan.vercel.app

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` for a production build. The pages live at `/portfolio` (`portfolio/index.html`) and `/gaming` (`gaming/index.html`); the root `/` is a book-style landing page (`index.html`, `src/Hub.jsx`, `src/hub.css`) with turnable Developer, Gamer, and Coming Soon chapters (edit the `chapters` list in `src/Hub.jsx`). Turn pages with the arrows, chapter contents, keyboard arrow keys while focused inside the book, or a swipe. Page-turn animation is skipped with reduced motion. Deploy with a host that runs the serverless function in `api/videos.js` (for example Vercel); a files-only static host cannot provide the live video endpoint.

The landing book starts closed with a straight navy hardcover. Opening it reveals a blank left page and the selected chapter on the right. Mobile shows only the chapter page, with its own flip-and-fade transitions and no underlying page visible during cover flips. Both states fit the viewport without scrolling. Chapter links and â€œClose bookâ€ sit above the spread, and the previous/next arrows flank it. Desktop closing animates the cover from left to right; reduced motion skips the animation.

## Channel intro preview

The **IamUV** name at the top of `/gaming` opens `/intro` in a new tab. It is also accessible by keyboard and stays visible on narrow mobile screens. Vite dev/preview explicitly resolve `/intro` to its own entry; `vercel.json` supplies the same rewrite for deployment. Restart an already-running preview server after changing Vite routes, and rebuild before previewing changed source.

Open `/intro` for a standalone 5-second IamUV animation (`src/intro-main.jsx`, `src/intro.css`). The I drops at the right end of the centered wordmark, then slides left as the leading edge of a right-to-left reveal (V, U, m, then a), finishing as IamUV at 1 second. The bar sits just above the letters, drops with the I, and extends left with its slide. A cat peeks over the top bar from 1.2 to 1.9 seconds and opens its mouth at the audio cue, without a speech bubble. The page shows only the centered intro against a full-screen background, without navigation or visible controls, apart from a subdued top-left "PRESS AGAIN FOR AUDIO" hint. Click or tap anywhere (or focus the page button and press Enter/Space) to replay with sound. The initial automatic animation is silent because browsers require a user gesture for audio. Replay plays only `audio/whoosh-short-realistic.mp3` at the slide's start (0.55 seconds), followed by `audio/cat-meow.mp3` at the cat's meow cue (1.9 seconds). The whoosh plays only the 0.65â€“1.10-second portion of its source, with short edge fades, to remove the lead-in and tail and fit the 0.45-second slide. The original file is untouched. Both recordings play at their original speed; there are no synthesized effects, landing taps, or completion clicks. Sound scheduling follows the animation's actual start and compensates for output latency using browser audio timestamps (or reported latency when timestamps are unavailable). Both recordings load before the animation restarts, and replay stops any previous sound. Reduced motion shows the finished logo without animation or sound. This is a browser preview, not an MP4/video exporter, and does not replace the gaming loader or landing page.

### Video export

The drop begins fully above the viewport, with its travel distance compensating for the composition scale. The exported first frame contains only the background.

Rendered YouTube intros are saved locally as:

- `exports/IamUV-intro-1080p.mp4`: 1920x1080.
- `exports/IamUV-intro-4K.mp4`: native 3840x2160, re-rendered from the browser artwork rather than upscaled from the 1080p video.

Both are 30 fps, 5 seconds, H.264 video with AAC stereo audio. The approved logo, bar, and cat are scaled together to 50% of their initial size in the browser and both exports. The videos include the trimmed whoosh and full meow, but no browser audio hint or controls. Generated exports are gitignored; re-render after approved changes to the animation or recordings.

## Personalize

The name, Yuvaraj Pradhan, is confirmed by the owner. **Edit `src/site-properties.js` for public details**: identity and channel ID, all social/contact links, displayed handles, page titles/descriptions, portfolio slides and focus areas, and the editable descriptions. This is a regular JavaScript properties module shared by both React pages and the YouTube server function; public links and copy do **not** come from environment variables. Page titles and descriptions in the built HTML are generated from it. Empty optional links are not rendered as live links. Replace the general approach section with real roles and dates when you have them; avoid publishing example career claims as facts. The portfolio artwork and layout are in `src/styles.css`; the gaming page design is in `src/gaming.css`.

## Live YouTube videos

The channel page loads its latest three uploads and its most-viewed video from `/api/videos`. The labeled arrows on the featured player select **Latest Upload** or **Most Viewed**. Recent Transmissions displays all three cards on desktop; on mobile it displays one at a time with previous/next arrows. The server uses YouTube Data API v3 and caches results for 30 minutes. The browser refreshes while the page is open and again when the tab becomes visible. No video IDs or titles are stored in the application. If the API is unavailable, the page shows the hard-coded `fallbackVideos` from `src/site-properties.js` (latest upload, most viewed, and three recent videos) with a notice that saved videos are shown. Update those IDs and titles by hand when you want the fallback refreshed; live data replaces them as soon as the API works.

1. In Google Cloud, enable **YouTube Data API v3** and create an API key restricted to that API.
2. For local development, create `.env.local` with `YOUTUBE_API_KEY=your-key` (see `.env.example`), then restart `npm run dev`. Do not use a `VITE_` prefix or commit the key.
3. For deployment, set `YOUTUBE_API_KEY` as a server-side environment variable in Vercel and deploy the project. The Vercel function lives in `api/videos.js`; the same endpoint is available through the Vite dev and preview servers.

The API key is required to activate the live feed. It is the only setting kept in `.env.local`; the public channel ID is in `src/site-properties.js`. Video selections are fetched at request time.

The **Currently playing** section (sidebar item and `#playing`) is a game carousel. The games are listed in `gaming.games` in `src/site-properties.js`; each has a name, eyebrow, title lines, and description. Their names appear as clickable tabs above the section, and the arrows (or a swipe on touch screens) move between slides. The second game is a placeholder (`placeholder: true`): replace its text, and drop that flag once it has real artwork. Each game has two `buttons` (label and playlist `url`); a button without a `url` renders disabled. Add more games by adding entries; a game without `placeholder` currently renders the Wuthering Waves artwork, so a new real game needs its own artwork component in `src/Gaming.jsx`.

The Wuthering Waves frame loads the six optimized copies in `images/wuwa/optimized` (Shorekeeper first, then the others by filename). It crossfades to the next image every three seconds while visible, or with the next-image arrow. The images in `images/wuwa` are untouched; at roughly 24 MB total, the originals are too large to serve directly. Add an optimized JPEG copy in the `optimized` folder when adding a new image. Automatic rotation pauses when the tab is hidden or reduced motion is requested. The Silver Palace and Ananta cards still use smaller copies (`images/silver-palace-mc-card.jpg` and `images/ananta-key-art-card.jpg`) of their supplied artwork.

Click or keyboard-activate the framed Wuthering Waves image to replay its resonance animation. Reduced-motion preferences are respected.

The Instagram, Discord, X, Twitch, and YouTube links in the gaming page header are configured in `src/site-properties.js`. Their locally stored SVG icons in `src/assets` come from [Simple Icons](https://simpleicons.org/) (CC0; brand trademarks remain with their respective owners).

The **Follow Now** section between Wuthering Waves and Coming Soon highlights Instagram, Discord, X, and YouTube. Its X card links to the account provided by the owner.
Platform colors stay visible on desktop and mobile, with an additional lift/glow effect on hover or focus.

## Opening sequence

The gaming page opens with a loading screen (`src/Loader.jsx`, styles at the end of `src/gaming.css`) modeled on Endfield's: a blurred artwork backdrop, large IamUV logo, slogan with a divider, and a progress bar with a large percentage counter (a horizontal bar on desktop, a vertical one on mobile). Progress reflects the real preload of the page images and fonts, with a minimum of about 1 second. At 100% an accent-colored wipe sweeps in from the left, then the screen fades out to the page. Reduced-motion users skip the wipe and fade.

## Launch sequence

The closing "THE NEXT ADVENTURE IS ONE CLICK AWAY" section has an interactive hologram Earth (`src/HoloGlobe.jsx`, drawn on a canvas; land dots come from `world-atlas` via `topojson-client`). Drag to spin it; hovering slows it. Clicking or tapping it runs the launch in `src/launchEffect.js`: each glowing point flies along its own curve to a pad point, a rocket lifts off with fire, sparks, and a smoke trail, the page scrolls up behind it with speed streaks, and YouTube opens in a new tab. Users who prefer reduced motion skip the animation and go straight to YouTube. Some browsers (notably Safari) may block the new tab, in which case the page navigates in the same tab. The effect has only been checked with headless screenshots, not watched in real time.

On touch screens, `:hover` styles are disabled at build time: `server/hover-only.js` (a small Vite plugin, tested in `server/hover-only.test.js`) wraps every `:hover` rule in `@media (hover: hover)`, so a tap no longer leaves buttons, cards, or the sidebar looking "clicked". Write normal `:hover` rules in the CSS; focus styles are unaffected.

Run `npm run format` to format the source, or `npm run format:check` to check formatting without changing files.

## Wuthering Waves pages

`/wuthering-waves` (also reachable as `/wutheringwaves`) is a separate client-routed app (`wuthering-waves/index.html`, `src/WutheringWaves.jsx`, `src/wuwa.css`). Its sidebar has one page per item rather than scroll sections. **Archives** (/wuthering-waves/archives, default tab Characters) holds four tabs in a title bar at the top: Characters, Weapons, Sonata effects and Echoes, with their detail pages opening inside it; the old addresses such as /wuthering-waves/characters redirect to the new ones. Within it: `/wuthering-waves/archives/characters` (searchable grid with rarity, element and weapon filters), `/wuthering-waves/archives/characters/<slug>` (skills, resonance chain, minor fortes and Lv. 90 stats), and `/wuthering-waves/team-calculations` (placeholder). Vite dev/preview and `vercel.json` send every path under it to the same entry.

Character data comes from `/api/wuwa-characters` (`?slug=` for one character), implemented in `api/wuwa-characters.js`. It reads Supabase through its REST API using `SUPABASE_URL` and `SUPABASE_ANON_KEY` and returns a 503 with the message "CHARACTERS CURRENTLY FIGHTING THE THRENODIANS" (shown on the page) and logs the missing settings on the server when they are missing; there is no local fallback, so the database is the only source of character data.

1. Run `db/wuwa-schema.sql` in the Supabase SQL editor (tables, read-only row-level-security policies).
2. Put one JSON file per character in `wuwa-data/characters/<slug>.json` (see `aalto.json` for the shape) and art in `wuwa-data/images/characters/`. `wuwa-data/` is gitignored and must not be pushed. To collect all characters from Prydwen, run `cd wuwa-data/scraper; npm install; node scrape.mjs [slug ...]` (cached HTML goes in `wuwa-data/cache/`).
3. Run `node scripts/wuwa-build-seed.mjs` to generate `wuwa-data/seed/seed-01.sql` onward, then run each file in the SQL editor in order. They upsert by slug, so they can be re-run.
4. Upload the art to a public Storage bucket named `WutheringWaves`, keeping the `image_path` values (for example `characters/aalto.webp`).
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` and in Vercel (no `VITE_` prefix).

### Weapons

`/wuthering-waves/archives/weapons` (grid with search plus rarity, type and substat filters) and `/wuthering-waves/archives/weapons/<slug>` (collapsible skill, syntony ranks, level stats, recommended characters, how to obtain, lore) read `/api/wuwa-weapons` (`api/wuwa-weapons.js`), which uses the same Supabase settings. Setup:

1. Run `db/wuwa-weapons-schema.sql` in the SQL editor.
2. Scrape the Game8 weapon list: `cd wuwa-data/scraper; node fetch-weapons.mjs; node parse-weapons.mjs` (needs `wuwa-data/weapons-cache/list.html`, the saved Game8 weapon list page). Then add wuthering.gg: save https://wuthering.gg/weapons as `wuwa-data/weapons-cache/gg-list.html`, run `node fetch-gg-weapons.mjs`, then `node merge-gg-weapons.mjs` and `node fix-weapon-levels.mjs` (repairs level tables Game8 left blank or mistyped and removes "Under Investigation!" placeholders) (adds the ten 1★/2★ starter weapons and missing lore). Icons come from wuthering.gg (transparent, larger than Game8's) and go to `wuwa-data/images/weapons/`; the Game8 originals are kept in `wuwa-data/images/weapons-game8/`. Output is the gitignored `wuwa-data/weapons/`.
3. Run `node scripts/wuwa-build-weapon-seed.mjs`, then run `wuwa-data/seed/weapons-01.sql` onward in the SQL editor (they upsert by slug). Re-run `db/wuwa-weapons-schema.sql` first if it changed (it adds `max_level`).
4. Upload `wuwa-data/images/weapons/` to the `WutheringWaves` bucket as `weapons/<slug>.png`.

### Sonata effects

`/wuthering-waves/archives/sonata-effects` (grid of all 37 echo sets with their 2-/5-piece bonuses; search by set or bonus text, element and piece-count filters) and `/wuthering-waves/archives/sonata-effects/<slug>` (collapsible set bonuses, best and alternative characters, echo main stat priority by cost, the echoes that can use the set, where to farm it, and notes) read `/api/wuwa-sonata` (`api/wuwa-sonata.js`), which uses the same Supabase settings. Setup:

1. Run `db/wuwa-sonata-schema.sql` in the SQL editor.
2. Scrape Game8's sonata list and set pages: `cd wuwa-data/scraper; node fetch-sonata.mjs; node parse-sonata.mjs` (needs `wuwa-data/sonata-cache/list.html`, the saved Game8 list page, https://game8.co/games/Wuthering-Waves/archives/456215). Set icons come from wuthering.gg's echoes page (save https://wuthering.gg/echos as `wuwa-data/sonata-cache/gg-echos.html`, then `node fetch-sonata-icons.mjs`) into `wuwa-data/images/sonata/`. Output is the gitignored `wuwa-data/sonata/`.
3. Run `node scripts/wuwa-build-sonata-seed.mjs`, then run `wuwa-data/seed/sonata-01.sql` in the SQL editor (it upserts by slug).
4. Upload `wuwa-data/images/sonata/` to the `WutheringWaves` bucket as `sonata/<slug>.png`.

### Echoes

`/wuthering-waves/archives/echoes` (grid of all 187 echoes with cost, class and sonata set icons; search by name, cost, class and sonata effect filters) and `/wuthering-waves/archives/echoes/<slug>` (collapsible echo skill, possible sonata effects linking to their pages, main stats and substat ranges at Lv. 25, where to get, and material drops) read `/api/wuwa-echoes` (`api/wuwa-echoes.js`), which uses the same Supabase settings. The sonata set icons come from the sonata effects images, so load those too. Setup:

1. Run `db/wuwa-echoes-schema.sql` in the SQL editor.
2. Scrape Game8's echo list and pages plus wuthering.gg's echo pages: `cd wuwa-data/scraper; node fetch-echoes.mjs; node parse-echoes.mjs; node fetch-echo-icons.mjs` (needs the saved lists `wuwa-data/echo-cache/list.html`, https://game8.co/games/Wuthering-Waves/archives/452491, and `gg-list.html`, https://wuthering.gg/echos). Output is the gitignored `wuwa-data/echoes/` and `wuwa-data/images/echoes/`.
3. Run `node scripts/wuwa-build-echo-seed.mjs`, then run `wuwa-data/seed/echoes-01.sql` onward in the SQL editor (they upsert by slug).
4. Upload `wuwa-data/images/echoes/` to the `WutheringWaves` bucket as `echoes/<slug>.png`.

## Silver Palace pages

`/silver-palace` is a client-routed app (`silver-palace/index.html`, `src/sp-main.jsx`, `src/SilverPalace.jsx`, `src/silver-palace.css`) built like the Wuthering Waves one: it reuses `Sidebar.jsx`, the shared helpers in `src/archive-kit.jsx` and the layout classes of `wuwa.css`, re-themed in orange. The home page is a full-viewport hero with the supplied artwork (`images/sp/hero/sp-main.jpg`, a 1920px copy of the 7.8 MB original, which is kept outside the repo) and the Silvernia description (`OVERVIEW` in `src/SilverPalace.jsx`). **Archives** (`/silver-palace/archives`, redirects to Characters; the title bar is ready for more tabs) has `/silver-palace/archives/characters` (searchable grid with rarity, attribute, combat style and identity filters) and `/silver-palace/archives/characters/<slug>`: banner, title, faction, weapon, base stats with a character-level slider, preferred gifts and the trust table, all five skills with a skill-level slider over their damage numbers, and the six psyches. Builds and teams are intentionally left out. The "Silver Palace" link in the `/gaming` game bar opens it. Vite dev/preview and `vercel.json` send every path under `/silver-palace` to the one entry.

Data comes from `/api/sp-characters` (`?slug=` for one character, `api/sp-characters.js`, tests in `server/sp-characters.test.js`), reading Supabase with the same `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Images come from the public Storage bucket `SilverPalace` (override with `SP_IMAGE_BASE`). Without the Supabase settings the API answers 503 ("THE ARCHIVES ARE CURRENTLY SEALED"), and 502 if the database cannot be read.

The tables are normalised and all prefixed `sp_` (see the diagram at the top of `db/silver-palace-schema.sql`): `sp_traits` (attribute, combat style, identity, faction), `sp_characters`, `sp_character_stats` (one row per level), `sp_gifts` + `sp_character_gifts`, `sp_character_trust_levels`, `sp_character_skills`, `sp_skill_scaling` (one row per skill value per level, with the number and unit split out) and `sp_character_psyches`. New data such as builds or weapons should get their own `sp_*` tables that reference `sp_characters`. Setup:

1. Run `db/silver-palace-schema.sql` in the Supabase SQL editor (safe to re-run).
2. Collect the data: `node scripts/sp-scrape.mjs [slug ...]` reads hideoutgacha.com (character list, then each character page) into the gitignored `sp-data/characters/<slug>.json` and downloads every image into `sp-data/images/`, already arranged by Storage path. It needs `curl.exe`.
3. Run `node scripts/sp-build-seed.mjs`, then run `sp-data/seed/sp-01.sql` onward in the SQL editor. Each file is self-contained (it upserts its traits and gifts, then replaces the character's child rows), so files can be run in any order and re-run after a refresh.
4. Upload the contents of `sp-data/images/` to a public bucket named `SilverPalace`, keeping the folder structure (`characters/`, `traits/`, `gifts/`, `psyches/`).
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` and in Vercel (shared with the Wuthering Waves pages).

### Motives

The Archives bar also has a **Motives** tab: `/silver-palace/archives/motives` (grid of all 40 motives; search by name or effect, rarity and identity filters) and `/silver-palace/archives/motives/<slug>` (base HP/ATK and bonus stat, the motive skill with an R1–R5 slider, and the lore; panels start minimized). Code: `src/SilverPalaceMotives.jsx`, API `api/sp-motives.js` (tests in `server/sp-motives.test.js`). Setup, after the character setup above:

1. Run `db/silver-palace-motives-schema.sql` (adds `sp_motives` and `sp_motive_ranks`; a motive's identity links to `sp_traits`).
2. `node scripts/sp-scrape-motives.mjs` reads hideoutgacha.com's motives list into `sp-data/motives/<slug>.json` and the icons into `sp-data/images/motives/`. Two pairs of motives share a name, so those slugs end with the game id.
3. `node scripts/sp-build-motives-seed.mjs`, then run `sp-data/seed/sp-motives.sql` in the SQL editor (safe to re-run; it adds the one new identity, Victim, without touching existing icons).
4. Upload `sp-data/images/motives/` to the `SilverPalace` bucket as `motives/<file>`.

### Epiphanies

The **Epiphanies** tab (equipment) has `/silver-palace/archives/epiphanies` (grid of all 30; search by name or effect, main stat and level filters) and `/silver-palace/archives/epiphanies/<slug>` (main stat, level, effect, a Stats panel with the main stat, three substats and level, the shared "Possible addendums · Any-character Ink" list, and lore; panels start minimized). The level is the level the listed stats are quoted for; higher-level epiphanies roll larger numbers (a DMG Bonus main stat is +15% at Lv. 20 and +19.5% at Lv. 70). The addendum list is the same for every epiphany, so it is one shared table (`sp_epiphany_addendums`). Code: `src/SilverPalaceEpiphanies.jsx`, API `api/sp-epiphanies.js` (tests in `server/sp-epiphanies.test.js`). Stats are stored as published with label, number and unit split out. Setup:

1. Run `db/silver-palace-epiphanies-schema.sql` (adds `sp_epiphanies` and `sp_epiphany_substats`).
2. `node scripts/sp-scrape-epiphanies.mjs` writes `sp-data/epiphanies/<slug>.json` and downloads the icons to `sp-data/images/epiphanies/`.
3. `node scripts/sp-build-epiphanies-seed.mjs`, then run `sp-data/seed/sp-epiphanies.sql` in the SQL editor (safe to re-run).
4. Upload `sp-data/images/epiphanies/` to the `SilverPalace` bucket as `epiphanies/<file>`.

### Catalysts

The **Catalysts** tab has `/silver-palace/archives/catalysts` (grid of all 17; search by name, effect or where to get it) and `/silver-palace/archives/catalysts/<slug>` (type, max stack, the effect and where to get it; panels start minimized). Code: `src/SilverPalaceCatalysts.jsx`, API `api/sp-catalysts.js` (tests in `server/sp-catalysts.test.js`). Several catalysts share one icon. Setup:

1. Run `db/silver-palace-catalysts-schema.sql` (adds `sp_catalysts` and `sp_catalyst_sources`).
2. `node scripts/sp-scrape-catalysts.mjs` writes `sp-data/catalysts/<slug>.json` and downloads the icons to `sp-data/images/catalysts/`.
3. `node scripts/sp-build-catalysts-seed.mjs`, then run `sp-data/seed/sp-catalysts.sql` in the SQL editor (safe to re-run).
4. Upload `sp-data/images/catalysts/` to the `SilverPalace` bucket as `catalysts/<file>`.
