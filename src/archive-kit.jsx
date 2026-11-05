// Helpers shared by the game archive apps (Wuthering Waves, Silver Palace): client-side routing,
// data loading, filter buttons, collapsible panels and the back-to-top button.
import React, { useCallback, useEffect, useState } from 'react'

export function useRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
    setPathname(window.location.pathname)
    if (!replace) window.scrollTo(0, 0)
  }, [])

  return [pathname, navigate]
}

export function plainClick(event) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

// Detail pages and the API that serves them, so a link can fetch its page before it is opened.
const DETAIL_ROUTES = [
  ['/wuthering-waves/archives/characters/', '/api/wuwa-characters'],
  ['/wuthering-waves/archives/weapons/', '/api/wuwa-weapons'],
  ['/wuthering-waves/archives/sonata-effects/', '/api/wuwa-sonata'],
  ['/wuthering-waves/archives/echoes/', '/api/wuwa-echoes'],
  ['/silver-palace/archives/characters/', '/api/sp-characters'],
  ['/silver-palace/archives/motives/', '/api/sp-motives'],
  ['/silver-palace/archives/epiphanies/', '/api/sp-epiphanies'],
  ['/silver-palace/archives/catalysts/', '/api/sp-catalysts'],
  ['/silver-palace/archives/implements/', '/api/sp-implements'],
]

function detailUrl(to) {
  for (const [prefix, api] of DETAIL_ROUTES) {
    if (typeof to === 'string' && to.startsWith(prefix)) {
      const slug = to.slice(prefix.length).split(/[/?#]/)[0]
      if (slug) return `${api}?slug=${encodeURIComponent(slug)}`
    }
  }
  return null
}

export function RouteLink({ to, navigate, children, ...props }) {
  const warm = () => {
    const url = detailUrl(to)
    if (url) preloadData(url)
  }
  return (
    <a
      href={to}
      onClick={(event) => {
        if (!plainClick(event)) return
        event.preventDefault()
        navigate(to)
      }}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      {...props}
    >
      {children}
    </a>
  )
}

async function getJson(url) {
  const response = await fetch(url)
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null
  if (!response.ok) throw new Error(body?.error || `Data service returned ${response.status}`)
  return body
}

// Responses are kept for the session (memory + sessionStorage) so revisiting a tab or page shows
// at once; the data is then refreshed in the background (stale-while-revalidate).
const memory = new Map()
const inflight = new Map()
const STORE = 'archive-cache:'

function cached(url) {
  if (memory.has(url)) return memory.get(url)
  try {
    const raw = window.sessionStorage.getItem(STORE + url)
    if (raw) {
      const data = JSON.parse(raw)
      memory.set(url, data)
      return data
    }
  } catch {
    // storage unavailable or full: memory cache only
  }
  return null
}

function remember(url, data) {
  memory.set(url, data)
  try {
    window.sessionStorage.setItem(STORE + url, JSON.stringify(data))
  } catch {
    // storage unavailable or full: memory cache only
  }
}

function load(url) {
  if (!inflight.has(url)) {
    const request = getJson(url)
      .then((data) => {
        remember(url, data)
        return data
      })
      .finally(() => inflight.delete(url))
    inflight.set(url, request)
  }
  return inflight.get(url)
}

// Resolves once the data is in the cache; a failure also resolves (the page shows its own error).
export function preloadData(url) {
  return cached(url)
    ? Promise.resolve()
    : load(url).then(
        () => {},
        () => {},
      )
}

// Once a list is loaded, quietly fetches each item's page (a few at a time) so opening any of
// them is instant.
export function usePrefetchDetails(listUrl, api) {
  useEffect(() => {
    let stop = false
    const timer = window.setTimeout(async () => {
      await preloadData(listUrl)
      const list = cached(listUrl)
      if (!Array.isArray(list)) return
      const slugs = list.map((item) => item.slug).filter(Boolean)
      for (let index = 0; index < slugs.length && !stop; index += 3) {
        await Promise.all(
          slugs
            .slice(index, index + 3)
            .map((slug) => preloadData(`${api}?slug=${encodeURIComponent(slug)}`)),
        )
      }
    }, 2500)
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [listUrl, api])
}

// Warms the cache for pages the visitor is likely to open next, once the browser is idle.
export function usePrefetch(urls) {
  const key = urls.join('|')
  useEffect(() => {
    const run = () => urls.forEach((url) => !cached(url) && load(url).catch(() => {}))
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(run, 1500)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export function useRemote(url) {
  const [state, setState] = useState(() => ({ url, data: url ? cached(url) : null, error: '' }))

  useEffect(() => {
    if (!url) return undefined
    let active = true
    const hit = cached(url)
    if (hit) setState({ url, data: hit, error: '' })
    load(url)
      .then((data) => active && setState({ url, data, error: '' }))
      .catch((error) => {
        if (!active || hit) return
        setState({
          url,
          data: null,
          error: error instanceof Error ? error.message : 'Could not load data',
        })
      })
    return () => {
      active = false
    }
  }, [url])

  const ready = state.url === url && (state.data !== null || state.error !== '')
  const fresh = state.url === url ? state.data : cached(url)
  return {
    data: ready ? state.data : fresh,
    error: ready ? state.error : '',
    loading: !ready && !fresh,
  }
}

export function Panel({ children }) {
  return <div className="wuwa-panel">{children}</div>
}

export function toggle(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function FilterGroup({ label, options, selected, onChange, render }) {
  return (
    <div className="wuwa-filter-group" role="group" aria-label={label}>
      <button
        type="button"
        className={selected.length === 0 ? 'on' : ''}
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
        title={`All ${label.toLowerCase()}`}
      >
        All
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={selected.includes(option) ? 'on' : ''}
          aria-pressed={selected.includes(option)}
          onClick={() => onChange(toggle(selected, option))}
          title={String(option)}
        >
          {render(option)}
        </button>
      ))}
    </div>
  )
}

// The filter controls and Reset: always visible on desktop, behind a Filter button on phones.
export function FilterPanel({ active = 0, dirty, onReset, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="wuwa-reset wuwa-filter-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Filter{active ? ` (${active})` : ''} {open ? '\u25B2' : '\u25BC'}
      </button>
      <div className={`wuwa-filter-panel${open ? ' is-open' : ''}`}>
        {children}
        <button type="button" className="wuwa-reset" disabled={!dirty} onClick={onReset}>
          {'\u00D7'} Reset
        </button>
      </div>
    </>
  )
}

export function Collapsible({ chip, title, icon, aside, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <article className={`wuwa-skill${open ? '' : ' collapsed'}`}>
      <header>
        <span className="wuwa-chip">{chip}</span>
        {icon}
        <h3>{title}</h3>
        {aside}
        <button
          type="button"
          className="wuwa-toggle"
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '\u2212' : '+'}
        </button>
      </header>
      {open && children}
    </article>
  )
}

export function ToTopButton() {
  const [away, setAway] = useState(false)

  useEffect(() => {
    const update = () => setAway(window.scrollY > 80)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!away) return null
  return (
    <button
      type="button"
      className="wuwa-to-top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      {'\u2191'}
    </button>
  )
}
