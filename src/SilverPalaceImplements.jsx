import React, { useMemo, useState } from 'react'
import { Collapsible, Panel, RouteLink, useRemote } from './archive-kit.jsx'
import { ARCHIVE, Art, LevelSlider } from './sp-parts.jsx'

const API = '/api/sp-implements'
export const emptyImplementFilters = { search: '' }

const lines = (value) => (value ?? '').split('\n').filter(Boolean)

export function ImplementsPage({ navigate, filters, setFilters }) {
  const { data: items, error, loading } = useRemote(API)
  const { search } = filters

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (items ?? []).filter(
      (item) =>
        !needle || [item.name, item.description].some((v) => v?.toLowerCase().includes(needle)),
    )
  }, [items, search])

  return (
    <section className="wuwa-section" aria-labelledby="sp-implements-title">
      <header className="wuwa-heading">
        <h1 id="sp-implements-title">
          <i aria-hidden="true" /> All Silver Palace implements
        </h1>
        {items && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'implement' : 'implements'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search implements</span>
          <input
            type="search"
            value={search}
            placeholder="Search implements or set effects..."
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="wuwa-reset"
          disabled={!search}
          onClick={() => setFilters(emptyImplementFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading implements...</Panel>}
      {error && <Panel>{error}</Panel>}
      {items && shown.length === 0 && <Panel>No implements match this search.</Panel>}

      <ul className="sp-motive-grid">
        {shown.map((item) => (
          <li key={item.slug}>
            <RouteLink
              className={`sp-motive-card rarity-${item.rarity}`}
              to={`${ARCHIVE}/implements/${item.slug}`}
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

export function ImplementPage({ slug, navigate }) {
  const { data: item, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)
  const [levelIndex, setLevelIndex] = useState(0)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/implements`} navigate={navigate}>
      {'\u2190'} All implements
    </RouteLink>
  )
  if (loading || error || !item) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{loading ? 'Loading implement...' : error || 'Implement not found.'}</Panel>
      </section>
    )
  }

  const levels = [
    ...new Set(
      item.pieces.flatMap((piece) => piece.stats.flatMap((s) => s.values.map((v) => v.level))),
    ),
  ].sort((a, b) => a - b)
  const level = levels[Math.min(levelIndex, levels.length - 1)]

  return (
    <section className="wuwa-section" aria-labelledby="sp-implement-title">
      {back}
      <div className="sp-motive-profile">
        <div className={`sp-motive-portrait rarity-${item.rarity}`}>
          <Art src={item.image_url} name={item.name} />
        </div>
        <div className="sp-profile-copy">
          <p className="wuwa-eyebrow">Silver Palace {'\u00B7'} Implement</p>
          <h1 id="sp-implement-title">{item.name}</h1>
          <p className="sp-stars" aria-label={`${item.rarity}-star`}>
            {'\u2605'.repeat(item.rarity)}
          </p>
          <dl className="wuwa-meta">
            <div>
              <dt>Type</dt>
              <dd>{item.type}</dd>
            </div>
            <div>
              <dt>Pieces</dt>
              <dd>{item.pieces.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="sp-tabpanel sp-motive-panels">
        {item.description && (
          <Collapsible chip="EFFECT" title="Set effect">
            <div className="wuwa-skill-body">
              {lines(item.description).map((line, position) => (
                <p key={position}>{line}</p>
              ))}
            </div>
          </Collapsible>
        )}
        {levels.length > 0 && (
          <Collapsible chip="STATS" title="Pieces and stats">
            <div className="sp-panel-body">
              <LevelSlider
                label="Implement level"
                levels={levels}
                index={levelIndex}
                onChange={setLevelIndex}
              />
              <div className="sp-pieces">
                {item.pieces.map((piece) => (
                  <article key={piece.position} className="sp-piece">
                    <header>
                      <span className="sp-piece-art">
                        <Art src={piece.image_url} name={piece.name} />
                      </span>
                      <h3>{piece.name}</h3>
                    </header>
                    <dl className="sp-values">
                      {piece.stats.map((stat) => (
                        <div key={stat.label}>
                          <dt>{stat.label}</dt>
                          <dd>{stat.values.find((v) => v.level === level)?.value ?? '\u2014'}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </Collapsible>
        )}
        {item.lore && (
          <Collapsible chip="LORE" title="Story">
            <div className="wuwa-skill-body">
              {lines(item.lore).map((line, position) => (
                <p key={position}>{line}</p>
              ))}
            </div>
          </Collapsible>
        )}
      </div>
    </section>
  )
}
