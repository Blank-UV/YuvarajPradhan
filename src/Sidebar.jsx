import React, { useEffect, useState } from 'react'
import { siteProperties as site } from './site-properties.js'

export const portfolioNavigation = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'about', label: 'About', icon: '◎' },
  { id: 'work', label: 'What I do', icon: '▦' },
  { id: 'experience', label: 'Experience', icon: '⌘' },
  { id: 'contact', label: 'Contact', icon: '↗' },
]

export const gamingNavigation = [
  { id: 'home', label: 'The channel', icon: '⌂' },
  { id: 'playing', label: 'Currently playing', icon: '◎' },
  { id: 'socials', label: 'Follow now', icon: '✳' },
  { id: 'upcoming', label: 'Coming soon', icon: '▦' },
  { id: 'channel', label: 'Watch & connect', icon: '↗' },
]

export default function Sidebar({
  items,
  brandHref,
  bottomHref,
  bottomText,
  bottomIcon,
  colorMode,
  onToggleColorMode,
}) {
  const [active, setActive] = useState(items[0].id)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const ratios = new Map()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0),
        )
        const current = [...ratios].sort((a, b) => b[1] - a[1])[0]
        if (current?.[1] > 0) setActive(current[0])
      },
      { rootMargin: '-15% 0px -35% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75] },
    )
    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span />
        <span />
      </button>
      {open && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <a
          href={brandHref}
          className="brand"
          aria-label={`${site.identity.name}, home`}
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark">
            {site.identity.initials}
            <i />
          </span>
          <span className="brand-name">
            {site.identity.name.split(' ')[0]}
            <br />
            {site.identity.name.split(' ').slice(1).join(' ')}
          </span>
        </a>
        <nav className="side-nav" aria-label="Main navigation">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              className={`nav-link ${active === item.id ? 'nav-active' : ''}`}
              aria-current={active === item.id ? 'location' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleColorMode}
          aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={colorMode === 'light'}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {colorMode === 'dark' ? '☼' : '☾'}
          </span>
          <span className="theme-toggle-label">
            {colorMode === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
          </span>
        </button>
        <a className="sidebar-bottom-link" href={bottomHref}>
          <span className="sidebar-bottom-icon" aria-hidden="true">
            {bottomIcon}
          </span>
          <span className="sidebar-bottom-label">{bottomText}</span>
          <span className="sidebar-bottom-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      </aside>
    </>
  )
}
