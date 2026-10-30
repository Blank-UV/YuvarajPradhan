import React, { useLayoutEffect, useRef, useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import useColorMode from './useColorMode.js'

const chapters = [
  {
    number: '01',
    title: 'The developer.',
    category: 'LOGIC / CRAFT / POSSIBILITY',
    description:
      'A space for the things I build. Explore my development work and the ideas behind it.',
    link: '/portfolio',
    action: 'Explore the portfolio',
    name: 'Developer',
  },
  {
    number: '02',
    title: 'The gamer.',
    category: 'PLAY / DISCOVER / REPEAT',
    description: 'Another world, another adventure. Gameplay, guides, and moments worth sharing.',
    link: '/gaming',
    action: 'Enter the gaming world',
    name: 'Gamer',
  },
  {
    number: '03',
    title: 'Still unwritten.',
    category: 'MORE STORIES / COMING SOON',
    description:
      'There are more sides to this story. New pages and new places will find their way here.',
    symbol: '…',
    name: 'Coming soon',
  },
]

function Arrow({ back = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={back ? 'M20 12H4m6-6-6 6 6 6' : 'M4 12h16m-6-6 6 6-6 6'} />
    </svg>
  )
}

function Chapter({ chapter, preview = false }) {
  return (
    <div className={`book-chapter chapter-${chapter.number}`} aria-hidden={preview || undefined}>
      <div className="book-page-top">
        <span>CHAPTER {chapter.number}</span>
        <span>YP / A PERSONAL JOURNAL</span>
      </div>
      <div className="book-illustration" aria-hidden="true">
        <span className="book-illustration-orbit" />
        {chapter.number === '01' ? (
          <svg
            className="book-developer-art"
            viewBox="0 0 300 180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="22" y="24" width="188" height="112" rx="6" />
            <rect x="30" y="32" width="172" height="85" rx="2" />
            <path d="M22 124h188M102 136v17m28-17v17m-42 0h56" />
            <circle cx="116" cy="130" r="1" fill="currentColor" stroke="none" />
            <text
              x="40"
              y="77"
              fill="currentColor"
              stroke="none"
              fontFamily="'DM Mono', monospace"
              fontSize="8.2"
            >
              {'system.out.println("HELLO")'}
            </text>
            <path d="M40 89h18" opacity=".5" />
            <g transform="translate(226 42)">
              <rect width="46" height="110" rx="5" />
              <rect x="8" y="10" width="30" height="7" rx="2" />
              <path d="M9 29h28M9 35h28" opacity=".6" />
              <circle cx="23" cy="51" r="6" />
              <path d="M23 45v5M10 78h26M10 85h26M10 92h26" />
              <circle cx="23" cy="66" r="1" fill="currentColor" stroke="none" />
            </g>
            <g transform="translate(31 157)">
              <path d="M5 0h164l5 18H0Z" />
              <path
                d="M10 5h153M9 10h155M45 15h79M20 3v9M34 3v9M48 3v9M62 3v9M76 3v9M90 3v9M104 3v9M118 3v9M132 3v9M146 3v9"
                opacity=".6"
              />
            </g>
          </svg>
        ) : chapter.number === '02' ? (
          <svg
            className="book-gaming-art"
            viewBox="0 0 300 180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g transform="translate(24 38) rotate(-12 48 25)">
              <rect width="100" height="51" rx="6" />
              <path
                d="M10 12h80M10 22h80M10 32h80M20 42h60M17 8v28M29 8v28M41 8v28M53 8v28M65 8v28M77 8v28M89 8v28"
                opacity=".65"
              />
            </g>
            <g transform="translate(233 33) rotate(15 18 30)">
              <rect width="36" height="59" rx="18" />
              <path d="M18 1v23M1 25h34" />
              <rect x="15" y="9" width="6" height="11" rx="3" />
            </g>
            <g transform="translate(88 98)">
              <path d="M25 5c-10-4-16 1-19 12L0 43c-3 15 9 23 19 12l12-13h62l12 13c10 11 22 3 19-12l-6-26C115 6 109 1 99 5L84 9H40Z" />
              <path d="M22 18v18M13 27h18" />
              <circle cx="97" cy="21" r="3" />
              <circle cx="106" cy="30" r="3" />
              <circle cx="88" cy="30" r="3" />
              <circle cx="97" cy="39" r="3" />
              <circle cx="46" cy="33" r="7" />
              <circle cx="76" cy="33" r="7" />
              <path d="M57 19h10" />
            </g>
            <path d="m140 36 4-5m59 47 5 2M65 112l-5 3" opacity=".5" />
          </svg>
        ) : (
          <span className="book-illustration-mark">{chapter.symbol}</span>
        )}
        <span className="book-illustration-caption">{chapter.category}</span>
      </div>
      <div className="book-chapter-copy">
        <span className="book-kicker">A DIFFERENT SIDE OF ME</span>
        <h2>{chapter.title}</h2>
        <p>{chapter.description}</p>
        {chapter.link ? (
          preview ? (
            <span className="book-page-link">
              {chapter.action} <Arrow />
            </span>
          ) : (
            <a className="book-page-link" href={chapter.link}>
              {chapter.action} <Arrow />
            </a>
          )
        ) : (
          <span className="book-unwritten">GOOD THINGS TAKE A LITTLE TIME</span>
        )}
      </div>
      <span className="book-page-number">{chapter.number}</span>
    </div>
  )
}

function CoverFace() {
  return (
    <span className="book-closed-front">
      <span className="book-cover-edition">THE PERSONAL EDITION / VOL. 01</span>
      <span className="book-cover-title">
        <span className="book-cover-small">THE WORLDS OF</span>
        <span className="book-closed-name">{site.identity.name}</span>
        <span className="book-cover-flourish" aria-hidden="true">
          ✦
        </span>
        <span className="book-closed-subtitle">
          A few different paths.
          <br />
          All part of the same story.
        </span>
      </span>
      <span className="book-open-cue">
        OPEN THE BOOK <Arrow />
      </span>
    </span>
  )
}

function ImagePage() {
  return <aside className="book-image-page" aria-hidden="true" />
}

export default function Hub() {
  const [colorMode, toggleColorMode] = useColorMode()
  const [active, setActive] = useState(0)
  const [turn, setTurn] = useState(null)
  const [opened, setOpened] = useState(false)
  const [closing, setClosing] = useState(false)
  const [settling, setSettling] = useState(false)
  const [opening, setOpening] = useState(null)
  const touch = useRef(null)
  const viewportRef = useRef(null)
  const libraryRef = useRef(null)
  const bookRef = useRef(null)
  const coverRef = useRef(null)
  const chapter = chapters[active]

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const library = libraryRef.current
    const fit = () => {
      const scale = Math.min(1, viewport.clientHeight / library.offsetHeight)
      library.style.setProperty('--book-fit', String(scale))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(viewport)
    observer.observe(library)
    fit()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (opened && !opening) bookRef.current?.focus({ preventScroll: true })
    else coverRef.current?.focus({ preventScroll: true })
  }, [opened, opening])

  function goTo(next) {
    if (turn || closing || opening || next === active || next < 0 || next >= chapters.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(next)
      return
    }
    setTurn({ from: active, to: next, direction: next > active ? 'forward' : 'back' })
  }

  function closeBook() {
    if (turn || closing || opening) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpened(false)
    } else {
      setClosing(true)
    }
  }

  function openBook() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setOpening('slide')
    setOpened(true)
  }

  return (
    <main className={`hub ${colorMode === 'light' ? 'theme-light' : ''}`}>
      <header className="hub-top">
        <span className="hub-brand">
          <b>YP</b> {site.identity.name}
        </span>
        <button
          className="hub-theme"
          type="button"
          onClick={toggleColorMode}
          aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={colorMode === 'light'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {colorMode === 'light' ? (
              <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
            ) : (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
              </>
            )}
          </svg>
          {colorMode === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
        </button>
      </header>

      <div className="hub-library-viewport" ref={viewportRef}>
        <section
          className={`hub-library ${opening || closing ? 'book-ui-hidden' : ''}`}
          aria-label="Personal journal"
          ref={libraryRef}
        >
          {!opened ? (
            <div className="book-closed-stage">
              <button
                type="button"
                className="book-closed"
                ref={coverRef}
                onClick={openBook}
                aria-label="Open the book"
              >
                <span className="book-closed-spine" aria-hidden="true" />
                <CoverFace />
              </button>
            </div>
          ) : (
            <>
              <nav className="book-chapter-tabs" aria-label="Book chapters">
                {chapters.map((item, index) => (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => goTo(index)}
                    disabled={Boolean(turn) || closing || Boolean(opening)}
                    aria-current={active === index ? 'page' : undefined}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={closeBook}
                  disabled={Boolean(turn) || closing || Boolean(opening)}
                >
                  Close book
                </button>
              </nav>
              <div className="book-open-stage">
                <button
                  className="book-side-arrow book-side-previous"
                  type="button"
                  aria-label="Previous chapter"
                  onClick={() => goTo(active - 1)}
                  disabled={active === 0 || Boolean(turn) || closing || Boolean(opening)}
                >
                  <Arrow back />
                </button>
                <div
                  className={`book ${closing ? 'book-is-closing' : ''} ${settling ? 'book-is-settling' : ''} ${opening ? `book-opening-${opening}` : ''}`}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (opening === 'slide') {
                      setOpening('unfold')
                      return
                    }
                    if (!settling) return
                    setSettling(false)
                    setClosing(false)
                    setOpened(false)
                  }}
                  ref={bookRef}
                  tabIndex={-1}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                      event.preventDefault()
                      goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
                    }
                  }}
                  onTouchStart={(event) => {
                    touch.current = event.touches[0].clientX
                  }}
                  onTouchEnd={(event) => {
                    if (touch.current === null) return
                    const distance = touch.current - event.changedTouches[0].clientX
                    if (Math.abs(distance) > 60) goTo(active + (distance > 0 ? 1 : -1))
                    touch.current = null
                  }}
                >
                  <ImagePage />
                  <div className="book-paper">
                    <Chapter chapter={chapters[turn?.direction === 'forward' ? turn.to : active]} />
                    {turn && (
                      <div
                        className={`book-turn book-direction-${turn.direction}`}
                        aria-hidden="true"
                        onAnimationEnd={(event) => {
                          if (event.target !== event.currentTarget) return
                          setActive(turn.to)
                          setTurn(null)
                        }}
                      >
                        <div className="book-turn-front">
                          <Chapter
                            chapter={chapters[turn.direction === 'back' ? turn.to : turn.from]}
                            preview
                          />
                        </div>
                        <div className="book-turn-back" />
                      </div>
                    )}
                  </div>
                  {(closing || opening) && (
                    <div
                      className="book-close-sheet"
                      aria-hidden="true"
                      onAnimationEnd={(event) => {
                        if (event.target !== event.currentTarget) return
                        if (opening === 'unfold') setOpening(null)
                        else if (closing) setSettling(true)
                      }}
                    >
                      <div className="book-close-front">
                        <div className="book-close-desktop-page">
                          <ImagePage />
                        </div>
                      </div>
                      <span className="book-close-title">
                        <CoverFace />
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="book-side-arrow book-side-next"
                  type="button"
                  aria-label="Next chapter"
                  onClick={() => goTo(active + 1)}
                  disabled={
                    active === chapters.length - 1 || Boolean(turn) || closing || Boolean(opening)
                  }
                >
                  <Arrow />
                </button>
              </div>
              <div className="book-controls">
                <span aria-live="polite">
                  {chapter.number} <span>/ {String(chapters.length).padStart(2, '0')}</span>
                </span>
              </div>
            </>
          )}
        </section>
      </div>
      <footer className="hub-foot">
        <span>DEVELOPER. GAMER. STILL EXPLORING.</span>
        <span>A STORY IN PROGRESS</span>
      </footer>
    </main>
  )
}
