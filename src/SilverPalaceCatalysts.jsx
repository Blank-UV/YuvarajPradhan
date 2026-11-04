import React, { useMemo } from 'react'
import { Collapsible, Panel, RouteLink, useRemote } from './archive-kit.jsx'
import { ARCHIVE, Art } from './sp-parts.jsx'

const API = '/api/sp-catalysts'
export const emptyCatalystFilters = { search: '' }

const lines = (value) => (value ?? '').split('\n').filter(Boolean)

export function CatalystsPage({ navigate, filters, setFilters }) {
  const { data: items, error, loading } = useRemote(API)
  const { search } = filters

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (items ?? []).filter(
      (item) =>
        !needle ||
        [item.name, item.description, ...item.obtain].some((value) =>
          value?.toLowerCase().includes(needle),
        ),
    )
  }, [items, search])

  return (
    <section className="wuwa-section" aria-labelledby="sp-catalysts-title">
      <header className="wuwa-heading">
        <h1 id="sp-catalysts-title">
          <i aria-hidden="true" /> All Silver Palace catalysts
        </h1>
        {items && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'catalyst' : 'catalysts'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search catalysts</span>
          <input
            type="search"
            value={search}
            placeholder="Search catalysts, effects or where to get them..."
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="wuwa-reset"
          disabled={!search}
          onClick={() => setFilters(emptyCatalystFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading catalysts...</Panel>}
      {error && <Panel>{error}</Panel>}
      {items && shown.length === 0 && <Panel>No catalysts match this search.</Panel>}

      <ul className="sp-motive-grid">
        {shown.map((item) => (
          <li key={item.slug}>
            <RouteLink
              className={`sp-motive-card rarity-${item.rarity}`}
              to={`${ARCHIVE}/catalysts/${item.slug}`}
              navigate={navigate}
              aria-label={`${item.name}, ${item.rarity} star`}
            >
              <span className="sp-motive-art">
                <Art src={item.image_url} name={item.name} />
              </span>
              <span className="sp-motive-name">{item.name}</span>
              <span className="sp-motive-meta">
                <span className="sp-motive-stars">{'\u2605'.repeat(item.rarity)}</span>
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CatalystPage({ slug, navigate }) {
  const { data: item, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/catalysts`} navigate={navigate}>
      {'\u2190'} All catalysts
    </RouteLink>
  )
  if (loading || error || !item) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{loading ? 'Loading catalyst...' : error || 'Catalyst not found.'}</Panel>
      </section>
    )
  }

  return (
    <section className="wuwa-section" aria-labelledby="sp-catalyst-title">
      {back}
      <div className="sp-motive-profile">
        <div className={`sp-motive-portrait rarity-${item.rarity}`}>
          <Art src={item.image_url} name={item.name} />
        </div>
        <div className="sp-profile-copy">
          <p className="wuwa-eyebrow">Silver Palace {'\u00B7'} Catalyst</p>
          <h1 id="sp-catalyst-title">{item.name}</h1>
          <p className="sp-stars" aria-label={`${item.rarity}-star`}>
            {'\u2605'.repeat(item.rarity)}
          </p>
          <dl className="wuwa-meta">
            {item.type && (
              <div>
                <dt>Type</dt>
                <dd>{item.type}</dd>
              </div>
            )}
            {item.max_stack != null && (
              <div>
                <dt>Max stack</dt>
                <dd>{item.max_stack}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="sp-tabpanel sp-motive-panels">
        {item.description && (
          <Collapsible chip="EFFECT" title="Effect">
            <div className="wuwa-skill-body">
              {lines(item.description).map((line, position) => (
                <p key={position}>{line}</p>
              ))}
            </div>
          </Collapsible>
        )}
        {item.obtain.length > 0 && (
          <Collapsible chip="SOURCE" title="Where to get">
            <div className="sp-panel-body">
              <ul className="sp-gifts">
                {item.obtain.map((name) => (
                  <li key={name}>
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Collapsible>
        )}
      </div>
    </section>
  )
}
