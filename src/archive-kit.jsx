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

export function RouteLink({ to, navigate, children, ...props }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        if (!plainClick(event)) return
        event.preventDefault()
        navigate(to)
      }}
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

export function useRemote(url) {
  const [state, setState] = useState({ url: null, data: null, error: '' })

  useEffect(() => {
    if (!url) return undefined
    let active = true
    getJson(url)
      .then((data) => active && setState({ url, data, error: '' }))
      .catch(
        (error) =>
          active &&
          setState({
            url,
            data: null,
            error: error instanceof Error ? error.message : 'Could not load data',
          }),
      )
    return () => {
      active = false
    }
  }, [url])

  const ready = state.url === url
  return {
    data: ready ? state.data : null,
    error: ready ? state.error : '',
    loading: !ready,
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
