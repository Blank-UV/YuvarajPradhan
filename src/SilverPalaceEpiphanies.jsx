import React, { useMemo } from 'react'
import { Collapsible, FilterGroup, Panel, RouteLink, useRemote } from './archive-kit.jsx'
import { ARCHIVE, Art } from './sp-parts.jsx'

const API = '/api/sp-epiphanies'
export const emptyEpiphanyFilters = { search: '', stats: [], levels: [] }

const sorted = (values) =>
  [...new Set(values.filter((value) => value != null))].sort((a, b) =>
    typeof a === 'number' ? a - b : String(a).localeCompare(b),
  )

export function EpiphaniesPage({ navigate, filters, setFilters }) {
  const { data: items, error, loading } = useRemote(API)
  const { search, stats, levels } = filters

  const statOptions = useMemo(
    () => sorted((items ?? []).map((item) => item.main_stat?.label)),
    [items],
  )
  const levelOptions = useMemo(() => sorted((items ?? []).map((item) => item.level)), [items])
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (items ?? []).filter(
      (item) =>
        (!needle ||
          [item.name, item.description].some((value) => value?.toLowerCase().includes(needle))) &&
        (!stats.length || stats.includes(item.main_stat?.label)) &&
        (!levels.length || levels.includes(item.level)),
    )
  }, [items, search, stats, levels])

  const dirty = search || stats.length || levels.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="sp-epiphanies-title">
      <header className="wuwa-heading">
        <h1 id="sp-epiphanies-title">
          <i aria-hidden="true" /> All Silver Palace epiphanies
        </h1>
        {items && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'epiphany' : 'epiphanies'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search epiphanies</span>
          <input
            type="search"
            value={search}
            placeholder="Search epiphanies or their effects..."
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <FilterGroup
          label="Main stat"
          options={statOptions}
          selected={stats}
          onChange={(value) => update({ stats: value })}
          render={(label) => label}
        />
        <FilterGroup
          label="Level"
          options={levelOptions}
          selected={levels}
          onChange={(value) => update({ levels: value })}
          render={(level) => `Lv. ${level}`}
        />
        <button
          type="button"
          className="wuwa-reset"
          disabled={!dirty}
          onClick={() => setFilters(emptyEpiphanyFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading epiphanies...</Panel>}
      {error && <Panel>{error}</Panel>}
      {items && shown.length === 0 && <Panel>No epiphanies match these filters.</Panel>}

      <ul className="sp-motive-grid">
        {shown.map((item) => (
          <li key={item.slug}>
            <RouteLink
              className={`sp-motive-card rarity-${item.rarity}`}
              to={`${ARCHIVE}/epiphanies/${item.slug}`}
              navigate={navigate}
              aria-label={`${item.name}, ${item.rarity} star${item.main_stat ? `, ${item.main_stat.label} ${item.main_stat.value}` : ''}`}
            >
              <span className="sp-motive-art">
                <Art src={item.image_url} name={item.name} />
              </span>
              <span className="sp-motive-name">{item.name}</span>
              <span className="sp-motive-meta">
                <span className="sp-motive-stars">{'\u2605'.repeat(item.rarity)}</span>
                {item.main_stat && <span>{item.main_stat.label}</span>}
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function EpiphanyPage({ slug, navigate }) {
  const { data: item, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/epiphanies`} navigate={navigate}>
      {'\u2190'} All epiphanies
    </RouteLink>
  )
  if (loading || error || !item) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{loading ? 'Loading epiphany...' : error || 'Epiphany not found.'}</Panel>
      </section>
    )
  }

  return (
    <section className="wuwa-section" aria-labelledby="sp-epiphany-title">
      {back}
      <div className="sp-motive-profile">
        <div className={`sp-motive-portrait rarity-${item.rarity}`}>
          <Art src={item.image_url} name={item.name} />
        </div>
        <div className="sp-profile-copy">
          <p className="wuwa-eyebrow">Silver Palace {'\u00B7'} Epiphany</p>
          <h1 id="sp-epiphany-title">{item.name}</h1>
          <p className="sp-stars" aria-label={`${item.rarity}-star`}>
            {'\u2605'.repeat(item.rarity)}
          </p>
          <dl className="wuwa-meta">
            {item.main_stat && (
              <div>
                <dt>Main stat</dt>
                <dd>
                  {item.main_stat.label} {item.main_stat.value}
                </dd>
              </div>
            )}
            {item.level != null && (
              <div>
                <dt>Level</dt>
                <dd>Lv. {item.level}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="sp-tabpanel sp-motive-panels">
        {item.description && (
          <Collapsible chip="EFFECT" title="Effect">
            <div className="wuwa-skill-body">
              <p>{item.description}</p>
            </div>
          </Collapsible>
        )}
        {(item.main_stat || item.substats.length > 0 || item.level != null) && (
          <Collapsible chip="STATS" title="Stats">
            <div className="sp-panel-body">
              <dl className="sp-values">
                {item.main_stat && (
                  <div>
                    <dt>Main stat</dt>
                    <dd>
                      {item.main_stat.label} {item.main_stat.value}
                    </dd>
                  </div>
                )}
                {item.substats.map((sub) => (
                  <div key={sub.position}>
                    <dt>Substat</dt>
                    <dd>
                      {sub.label} {sub.value}
                    </dd>
                  </div>
                ))}
                {item.level != null && (
                  <div>
                    <dt>Level</dt>
                    <dd>Lv. {item.level}</dd>
                  </div>
                )}
              </dl>
              <p className="sp-note">
                These values are for the epiphany at its listed level. Higher-level epiphanies roll
                larger numbers (for example the same DMG Bonus main stat is +15% at Lv. 20 and
                +19.5% at Lv. 70).
              </p>
            </div>
          </Collapsible>
        )}
        {item.addendums?.length > 0 && (
          <Collapsible chip="INK" title={'Possible addendums \u00B7 Any-character Ink'}>
            <div className="sp-panel-body">
              <dl className="sp-values">
                {item.addendums.map((row) => (
                  <div key={row.position}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="sp-note">
                Character-specific Ink instead rolls that character{'\u2019'}s skill levels (+1 to
                +3).
              </p>
            </div>
          </Collapsible>
        )}
        {item.lore && (
          <Collapsible chip="LORE" title="Story">
            <div className="wuwa-skill-body">
              {item.lore.split('\n').map((line, position) => (
                <p key={position}>{line}</p>
              ))}
            </div>
          </Collapsible>
        )}
      </div>
    </section>
  )
}
