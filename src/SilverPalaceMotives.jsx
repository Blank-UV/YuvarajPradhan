import React, { useMemo, useState } from 'react'
import { Collapsible, FilterGroup, Panel, RouteLink, useRemote } from './archive-kit.jsx'
import { ARCHIVE, Art, LevelSlider, TraitIcon, numberFormat } from './sp-parts.jsx'

const API = '/api/sp-motives'
const RARITIES = [5, 4, 3]
export const emptyMotiveFilters = { search: '', rarities: [], identities: [] }

export function MotivesPage({ navigate, filters, setFilters }) {
  const { data: motives, error, loading } = useRemote(API)
  const { search, rarities, identities } = filters

  const identityOptions = useMemo(
    () =>
      [...new Set((motives ?? []).map((motive) => motive.identity?.name).filter(Boolean))].sort(),
    [motives],
  )
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (motives ?? []).filter(
      (motive) =>
        (!needle ||
          [motive.name, motive.skill_name, motive.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(needle))) &&
        (!rarities.length || rarities.includes(motive.rarity)) &&
        (!identities.length || identities.includes(motive.identity?.name)),
    )
  }, [motives, search, rarities, identities])

  const dirty = search || rarities.length || identities.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="sp-motives-title">
      <header className="wuwa-heading">
        <h1 id="sp-motives-title">
          <i aria-hidden="true" /> All Silver Palace motives
        </h1>
        {motives && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'motive' : 'motives'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search motives</span>
          <input
            type="search"
            value={search}
            placeholder="Search motives or their effects..."
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <FilterGroup
          label="Rarity"
          options={RARITIES}
          selected={rarities}
          onChange={(value) => update({ rarities: value })}
          render={(rarity) => `${rarity}\u2605`}
        />
        <FilterGroup
          label="Identity"
          options={identityOptions}
          selected={identities}
          onChange={(value) => update({ identities: value })}
          render={(name) => name}
        />
        <button
          type="button"
          className="wuwa-reset"
          disabled={!dirty}
          onClick={() => setFilters(emptyMotiveFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading motives...</Panel>}
      {error && <Panel>{error}</Panel>}
      {motives && shown.length === 0 && <Panel>No motives match these filters.</Panel>}

      <ul className="sp-motive-grid">
        {shown.map((motive) => (
          <li key={motive.slug}>
            <RouteLink
              className={`sp-motive-card rarity-${motive.rarity}`}
              to={`${ARCHIVE}/motives/${motive.slug}`}
              navigate={navigate}
              aria-label={`${motive.name}, ${motive.rarity} star${motive.identity ? `, ${motive.identity.name}` : ''}`}
            >
              <span className="sp-motive-art">
                <Art src={motive.image_url} name={motive.name} />
              </span>
              <span className="sp-motive-name">{motive.name}</span>
              <span className="sp-motive-meta">
                <span className="sp-motive-stars">{'\u2605'.repeat(motive.rarity)}</span>
                {motive.identity && <span>{motive.identity.name}</span>}
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SkillRanks({ motive }) {
  const [index, setIndex] = useState(0)
  const ranks = motive.ranks
  if (!ranks.length) return <p>{motive.description}</p>
  const position = Math.min(index, ranks.length - 1)
  return (
    <>
      <LevelSlider
        label="Motive rank"
        unit="R"
        levels={ranks.map((rank) => rank.rank)}
        index={position}
        onChange={setIndex}
      />
      <p className="sp-rank-text">{ranks[position].description}</p>
    </>
  )
}

export function MotivePage({ slug, navigate }) {
  const { data: motive, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/motives`} navigate={navigate}>
      {'\u2190'} All motives
    </RouteLink>
  )
  if (loading || error || !motive) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{loading ? 'Loading motive...' : error || 'Motive not found.'}</Panel>
      </section>
    )
  }

  return (
    <section className="wuwa-section" aria-labelledby="sp-motive-title">
      {back}
      <div className="sp-motive-profile">
        <div className={`sp-motive-portrait rarity-${motive.rarity}`}>
          <Art src={motive.image_url} name={motive.name} />
        </div>
        <div className="sp-profile-copy">
          <p className="wuwa-eyebrow">Silver Palace {'\u00B7'} Motive</p>
          <h1 id="sp-motive-title">{motive.name}</h1>
          <ul className="sp-traits" aria-label="Identity">
            {motive.identity && (
              <li>
                <TraitIcon trait={motive.identity} />
                {motive.identity.name}
              </li>
            )}
          </ul>
          <p className="sp-stars" aria-label={`${motive.rarity}-star`}>
            {'\u2605'.repeat(motive.rarity)}
          </p>
          <dl className="wuwa-meta">
            {motive.skill_name && (
              <div>
                <dt>Motive skill</dt>
                <dd>{motive.skill_name}</dd>
              </div>
            )}
            {motive.base_hp != null && (
              <div>
                <dt>Base HP</dt>
                <dd>{numberFormat.format(motive.base_hp)}</dd>
              </div>
            )}
            {motive.base_atk != null && (
              <div>
                <dt>Base ATK</dt>
                <dd>{numberFormat.format(motive.base_atk)}</dd>
              </div>
            )}
            {motive.bonus_stat && (
              <div>
                <dt>{motive.bonus_stat}</dt>
                <dd>{motive.bonus_value}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="sp-tabpanel sp-motive-panels">
        <Collapsible chip="SKILL" title={motive.skill_name ?? 'Motive skill'}>
          <div className="sp-panel-body">
            <SkillRanks motive={motive} />
          </div>
        </Collapsible>
        {motive.lore && (
          <Collapsible chip="LORE" title="Story">
            <div className="wuwa-skill-body">
              {motive.lore.split('\n').map((line, position) => (
                <p key={position}>{line}</p>
              ))}
            </div>
          </Collapsible>
        )}
      </div>
    </section>
  )
}
