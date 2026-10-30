import React, { useEffect, useRef, useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import HoloGlobe from './HoloGlobe.jsx'
import Loader from './Loader.jsx'
import Sidebar, { gamingNavigation } from './Sidebar.jsx'
import useColorMode from './useColorMode.js'
import silverPalaceImage from '../images/silver-palace-mc-card.jpg'
import anantaImage from '../images/ananta-key-art-card.jpg'
import instagramIcon from './assets/instagram.svg'
import discordIcon from './assets/discord.svg'
import xIcon from './assets/x.svg'
import twitchIcon from './assets/twitch.svg'
import youtubeIcon from './assets/youtube.svg'

const wutheringImages = Object.entries(
  import.meta.glob('../images/wuwa/optimized/*.jpg', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([left], [right]) =>
    left.includes('shorekeeper')
      ? -1
      : right.includes('shorekeeper')
        ? 1
        : left.localeCompare(right),
  )
  .map(([, url]) => url)

if (wutheringImages.length === 0) {
  throw new Error('No optimized Wuthering Waves images found')
}

const otherGameImages = Object.fromEntries(
  Object.entries(
    import.meta.glob('../images/{bor,pb0}/optimized/*.jpg', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.split('/').pop().replace('.jpg', ''), url]),
)

function OtherGameSlide({ game }) {
  return (
    <article className="other-game">
      <div className="other-game-art">
        <img src={otherGameImages[game.imageKey]} alt={`${game.name} key art`} loading="lazy" />
      </div>
      <div className="other-game-glow" aria-hidden="true" />
      <div className="other-game-shot" style={{ '--shot-position': game.shotPosition }}>
        <img
          src={otherGameImages[game.shotKey]}
          alt={`${game.name} character art`}
          loading="lazy"
        />
      </div>
      <div className="other-game-copy">
        <span className="gaming-eyebrow">PLAYED / PLAYLIST</span>
        <h2>
          {game.titleTop}
          <br />
          <em>{game.titleEm}</em>
        </h2>
        <p className="other-game-slogan">{game.slogan}</p>
        <p className="other-game-desc">{game.description}</p>
        <div className="other-game-rating">
          <span>MY RATING</span>
          <strong>
            {game.rating}
            <small>/10</small>
          </strong>
          {game.rating === '*' && <em>NOT PLAYED YET</em>}
        </div>
        {game.playlistUrl ? (
          <a
            className="other-game-button"
            href={game.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            WATCH PLAYLIST <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="other-game-button is-disabled" aria-disabled="true">
            PLAYLIST COMING SOON
          </span>
        )}
      </div>
    </article>
  )
}

const followPlatforms = [
  {
    name: 'Instagram',
    handle: site.socialLabels.instagram,
    action: 'FOLLOW THE MOMENTS',
    url: site.links.instagram,
    icon: instagramIcon,
  },
  {
    name: 'Discord',
    handle: site.socialLabels.discord,
    action: 'JOIN THE SERVER',
    url: site.links.discord,
    icon: discordIcon,
  },
  { name: 'X', handle: site.socialLabels.x, action: 'FOLLOW ON X', url: site.links.x, icon: xIcon },
  {
    name: 'YouTube',
    handle: site.identity.channelHandle,
    action: 'WATCH & SUBSCRIBE',
    url: site.links.youtube,
    icon: youtubeIcon,
  },
]

const headerPlatforms = [
  {
    name: 'Instagram',
    url: site.links.instagram,
    icon: instagramIcon,
    className: 'social-instagram',
  },
  { name: 'Discord', url: site.links.discord, icon: discordIcon, className: 'social-discord' },
  { name: 'X', url: site.links.x, icon: xIcon, className: 'social-x' },
  { name: 'Twitch', url: site.links.twitch, icon: twitchIcon, className: '' },
  { name: 'YouTube', url: site.links.youtube, icon: youtubeIcon, className: 'social-youtube' },
]

function FollowCard({ platform }) {
  const className = `follow-card follow-${platform.name.toLowerCase()}`
  const content = (
    <>
      <div className="follow-card-top">
        <span>SOCIAL</span>
        <span aria-hidden="true">{platform.url ? '↗' : '–'}</span>
      </div>
      <div className="follow-card-icon">
        <img src={platform.icon} alt="" />
      </div>
      <div className="follow-card-bottom">
        <h3>{platform.name}</h3>
        <span>{platform.handle}</span>
        <small>{platform.url ? platform.action : 'LINK COMING SOON'}</small>
      </div>
    </>
  )

  return platform.url ? (
    <a
      className={className}
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${platform.name} (opens in a new tab)`}
    >
      {content}
    </a>
  ) : (
    <div className={`${className} follow-pending`}>{content}</div>
  )
}

function VideoPlayer({ video, label }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="gaming-player">
      {playing ? (
        <iframe
          title={video.title}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          className="gaming-poster"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${video.title}`}
        >
          <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" />
          <span className="gaming-play" aria-hidden="true">
            ▶
          </span>
          <span className="gaming-poster-label" aria-hidden="true">
            PLAY {label.toUpperCase()}
          </span>
        </button>
      )}
    </div>
  )
}

function VideoCard({ video }) {
  return (
    <a
      className="gaming-video-card"
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="gaming-video-image">
        <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" />
        <span aria-hidden="true">↗</span>
      </div>
      <div className="gaming-video-meta">
        <span>CHANNEL UPLOAD</span>
        <span>WATCH ON YOUTUBE ↗</span>
      </div>
      <h3>{video.title}</h3>
    </a>
  )
}

function RecentVideos({ videos }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(null)
  const activeIndex = index % videos.length

  function move(step) {
    setDirection(step > 0 ? 'next' : 'previous')
    setIndex((current) => (current + step + videos.length) % videos.length)
  }

  return (
    <>
      <div className="gaming-video-list">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      <div
        className="gaming-video-carousel"
        role="region"
        aria-label="Recent videos"
        aria-live="polite"
      >
        <div
          key={videos[activeIndex].id}
          className={`gaming-video-carousel-card ${direction ? `from-${direction}` : ''}`}
        >
          <VideoCard video={videos[activeIndex]} />
        </div>
        {videos.length > 1 && (
          <div className="gaming-video-controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous recent video">
              <span aria-hidden="true">←</span> PREVIOUS
            </button>
            <div className="gaming-video-dots" aria-hidden="true">
              {videos.map((video, dotIndex) => (
                <span key={video.id} className={dotIndex === activeIndex ? 'active' : ''} />
              ))}
            </div>
            <button type="button" onClick={() => move(1)} aria-label="Next recent video">
              NEXT <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function WutheringArtwork() {
  const artworkRef = useRef(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [previousImage, setPreviousImage] = useState(null)
  const [pulse, setPulse] = useState(0)
  const [effect, setEffect] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  function nextImage() {
    setPreviousImage(wutheringImages[imageIndex])
    setImageIndex((current) => (current + 1) % wutheringImages.length)
    setPulse(0)
    setEffect('slide')
  }

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.2,
    })
    observer.observe(artworkRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    wutheringImages.slice(1).forEach((src) => {
      const image = new Image()
      image.src = src
    })
  }, [isVisible])

  useEffect(() => {
    if (!isVisible || wutheringImages.length < 2) return
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        nextImage()
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [isVisible, imageIndex, pulse])

  return (
    <div className="wuthering-art" ref={artworkRef}>
      {pulse > 0 && (
        <div key={pulse} className="wuthering-resonance-burst" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <button
        type="button"
        className={`wuthering-image-frame ${pulse > 0 ? 'is-resonating' : ''}`}
        onClick={() => {
          setPulse((count) => count + 1)
          setEffect('resonate')
        }}
        aria-label="Animate Wuthering Waves artwork"
      >
        <span
          key={`${imageIndex}-${pulse}`}
          className={`wuthering-image-motion ${effect === 'slide' ? 'is-sliding' : pulse > 0 ? 'is-resonating' : ''}`}
          style={{
            backgroundImage: previousImage ? `url("${previousImage}")` : undefined,
          }}
        >
          <img src={wutheringImages[imageIndex]} alt="" loading="lazy" />
        </span>
        <span className="wuthering-interaction-label">
          {pulse ? 'RESONATE AGAIN' : 'CLICK TO RESONATE'} <span aria-hidden="true">✳</span>
        </span>
      </button>
      {wutheringImages.length > 1 && (
        <button
          type="button"
          className="wuthering-next"
          onClick={nextImage}
          aria-label="Next Wuthering Waves image"
        >
          <span aria-hidden="true">→</span>
        </button>
      )}
      <div className="wuthering-art-caption">
        FREQUENCY <br />
        ENTER THE NEXT WAVE
      </div>
    </div>
  )
}

function GameSlide({ game }) {
  return (
    <div className="wuthering-intro">
      <div className="wuthering-copy">
        <span className="gaming-eyebrow">{game.eyebrow}</span>
        <h2>
          {game.titleTop}
          <br />
          <em>{game.titleEm}</em>
        </h2>
        <p>{game.description}</p>
        <div className="game-buttons">
          {game.buttons.map((button) =>
            button.url ? (
              <a
                key={button.label}
                className="gaming-outline-button"
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {button.label} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <button
                key={button.label}
                type="button"
                className="gaming-outline-button"
                disabled
                title="Coming soon"
              >
                {button.label} <span aria-hidden="true">↗</span>
              </button>
            ),
          )}
        </div>
      </div>
      {game.placeholder ? (
        <div className="wuthering-art game-placeholder-art">
          <div className="game-placeholder-frame" aria-hidden="true">
            <span>GAME</span>
            <b>02</b>
            <span>TO BE ANNOUNCED</span>
          </div>
        </div>
      ) : (
        <WutheringArtwork />
      )}
    </div>
  )
}

function slideWidth(track) {
  return track.children[0].offsetWidth
}

function GameCarousel({ games, renderSlide, label = 'Games', showRings = true }) {
  const trackRef = useRef(null)
  const tabsRef = useRef(null)
  const scrollTarget = useRef(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const tabs = tabsRef.current
    const tab = tabs.children[active]
    if (tab) tabs.scrollTo({ left: tab.offsetLeft - 8, behavior: 'smooth' })
  }, [active])

  function goTo(index) {
    const track = trackRef.current
    const target = (index + games.length) % games.length
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // While the button-triggered scroll animates, ignore scroll-derived updates so the active slide doesn't flip back and forth.
    scrollTarget.current =
      Math.abs(track.scrollLeft - target * slideWidth(track)) < 2
        ? null
        : target * slideWidth(track)
    if (scrollTarget.current !== null) {
      window.setTimeout(() => (scrollTarget.current = null), 1200)
    }
    track.scrollTo({ left: target * slideWidth(track), behavior: reduceMotion ? 'auto' : 'smooth' })
    setActive(target)
  }

  useEffect(() => {
    const track = trackRef.current
    let frame
    let release
    function onScroll() {
      if (scrollTarget.current !== null) {
        window.clearTimeout(release)
        if (Math.abs(track.scrollLeft - scrollTarget.current) < 2) {
          scrollTarget.current = null
        } else {
          release = window.setTimeout(() => (scrollTarget.current = null), 200)
        }
        return
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setActive(Math.round(track.scrollLeft / slideWidth(track)))
      })
    }
    function onResize() {
      track.scrollTo({ left: active * slideWidth(track), behavior: 'auto' })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(release)
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [active])

  return (
    <div className="game-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="game-carousel-bar">
        <div className="game-tabs" ref={tabsRef}>
          {games.map((game, index) => (
            <button
              key={game.id}
              type="button"
              className={index === active ? 'active' : ''}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goTo(index)}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span> {game.name}
            </button>
          ))}
        </div>
        {games.length > 1 && (
          <div className="game-arrows">
            <button type="button" onClick={() => goTo(active - 1)} aria-label="Previous game">
              ←
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label="Next game">
              →
            </button>
          </div>
        )}
      </div>
      <div className="game-stage">
        {showRings && <div className="game-rings" aria-hidden="true" />}
        <div className="game-track" ref={trackRef}>
          {games.map((game, index) => (
            <div
              key={game.id}
              className={`game-slide ${index === active ? 'is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${games.length}: ${game.name}`}
              inert={index !== active}
            >
              {renderSlide(game, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Gaming() {
  const [loading, setLoading] = useState(true)
  const [colorMode, toggleColorMode] = useColorMode()
  const [videos, setVideos] = useState(null)
  const [error, setError] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const usingFallback = Boolean(error) && !videos
  const shownVideos = videos || (error ? site.fallbackVideos : null)
  const featured =
    shownVideos && (featuredIndex === 0 ? shownVideos.recent[0] : shownVideos.mostViewed)
  const featuredLabel = featuredIndex === 0 ? 'Latest upload' : 'Most viewed'

  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const response = await fetch('/api/videos')
        const result = response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : null
        if (!response.ok)
          throw new Error(result?.error || `Video service returned HTTP ${response.status}`)
        if (!result?.recent?.length || !result.mostViewed)
          throw new Error('Video service returned incomplete data')
        if (active) {
          setVideos(result)
          setError('')
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error ? failure.message : 'Could not load videos from YouTube',
          )
      }
    }

    refresh()
    const interval = window.setInterval(refresh, 15 * 60 * 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <div className={`site gaming-site ${colorMode === 'light' ? 'theme-light' : ''}`}>
      {loading && (
        <Loader
          images={[...wutheringImages, silverPalaceImage, anantaImage]}
          title={`Iam${site.identity.creatorName}`}
          slogan="THE NEXT ADVENTURE IS ONE CLICK AWAY"
          onDone={() => setLoading(false)}
        />
      )}
      <Sidebar
        items={gamingNavigation}
        brandHref="#home"
        bottomHref="/portfolio#home"
        bottomText="BACK TO PORTFOLIO"
        bottomIcon="←"
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
      />
      <main id="main">
        <section className="gaming-hero section" id="home">
          <div className="gaming-atmosphere" aria-hidden="true">
            <div className="gaming-halo" />
            <span className="gaming-atmosphere-mark">{site.identity.creatorName}</span>
          </div>
          <div className="gaming-topline">
            <span className="gaming-topline-channel">
              <span className="status-dot" />
              <a
                className="gaming-topline-name"
                href="/intro"
                target="_blank"
                rel="noopener noreferrer"
                title="Play channel intro (opens in a new tab)"
                aria-label="Play IamUV channel intro (opens in a new tab)"
              >
                Iam{site.identity.creatorName}
              </a>
              <span className="gaming-topline-channel-suffix">/ GAMING CHANNEL</span>
            </span>
            <div className="gaming-topline-right">
              <span className="gaming-topline-message">
                WELCOME TO THE FLIP SIDE <b> / </b> {new Date().getFullYear()}
              </span>
              <nav className="gaming-socials" aria-label="Gaming social links">
                {headerPlatforms
                  .filter((platform) => platform.url)
                  .map((platform) => (
                    <a
                      key={platform.name}
                      className={platform.className}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${platform.name} (opens in a new tab)`}
                    >
                      <img src={platform.icon} alt="" />
                    </a>
                  ))}
              </nav>
            </div>
          </div>
          <div className="gaming-hero-layout">
            <div className="gaming-hero-copy">
              <span className="gaming-eyebrow">THE CHANNEL</span>
              <h1>
                PRESS
                <br />
                <span>PLAY.</span>
                <br />
                STAY AWHILE.
              </h1>
              <p>
                <strong>
                  Iam{site.identity.creatorName} — {site.gaming.introHighlight}
                </strong>{' '}
                {site.gaming.intro}
              </p>
              <div className="gaming-hero-actions">
                <a className="gaming-primary" href="#playing">
                  EXPLORE THE CHANNEL <span aria-hidden="true">↓</span>
                </a>
                <a
                  className="gaming-subtle-link"
                  href={site.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WATCH ON YOUTUBE ↗
                </a>
              </div>
            </div>
            <div className="gaming-featured">
              <div className="gaming-featured-top">
                <span className="gaming-live-dot" /> {featuredLabel.toUpperCase()}
              </div>
              {featured ? (
                <>
                  {error && (
                    <div className="gaming-featured-warning" role="alert">
                      {usingFallback
                        ? 'Live videos are unavailable right now. Showing saved videos.'
                        : 'Live update failed. Showing the last loaded video.'}
                    </div>
                  )}
                  <VideoPlayer
                    key={`${featuredIndex}-${featured.id}`}
                    video={featured}
                    label={featuredLabel}
                  />
                  <div className="gaming-featured-info">
                    <span>
                      {featuredIndex === 0
                        ? 'FRESH FROM THE CHANNEL'
                        : featured.viewCount
                          ? `${new Intl.NumberFormat('en-US').format(featured.viewCount)} VIEWS / CHANNEL FAVORITE`
                          : 'CHANNEL FAVORITE'}
                    </span>
                    <h2>{featured.title}</h2>
                    <div className="gaming-featured-actions">
                      <a
                        href={`https://www.youtube.com/watch?v=${featured.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        OPEN VIDEO ON YOUTUBE ↗
                      </a>
                      <div
                        className="gaming-featured-switcher"
                        role="group"
                        aria-label="Featured video navigation"
                      >
                        <button
                          type="button"
                          aria-pressed={featuredIndex === 0}
                          onClick={() => setFeaturedIndex(0)}
                        >
                          <span aria-hidden="true">←</span> LATEST UPLOAD
                        </button>
                        <button
                          type="button"
                          aria-pressed={featuredIndex === 1}
                          onClick={() => setFeaturedIndex(1)}
                        >
                          MOST VIEWED <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="gaming-featured-empty" role={error ? 'alert' : 'status'}>
                  <p>
                    {error ? `Live videos unavailable: ${error}` : 'Loading videos from YouTube...'}
                  </p>
                  <a href={site.links.youtube} target="_blank" rel="noopener noreferrer">
                    OPEN THE CHANNEL ↗
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="gaming-hero-foot">
            <span>GAMING / GAMEPLAY / CURIOSITY</span>
            <a href="#playing">
              SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="gaming-wuthering section" id="playing">
          <div className="gaming-section-top">
            <span className="gaming-square" /> CURRENTLY PLAYING{' '}
            <span>THE WORLD I'M IN RIGHT NOW</span>
          </div>
          <GameCarousel
            games={site.gaming.games}
            renderSlide={(game) => <GameSlide game={game} />}
          />
          <div className="gaming-video-list-head">
            <span>RECENT TRANSMISSIONS</span>
            <span>FROM THE CHANNEL</span>
          </div>
          {error && videos && (
            <p className="gaming-refresh-error">
              Live refresh failed: {error}. Showing the last loaded videos.
            </p>
          )}
          {shownVideos ? (
            <RecentVideos videos={shownVideos.recent} />
          ) : (
            <div className="gaming-videos-empty" role="status">
              Loading latest uploads from YouTube...
            </div>
          )}
        </section>

        <section className="gaming-other section" id="other-games">
          <div className="gaming-section-top">
            <span className="gaming-square" /> OTHER GAMES <span>MORE WORLDS I'VE PLAYED</span>
          </div>
          <GameCarousel
            games={site.gaming.otherGames}
            renderSlide={(game) => <OtherGameSlide game={game} />}
            label="Other games"
            showRings={false}
          />
        </section>

        <section className="gaming-follow section" id="socials">
          <div className="gaming-section-top">
            <span className="gaming-square" /> STAY CONNECTED{' '}
            <span>THE CONVERSATION CONTINUES</span>
          </div>
          <div className="follow-intro">
            <div>
              <span className="gaming-eyebrow">BEYOND THE GAME / FIND ME HERE</span>
              <h2>
                FOLLOW
                <br />
                <em>NOW.</em>
              </h2>
            </div>
            <p>{site.gaming.follow}</p>
          </div>
          <div className="follow-grid">
            {followPlatforms.map((platform) => (
              <FollowCard key={platform.name} platform={platform} />
            ))}
          </div>
          <div className="follow-foot">
            <span>YOUR NEXT QUEST STARTS HERE</span>
            <span>✳</span>
          </div>
        </section>

        <section className="gaming-upcoming section" id="upcoming">
          <div className="gaming-section-top">
            <span className="gaming-square" /> ON THE HORIZON <span>WHAT'S NEXT</span>
          </div>
          <div className="upcoming-heading">
            <span className="gaming-eyebrow">NEXT CHAPTERS / STAY TUNED</span>
            <h2>
              NEW WORLDS.
              <br />
              <em>COMING SOON.</em>
            </h2>
            <p>{site.gaming.upcoming}</p>
          </div>
          <div className="upcoming-grid">
            <article className="upcoming-card palace">
              <img
                className="upcoming-image"
                src={silverPalaceImage}
                alt="Silver Palace character seated against a dark background"
                loading="lazy"
              />
              <span className="upcoming-label">ON THE RADAR</span>
              <div className="upcoming-card-bottom">
                <div>
                  <span className="upcoming-status">CONTENT COMING SOON</span>
                  <h3>SILVER PALACE</h3>
                </div>
                <span className="upcoming-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </article>
            <article className="upcoming-card ananta">
              <img
                className="upcoming-image"
                src={anantaImage}
                alt="Ananta characters in motion above a city"
                loading="lazy"
              />
              <span className="upcoming-label">ON THE RADAR</span>
              <div className="upcoming-card-bottom">
                <div>
                  <span className="upcoming-status">CONTENT COMING SOON</span>
                  <h3>ANANTA</h3>
                </div>
                <span className="upcoming-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </article>
          </div>
          <p className="upcoming-note">NO SCHEDULE YET — JUST GAMES I'M EXCITED TO COVER.</p>
        </section>

        <section className="gaming-channel section" id="channel">
          <div className="gaming-section-top">
            <span className="gaming-square" /> KEEP WATCHING <span>SEE YOU IN GAME</span>
          </div>
          <div className="gaming-channel-content">
            <span className="gaming-eyebrow">
              Iam{site.identity.creatorName} / {site.identity.channelHandle.toUpperCase()}
            </span>
            <h2>
              THE NEXT
              <br />
              <em>ADVENTURE</em>
              <br />
              IS ONE CLICK AWAY.
            </h2>
            <p>{site.gaming.channel}</p>
            <a
              className="gaming-primary"
              href={site.links.youtube}
              target="_blank"
              rel="noopener noreferrer"
            >
              VISIT MY YOUTUBE CHANNEL <span aria-hidden="true">↗</span>
            </a>
            {site.links.businessEmail && (
              <p className="gaming-business">
                <span>FOR COLLABORATIONS AND SPONSORS CONTACT</span>
                <a href={`mailto:${site.links.businessEmail}`}>{site.links.businessEmail}</a>
              </p>
            )}
          </div>
          <HoloGlobe
            label="Rotating holographic Earth. Click to open my YouTube channel."
            onActivate={() => {
              const win = window.open(site.links.youtube, '_blank')
              if (win) win.opener = null
              else window.location.assign(site.links.youtube)
            }}
          />
          <span className="gaming-globe-hint-mobile" aria-hidden="true">
            TAP THE GLOBE TO LAUNCH
          </span>
          <footer className="gaming-footer">
            <span>
              © {new Date().getFullYear()} {site.identity.name.toUpperCase()} /{' '}
              {site.identity.channelName.toUpperCase()}
            </span>
            <a href="#home">BACK TO TOP ↑</a>
          </footer>
        </section>
      </main>
    </div>
  )
}
