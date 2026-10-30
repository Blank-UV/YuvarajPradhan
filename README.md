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

The landing book starts closed with a straight navy hardcover. Opening it reveals a blank left page and the selected chapter on the right. Mobile shows only the chapter page, with its own flip-and-fade transitions and no underlying page visible during cover flips. Both states fit the viewport without scrolling. Chapter links and “Close book” sit above the spread, and the previous/next arrows flank it. Desktop closing animates the cover from left to right; reduced motion skips the animation.

## Channel intro preview

The **IamUV** name at the top of `/gaming` opens `/intro` in a new tab. It is also accessible by keyboard and stays visible on narrow mobile screens. Vite dev/preview explicitly resolve `/intro` to its own entry; `vercel.json` supplies the same rewrite for deployment. Restart an already-running preview server after changing Vite routes, and rebuild before previewing changed source.

Open `/intro` for a standalone 5-second IamUV animation (`src/intro-main.jsx`, `src/intro.css`). The I drops at the right end of the centered wordmark, then slides left as the leading edge of a right-to-left reveal (V, U, m, then a), finishing as IamUV at 1 second. The bar sits just above the letters, drops with the I, and extends left with its slide. A cat peeks over the top bar from 1.2 to 1.9 seconds and opens its mouth at the audio cue, without a speech bubble. The page shows only the centered intro against a full-screen background, without navigation or visible controls, apart from a subdued top-left "PRESS AGAIN FOR AUDIO" hint. Click or tap anywhere (or focus the page button and press Enter/Space) to replay with sound. The initial automatic animation is silent because browsers require a user gesture for audio. Replay plays only `audio/whoosh-short-realistic.mp3` at the slide's start (0.55 seconds), followed by `audio/cat-meow.mp3` at the cat's meow cue (1.9 seconds). The whoosh plays only the 0.65–1.10-second portion of its source, with short edge fades, to remove the lead-in and tail and fit the 0.45-second slide. The original file is untouched. Both recordings play at their original speed; there are no synthesized effects, landing taps, or completion clicks. Sound scheduling follows the animation's actual start and compensates for output latency using browser audio timestamps (or reported latency when timestamps are unavailable). Both recordings load before the animation restarts, and replay stops any previous sound. Reduced motion shows the finished logo without animation or sound. This is a browser preview, not an MP4/video exporter, and does not replace the gaming loader or landing page.

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
