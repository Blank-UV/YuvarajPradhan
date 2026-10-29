import React, { useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import Sidebar, { portfolioNavigation } from './Sidebar.jsx'
import useColorMode from './useColorMode.js'

const { focusAreas, slides } = site.portfolio

function ArrowIcon({ diagonal = false }) {
  return (
    <span aria-hidden="true" className="arrow-icon">
      {diagonal ? '↗' : '→'}
    </span>
  )
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="section-heading">
      <div className="section-heading-top">
        <span className="accent-square" /> <span>{eyebrow}</span>
      </div>
      <div className="section-heading-body">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  )
}

function Hero({ slide, slideIndex, setSlideIndex }) {
  const changeSlide = (direction) =>
    setSlideIndex((current) => (current + direction + slides.length) % slides.length)

  return (
    <section className="hero section" id="home" aria-label="Introduction">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-topline">
        <span>
          <span className="status-dot" /> BUILDING FOR WHAT'S NEXT
        </span>
        <span className="topline-right">
          PORTFOLIO <span className="topline-slash">/</span> {new Date().getFullYear()}
        </span>
      </div>
      <div className="hero-inner" key={slide.id}>
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="tiny-cross">✳</span> {slide.kicker}
          </div>
          <h1>
            {slide.headline[0]}
            <br />
            <span className="hero-outline">{slide.headline[1]}</span>
            <br />
            {slide.headline[2]}
          </h1>
          <div className="hero-copy-bottom">
            <p>{slide.description}</p>
            <a href="#work" className="primary-button">
              EXPLORE MY WORK <ArrowIcon diagonal />
            </a>
            <a href="/gaming" className="mobile-cross-page-link">
              GAMING UI <ArrowIcon diagonal />
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-coordinate art-coordinate-top">THE MAKING OF THINGS</div>
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="art-diagonal" />
          <div className="art-shape shape-back" />
          <div className="art-shape shape-main">
            <div className="shape-inner">
              <span className="shape-plus">+</span>
              <span className="shape-symbol">
                {slideIndex === 0 ? 'J' : slideIndex === 1 ? 'S' : 'C'}
              </span>
              <span className="shape-slash">/</span>
            </div>
          </div>
          <div className="art-label">
            <span>
              {site.identity.initials[0]}
              <span className="art-label-muted">{site.identity.initials.slice(1)}</span>_
            </span>
            <small>
              {slide.visualLabel}
              <br />
              {slide.visualCode}
            </small>
          </div>
          <div className="art-coordinate art-coordinate-bottom">IDEAS → SYSTEMS → IMPACT</div>
        </div>
      </div>
      <div className="hero-bottom">
        <div className="hero-progress">
          <div className="progress-track">
            <span style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }} />
          </div>
        </div>
        <div className="slide-dots" role="group" aria-label="Choose a color and introduction">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`slide-dot dot-${item.theme} ${slideIndex === index ? 'selected' : ''}`}
              onClick={() => setSlideIndex(index)}
              aria-label={`Show slide ${index + 1}: ${item.visualLabel}`}
              aria-pressed={slideIndex === index}
            >
              <span />
            </button>
          ))}
          <span className="palette-label">SELECT SIGNAL</span>
        </div>
        <div className="slide-arrows">
          <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous slide">
            ←
          </button>
          <button type="button" onClick={() => changeSlide(1)} aria-label="Next slide">
            →
          </button>
        </div>
      </div>
      <a className="scroll-cue" href="#about">
        <span>SCROLL TO DISCOVER</span>
        <span>↓</span>
      </a>
    </section>
  )
}

function App() {
  const [slideIndex, setSlideIndex] = useState(0)
  const [colorMode, toggleColorMode] = useColorMode()
  const slide = slides[slideIndex]

  return (
    <div className={`site theme-${slide.theme} ${colorMode === 'light' ? 'theme-light' : ''}`}>
      <Sidebar
        items={portfolioNavigation}
        brandHref="#home"
        bottomHref="/gaming"
        bottomText="GAMING / YOUTUBE"
        bottomIcon="▷"
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
      />
      <main id="main">
        <Hero slide={slide} slideIndex={slideIndex} setSlideIndex={setSlideIndex} />
        <section className="about section section-pad" id="about">
          <SectionHeading
            eyebrow="THE PERSON BEHIND THE CODE"
            title={
              <>
                Hello, I'm <em>{site.identity.name.split(' ')[0]}.</em>
              </>
            }
            subtitle="Developer by practice. Curious by default."
          />
          <div className="about-layout">
            <div className="about-statement">
              <span className="statement-quote">“</span>I like turning <span>complicated</span>{' '}
              ideas into things that feel <span>simple.</span>
            </div>
            <div className="about-details">
              <span className="mini-label">A LITTLE ABOUT ME /</span>
              {site.portfolio.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <a href="#experience" className="text-link">
                MORE ABOUT MY APPROACH <ArrowIcon diagonal />
              </a>
            </div>
          </div>
          <div className="about-strip">
            <span>THINK DEEPLY.</span>
            <span>BUILD CLEARLY.</span>
            <span>KEEP EXPLORING.</span>
            <span className="strip-star">✳</span>
          </div>
        </section>
        <section className="work section section-pad" id="work">
          <SectionHeading
            eyebrow="AREAS OF FOCUS"
            title={
              <>
                The work I <em>gravitate to.</em>
              </>
            }
            subtitle="A snapshot of what I do and what keeps me interested."
          />
          <div className="focus-grid">
            {focusAreas.map((area) => (
              <article className={`focus-card ${area.className}`} key={area.className}>
                <div className="focus-top">
                  <span>FOCUS AREA</span>
                  <span className="focus-arrow">↗</span>
                </div>
                <div className="focus-graphic" aria-hidden="true">
                  <span>{area.glyph}</span>
                </div>
                <div className="focus-info">
                  <h3>{area.title}</h3>
                  <p>{area.detail}</p>
                  <div className="tag-row">
                    {area.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="work-note">
            <span>✳</span> Specific projects and case studies can be added here as the portfolio
            grows.
          </p>
        </section>
        <section className="experience section section-pad" id="experience">
          <SectionHeading
            eyebrow="EXPERIENCE & APPROACH"
            title={
              <>
                Built to <em>hold up.</em>
              </>
            }
            subtitle="The principles I bring to software development."
          />
          <div className="experience-layout">
            <div className="experience-lead">
              <div className="exp-orbit" aria-hidden="true">
                <div className="exp-orbit-inner">
                  {site.identity.initials}
                  <span>✳</span>
                </div>
              </div>
              <p>
                Good software isn't just about what it does today. It's about making the next change
                easier, too.
              </p>
            </div>
            <div className="experience-list">
              <div className="experience-item">
                <div>
                  <h3>Understand the problem</h3>
                  <p>Get clear on the context, constraints, and people the software is for.</p>
                </div>
                <span className="experience-mark">↗</span>
              </div>
              <div className="experience-item">
                <div>
                  <h3>Design for the long term</h3>
                  <p>
                    Favor readable structure, maintainable decisions, and dependable foundations.
                  </p>
                </div>
                <span className="experience-mark">↗</span>
              </div>
              <div className="experience-item">
                <div>
                  <h3>Keep learning in public</h3>
                  <p>Stay curious, experiment often, and share useful ideas along the way.</p>
                </div>
                <span className="experience-mark">↗</span>
              </div>
              <div className="experience-footnote">
                CAREER HISTORY / Add verified roles, companies, and dates here when ready.
              </div>
            </div>
          </div>
        </section>
        <section className="contact section section-pad" id="contact">
          <div className="contact-top">
            <span className="accent-square" /> NEXT CONNECTION
          </div>
          <h2>
            LET'S MAKE
            <br />
            <span>SOMETHING</span>
            <br />
            MATTER.
          </h2>
          <div className="contact-bottom">
            <p>Have an idea, a project, or just want to connect? I'd love to hear from you.</p>
            {site.links.email ? (
              <a className="contact-button" href={`mailto:${site.links.email}`}>
                GET IN TOUCH <ArrowIcon diagonal />
              </a>
            ) : (
              <span className="contact-button contact-button-pending">
                CONTACT DETAILS COMING SOON <ArrowIcon diagonal />
              </span>
            )}
          </div>
          <footer className="footer">
            <span>
              © {new Date().getFullYear()} {site.identity.name.toUpperCase()}
            </span>
            <div>
              {site.links.github && (
                <a href={site.links.github} target="_blank" rel="noopener noreferrer">
                  GITHUB ↗
                </a>
              )}
              {site.links.linkedin && (
                <a href={site.links.linkedin} target="_blank" rel="noopener noreferrer">
                  LINKEDIN ↗
                </a>
              )}
            </div>
            <a href="#home">BACK TO TOP ↑</a>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default App
