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
- Currently playing carousel: the sidebar item is now "Currently playing" (`#playing`). The section holds a swipe/arrow carousel of games (`gaming.games` in `src/site-properties.js`, component `GameCarousel` in `src/Gaming.jsx`) with clickable name tabs on top. Slide 1 is Wuthering Waves; slide 2 is a placeholder "Game Slot 02". Recent Transmissions stays below the carousel. Business email line added under the YouTube button in the closing section (`links.businessEmail`).
- Currently playing buttons: each game has two buttons, "GUIDES" and "CHARACTER GUIDES", linking to YouTube playlists (Wuthering Waves: `PL2I7Q3ZA7gL6dGe5Vp1e2zR_dzJzSdVgc` and `PL2I7Q3ZA7gL4wroK5maXH7aOVKZ3DKaK9`); the placeholder slot shows both disabled. Carousel tab flicker fixed (scroll-derived updates ignored while a button-triggered scroll animates) and the faint edge lines fixed (track bleeds past the content width).
- Final review pass: checked both pages at 1280, 800 and 390 wide, dark and light, with no console errors or sideways overflow. Added `public/favicon.svg` (YP mark, linked in all three HTML files) and moved the closing globe hint on screens 900px and narrower to a "TAP THE GLOBE TO LAUNCH" line above the footer so it no longer collides with the email block.
- YouTube fallback: when `/api/videos` fails and no live data has loaded, the page shows hard-coded `fallbackVideos` in `src/site-properties.js` (latest `4KNFzjDPd8o`, most viewed `Xw-qBUXNcMI`, recent `4KNFzjDPd8o`, `FKbas0dkV0M`, `e4LNL6gOysI`) with a "showing saved videos" notice. Titles were fetched via YouTube oEmbed; view counts are omitted. Refresh them by hand.
- Routes: the software page is now `/portfolio` (`portfolio/index.html`) and the gaming page `/gaming` (`gaming/index.html`); `/` redirects to `/portfolio`. Cross-links and the sidebar brand button keep each page on itself. Vite `base` changed to `/`, so serve from the domain root. `vite.config.js` rewrites slash-less routes for dev/preview.
- Open gaps from the review: no git repo (`.idea/` not ignored), no deployment config (e.g. `vercel.json`), no UI tests, and the large original images are still beside the optimized card copies in `images/`.

## 2026-10-29

### Changes

- Closing section heading ("THE NEXT ADVENTURE IS ONE CLICK AWAY.") reduced by 2px on desktop and mobile (.gaming-channel h2 in src/gaming.css).
- Loader slogan on screens 760px and narrower is now centered under the IamUV logo (block at 50%, width 86vw, font-size 3.3vw), with the divider and triangle centered too, so it stays aligned at any width. Checked at 366px with a headless Edge screenshot; only seen at ~89%, not the full sequence.

### Where to continue

- If the user meant the closing-section heading (not the loader slogan) when asking for mobile alignment, check that heading at 366px.

## 2026-10-30

### Gaming page: Other Games

- Added Other Games after Recent Transmissions and before Follow Now, with a matching sidebar navigation item. It shares the Currently Playing carousel controls (name tabs, previous/next arrows, and swipe), while keeping its own visual layout.
- Beast of Reincarnation has the slogan "BIG ENEMIES, PARRIES AND A DOG/WOLF", the supplied description, a 7/10 rating, and the supplied playlist URL: `https://www.youtube.com/playlist?list=PLH-A9MlOJKy0`. That URL has not been verified; confirm the ID before publishing.
- Phantom Blade Zero has "PARRIES MEETS STYLE", the supplied description, and */10 with "NOT PLAYED YET". No playlist was supplied, so its playlist button is disabled.
- Game details live in `gaming.otherGames` in `src/site-properties.js`. Both supplied images for each game are used: a fading background and a smaller tilted, clipped frame. Optimized copies are in `images/bor/optimized` and `images/pb0/optimized`; originals are untouched. Image keys are resolved by the glob in `src/Gaming.jsx`.
- Text is on the right on desktop. Mobile stacks the artwork and text. Removed the large decorative 01/02 numbers. Only the image inside the smaller frame moves on hover; the frame and background stay still.
- Fixed overflowing card text, uneven card heights, light-mode contrast, and unintended vertical scrolling inside the carousel track (`overflow-y: hidden`). Other Games bottom padding was reduced.
- Latest sidebar change: `.gaming-site .sidebar .side-nav` uses `overflow-x: clip` to prevent the horizontal scrollbar caused by long labels. A separate proposal to keep the portfolio-return link pinned on short desktop screens was withdrawn at the owner's request; do not reinstate that layout change without being asked.

### New default landing page: the book

- `/` no longer redirects to `/portfolio`. It loads an independent React entry, `src/hub-main.jsx`, with `src/Hub.jsx` and `src/hub.css`. `/portfolio` and `/gaming` still open directly and reload as before. The book redesign did not modify the portfolio page.
- Earlier floating bubbles and galaxy designs were discarded. The current landing page is a navy-blue hardcover book with pale blue paper, blue ink, a rounded spine, and no exposed white page edges on the closed cover. It starts closed and straight.
- Desktop opens into a two-page spread: the left page is now completely blank (no placeholders or text); the right has Developer, Gamer, or Coming Soon. Edit the `chapters` array in `src/Hub.jsx`. Developer links to `/portfolio`; Gamer links to `/gaming`; Coming Soon has no destination.
- The Developer illustration is a custom outline monitor, CPU tower, and keyboard, with `system.out.println("HELLO")` inside the monitor and "LOGIC / CRAFT / POSSIBILITY" below. Gamer uses outline keyboard, mouse, and controller artwork with "PLAY / DISCOVER / REPEAT"; the decorative asterisk was removed.
- Page text is centered. Developer / Gamer / Coming Soon / Close book controls sit above the spread; previous/next arrows flank it. The mobile footer "DEVELOPER. GAMER. STILL EXPLORING." is centered. Removed "ONE PERSON. MORE THAN ONE STORY.", the page-turn hint, image-page caption, and VISUALS label.
- Header retains the shared persistent light/dark preference via `src/useColorMode.js`. The toggle uses aligned 20px inline sun/moon SVG icons.
- The landing page fits the viewport without scrolling. A `ResizeObserver` scales the library to available height. Desktop closed-cover and individual open-page dimensions match; mobile shows only the right-hand chapter page, not the blank left page.

### Book animation details and fixes

- Desktop opening slides the closed book into position, then unfolds the cover. Closing folds the left page onto the right while stationary, then recenters the closed book. Both states use the same `CoverFace` artwork. Controls fade in after opening and fade out during closing.
- Mobile has separate partial-flip/fade animations rather than desktop's spread movement. Removed the duplicate chapter from the moving cover to prevent mirrored text. Closing cover fade-in overlaps the outgoing chapter fade-out so the book does not disappear between them.
- Desktop page turns keep an opaque blank reverse sheet visible while hiding reverse-side text; backward turns are also supported. Ink visibility timing is coordinated with the rotation.
- Animation timing is shared through CSS variables (`--book-turn-time`, `--book-cover-time`, `--book-slide-time`, `--book-easing`). JavaScript uses animation-end events, not hard-coded completion timers. Reduced-motion mode skips opening, closing, and page-turn animations.
- Important rendering fix: the rotating cover's `.book-close-sheet` must use `will-change: transform`, not `will-change: transform, opacity`. The opacity hint flattened its preserved 3D faces and made the desktop cover disappear during closing. Page-turn reverse faces use their own explicit visibility rules.

### Checks and where to continue

- Production builds passed after the latest changes. The existing six automated tests passed during today's work. Browser checks used headless Edge via temporary Puppeteer scripts, not a committed UI test suite.
- Checked opening, chapter navigation in both directions, closing/recentering, control fades, reduced motion, and viewport fit at desktop and mobile widths. Inspected screenshots of both themes and sampled animation frames/opacity to investigate disappearing pages. These checks are not a live manual review on physical devices.
- Latest gaming sidebar overflow check confirmed `overflow-x: clip` at desktop and mobile widths. The portfolio-return link remains configured in `src/Gaming.jsx`; on short desktop windows its visibility may still depend on the existing sidebar layout.
- The repository now has Git available (the older "no git repo" note is outdated). No commits were created in this session. README was updated for the default book page.
- Still needed: confirm the Beast of Reincarnation playlist URL, supply Phantom Blade Zero's playlist when ready, and manually review the final animations in a normal desktop browser and on a phone. Keep software-page content work on hold unless requested.

### Evening session: IamUV channel intro

- Added an independent `/intro` page: `intro/index.html`, `src/intro-main.jsx`, and `src/intro.css`. This is a React/CSS/SVG browser animation, not an exported video or a Remotion project. The landing book, portfolio page, and gaming loader were not replaced.
- The I drops at the right end of the centered wordmark, lands at 0.35 seconds, settles by 0.55 seconds, then slides left to reveal V, U, m, and a in that order. The completed name still reads IamUV and is fully revealed at 1 second.
- The accent bar sits just above the letters, drops with the I, and extends left with the reveal. The cat emerges from behind the bar from 1.2 to 1.9 seconds, with paws resting on it. Its mouth animates at the meow cue. The final logo remains on screen; the CSS timeline is 5 seconds.
- Removed the "PLAY. DISCOVER. REPEAT." caption and the visible meow speech bubble. The page now fills the viewport with only the intro and a small, softly translucent "PRESS AGAIN FOR AUDIO" hint at the top left, with a subtle accent line. No header, footer, sound checkbox, or visible replay button remains.
- Clicking or tapping anywhere replays with audio; the full-screen interaction is a native button with an accessible label and focus outline. The initial automatic animation is silent because browser autoplay restrictions require interaction for sound. Reduced-motion mode shows the final state without animation or audio.

### Intro recordings and synchronization

- Uses the supplied `audio/whoosh-short-realistic.mp3` and `audio/cat-meow.mp3`. Earlier synthesized meows, landing taps, generated whooshes, and completion clicks were removed; only the two recordings remain.
- The whoosh starts with the slide at 0.55 seconds. Playback selects only source seconds 0.65 through 1.10, with short gain fades at the cut edges, so it lasts 0.45 seconds and ends with the reveal. The source file is untouched and playback speed is unchanged.
- The meow starts at 1.9 seconds and plays the full recording at its original speed (about 0.86 seconds). Both recordings load and decode before a sound-enabled replay begins. Replay closes the previous audio context to prevent overlapping takes; loading and playback errors are shown explicitly.
- Sound scheduling waits for the CSS animation's actual start and maps it to the audio output clock using `getOutputTimestamp`, with a reported-latency fallback. Audio output is allowed to warm up before replay because initial timestamps can be unstable. Do not remove this timing logic as redundant: earlier scheduling produced audibly late cues.

### Gaming link, routing, and cleanup

- The IamUV name in the gaming top bar is now a link to `/intro`, opening in a new tab with `noopener noreferrer`, a tooltip, and hover/focus feedback. No extra PRESS button was added. Below 350px, the status dot is hidden and social buttons are slightly smaller so the name remains visible.
- Sidebar text colors were not changed. The new color feedback applies only to the clickable channel name in the gaming top bar.
- Added the intro entry and slashless route to `vite.config.js`, plus `vercel.json` with `/intro` rewritten to `/intro/index.html` for Vercel. The link intentionally remains `/intro`, not `/intro/`. Added `server/page-routes.test.js` to cover dev/preview routing, query strings, existing pages, the build entry, and the deployment rewrite.
- The old preview server on port 5173 was serving the main book for `/intro` because it had not loaded the updated Vite configuration. Restarting it fixed the actual server; clicking IamUV was then checked against the production preview on port 5173, including opening the correct intro in a separate tab.
- BOR inner-image framing is `shotPosition: '90% 50%'` in `src/site-properties.js`, centering the girl and wolf together. Straight and lighter-tilt variants were tried; the current frame code uses the original `rotate(-3deg)` and a 1px accent border. Original artwork files remain untouched.
- Removed unused transitions on the static Other Games frame/background, an unused cat CSS class, and an ineffective cat transform-origin rule. Kept the inner-image hover animation. Old intro UI styles and synthesized-audio code are already gone; all remaining intro CSS class selectors have JSX references.

### Evening checks and handoff

- Latest production build, formatting checks for edited source, and all nine automated tests passed after cleanup. Browser checks used headless Edge and temporary Chrome DevTools Protocol probes, not a committed UI test suite.
- Checked the reveal and moving bar at desktop/mobile sizes, reduced motion, recording decode/playback, trim boundaries, sound synchronization over repeated replays, replay cleanup, visible audio-loading errors, full-screen layout, hint positioning, and the gaming link in both themes down to 320px. Headless measurements are not a physical-device listening or live animation review.
- README documents the intro, playback behavior, recordings, trim, and routes. Both local servers (preview on 5173 and dev on 5180) were stopped at the owner's request and their ports were confirmed closed. Start with `npm.cmd run dev`, or run `npm.cmd run build` then `npm.cmd run preview -- --port 5173`; restart preview after Vite route changes.
- Remaining work: export to a video file only if requested, manually review the final animation/audio in a normal browser and on a phone, and keep the previously listed playlist/content follow-ups. Software-page content work remains on hold.

### Video export (later the same evening)

- Exported the requested MP4 to `exports/IamUV-intro-1080p.mp4`: 1920x1080 landscape, 30 fps, 150 frames, exactly 5 seconds, H.264/yuv420p video, AAC 48 kHz stereo audio, and fast-start metadata. The browser audio hint and controls are omitted from the video.
- Captured the existing CSS/SVG animation frame by frame in headless Edge. The soundtrack uses the same original-speed whoosh cut (source 0.65-1.10 seconds, playing at 0.55-1.00 seconds with edge fades) and full meow starting at 1.9 seconds. Inspected decoded video frames and verified non-silent audio in the expected windows, silence elsewhere, and no clipping.
- Generated exports are gitignored, and README describes the output. Encoding tools and capture scripts were isolated in the Copilot session folder; project dependencies were unchanged. The temporary rendering server and browser were stopped afterwards. The MP4 is a rendered snapshot and must be exported again if the animation or recordings change.
- After size review, the owner approved the entire logo/bar/cat group at 50% of its initial size (`transform: scale(0.5)` on `.intro-composition`). Re-rendered `exports/IamUV-intro-1080p.mp4` at that approved size, preserving all timing and the identical soundtrack. The review dev server on port 5173 was left running; temporary export processes were stopped.
- Fixed a resize regression that left the I and bar visible in the first video frame: `.intro-composition` now defines `--intro-scale: 0.5`, and the drop starts at `calc(-100dvh / var(--intro-scale))` so its visible travel remains offscreen at any group scale. Re-rendered the MP4 and checked its actual decoded first frame contains only background. The final approved layout, landing/reveal timing, and soundtrack are unchanged.
- Also rendered `exports/IamUV-intro-4K.mp4` at native 3840x2160 from the browser artwork, not by upscaling the 1080p MP4. It retains the approved 50% composition, 30 fps, 5-second duration, blank first frame, and identical decoded soundtrack. The existing corrected 1080p file was left unchanged. Both exports are documented in README and gitignored.

### Final handoff after the browser CSS revert

- The owner reverted `src/intro.css` because the smaller composition was wanted only for the videos. This supersedes the earlier browser-size notes: `/intro` now uses its original full-size composition, without `scale(0.5)` or `--intro-scale`, and the drop again starts at `translateY(-45cqw)`. Do not reapply the smaller video size to the website without being asked.
- Both delivered MP4s remain unchanged: `exports/IamUV-intro-1080p.mp4` (182,728 bytes) and `exports/IamUV-intro-4K.mp4` (456,386 bytes). They retain the approved 50% composition, corrected background-only first frame, 30 fps, 5-second duration, and synchronized recordings. Reverting CSS does not change already-rendered video files.
- Future video renders must apply the 50% composition and scale-compensated offscreen drop as export-only styling, rather than changing the browser design. Temporary rendering scripts are in the Copilot session files; their capture checks currently expect the video-specific 50% scale.
- Checked the reverted page at 1920x1080, 390x844, and 844x390: full-size layout fits without scrolling, the name completes at 1 second, audio replay and whoosh trimming still work, reduced motion still skips animation/audio, and no runtime exceptions were observed. Formatting, production build, and all nine automated tests passed.
- Known browser caveat, reported but not changed: at 390x844 portrait size, the restored `-45cqw` drop leaves the I already visible in the first frame (its box is approximately y=219-273px). Desktop and landscape start offscreen. This does not affect the corrected MP4s.
- The current `.gitignore` no longer includes `exports/`; the MP4s are untracked and can be included by `git add .`. This supersedes earlier notes saying they are ignored. Do not silently restore the ignore rule.
- README still describes the browser as using the 50% composition and generated exports as gitignored. Those statements are now outdated and were flagged during review; the review itself did not edit source or documentation.
- All portfolio servers were stopped at the owner's request. After the temporary revert-check server was also stopped, ports 5173, 5180, and 5181 were confirmed closed. No check server was left running.
