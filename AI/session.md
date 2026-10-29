# Project sessions

Append a dated entry here when the owner asks to close out a day's work. Keep secrets and API keys out of this file.

## 2026-10-28

### Built today

- Created a React + Vite portfolio inspired by Endfield's fixed navigation rail, full-screen sections, strong typography, and switchable accent slides. The software page (`index.html`, `src/App.jsx`) focuses on Java and enterprise applications; unverified employment and project claims were intentionally left out.
- Added a separate, scrollable gaming page (`gaming.html`, `src/Gaming.jsx`) for IAmUV: latest/most-viewed featured videos, Wuthering Waves, Follow Now, upcoming Silver Palace and Ananta, and a YouTube call to action. Both pages link to each other through the sidebar and visible mobile intro links.
- Wired `/api/videos` to YouTube Data API v3. It retrieves the latest three uploads and the channel's most-viewed video, caches results for 30 minutes, and reports errors rather than presenting old videos as live. The featured player has labeled controls. Recent Transmissions shows three cards on desktop and a one-card, left/right-arrow carousel on mobile.
- Added the owner's Instagram, Discord, X, Twitch, and YouTube links with locally stored social icons. The logos keep their platform colors on both desktop and mobile, with extra hover/focus feedback.
- Added six optimized Wuthering Waves images in `images/wuwa/optimized`, rotating every 3 seconds while visible with a smooth crossfade and one next-image arrow. Clicking the framed image still triggers the resonance animation. The original images in `images/wuwa` were left untouched. Silver Palace and Ananta use optimized copies of the supplied artwork.
- Added persistent dark/light mode across both pages (`src/useColorMode.js`, `src/light.css`). Dark remains the default; the switch is in the sidebar. On short mobile screens the sidebar navigation scrolls so its theme and page-switch controls remain visible.
- Consolidated public identity, channel ID, links, handles, page metadata, and editable copy in `src/site-properties.js`. Added Prettier commands and formatted the source.

### Where to continue

- Name confirmed by the owner: Yuvaraj Pradhan. Current focus is only the gaming page; the software page is on hold. Email, GitHub, LinkedIn, actual career history, and case studies still need verified details when the software page resumes.
- The YouTube API key is stored only in ignored `.env.local`; never copy it into this file or frontend code. Rotate the key before deployment and configure the replacement as a server-side `YOUTUBE_API_KEY` on a host that runs `api/videos.js` (for example Vercel).
- Start locally with `npm.cmd run dev`. Available checks: `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run format:check`; format source with `npm.cmd run format`.

### Gaming page launch sequence (later the same day)

- Added an interactive orbit + data-arc hologram Earth (`src/HoloGlobe.jsx`, canvas, land dots from `world-atlas`) beside "THE NEXT ADVENTURE IS ONE CLICK AWAY" on desktop and behind the text on mobile. Drag spins it, hover slows it, arcs/nodes/satellites are multicolored.
- Clicking or tapping it runs a launch (`src/launchEffect.js`): each glowing point flies on its own curved path to one pad point, a detailed rocket lifts off with layered fire, sparks, and a smoke trail, the page scrolls up behind the steady rocket with speed streaks, smoke fills the bottom of the screen, and YouTube opens in a new tab. The page stays at the top afterwards. Reduced-motion users skip the animation and go straight to YouTube.
- "IamUV" replaces "I AM UV" in the top bar and the channel label (larger); the hero intro's first sentence is bold (`introHighlight` in `src/site-properties.js`).
- Not yet watched in real time, only checked with headless Edge screenshots; Safari may block the new tab and fall back to same-tab navigation.

### Opening sequence and review follow-ups (later the same day)

- Reviewed the code against this log: tests, format check, and build pass. README fixed (name confirmed; launch sequence documented).
- Added a loading screen on the gaming page modeled on Endfield's (`src/Loader.jsx`, styles at the end of `src/gaming.css`): IamUV logo, slogan, a large percentage counter, and a vertical bar filling top to bottom on all screen sizes. Progress tracks real preloading of images and fonts with a ~1 s minimum. At 100% an accent wipe sweeps in from the left, then the screen fades out. Reduced-motion users skip the wipe, fade, and grid drift. Page scroll is locked while it shows.
- The background is CSS only (no image): a slowly drifting white grid with an accent glow and a vignette.
- Only checked with headless screenshots (they stall near 0-3%); the full sequence has not been watched live. The software page has no loader yet.
- YouTube fallback: when `/api/videos` fails and no live data has loaded, the page shows hard-coded `fallbackVideos` in `src/site-properties.js` (latest `4KNFzjDPd8o`, most viewed `Xw-qBUXNcMI`, recent `4KNFzjDPd8o`, `FKbas0dkV0M`, `e4LNL6gOysI`) with a "showing saved videos" notice. Titles were fetched via YouTube oEmbed; view counts are omitted. Refresh them by hand.
- Routes: the software page is now `/portfolio` (`portfolio/index.html`) and the gaming page `/gaming` (`gaming/index.html`); `/` redirects to `/portfolio`. Cross-links and the sidebar brand button keep each page on itself. Vite `base` changed to `/`, so serve from the domain root. `vite.config.js` rewrites slash-less routes for dev/preview.
- Open gaps from the review: no git repo (`.idea/` not ignored), no deployment config (e.g. `vercel.json`), no UI tests, and the large original images are still beside the optimized card copies in `images/`.
