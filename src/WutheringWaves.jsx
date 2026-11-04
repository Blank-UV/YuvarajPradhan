import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import Sidebar, { wuwaNavigation } from './Sidebar.jsx'
import useColorMode from './useColorMode.js'
import heroImage from '../images/wuwa/hero/piano.jpg'

const BASE = '/wuthering-waves'
const API = '/api/wuwa-characters'
const OVERVIEW =
  'Wuthering Waves is a story-rich open-world action RPG with a high degree of freedom. You wake from your slumber as Rover, joined by a vibrant cast of Resonators on a journey to reclaim your lost memories and change the world.'

function HomePage({ navigate }) {
  return (
    <section className="wuwa-home" aria-labelledby="wuwa-home-title">
      <img className="wuwa-home-art" src={heroImage} alt="" fetchpriority="high" />
      <div className="wuwa-home-shade" aria-hidden="true" />
      <div className="wuwa-home-copy">
        <p className="wuwa-home-kicker">
          <i aria-hidden="true" /> Open-world action RPG
        </p>
        <h1 id="wuwa-home-title">
          <span>Wuthering</span>
          <span>Waves</span>
        </h1>
        <p className="wuwa-home-text">{OVERVIEW}</p>
        <div className="wuwa-home-actions">
          <RouteLink className="wuwa-btn primary" to={`${BASE}/characters`} navigate={navigate}>
            Browse Resonators {'\u2192'}
          </RouteLink>
          <RouteLink className="wuwa-btn" to={`${BASE}/team-calculations`} navigate={navigate}>
            Team calculations
          </RouteLink>
        </div>
        <ul className="wuwa-home-tags" aria-label="Highlights">
          <li>Rover</li>
          <li>Resonators</li>
          <li>Lost memories</li>
          <li>Open world</li>
        </ul>
      </div>
    </section>
  )
}

const ELEMENTS = {
  Aero: '#55ffb5',
  Electro: '#b96bff',
  Fusion: '#f0744e',
  Glacio: '#41aefd',
  Havoc: '#e649a6',
  Spectro: '#f6e463',
}
const WEAPONS = ['Broadblade', 'Sword', 'Pistols', 'Gauntlets', 'Rectifier']
const RARITIES = [4, 5]
const SKILL_TABS = [
  { id: 'active', label: 'Active skills' },
  { id: 'passive', label: 'Passive skills' },
  { id: 'concerto', label: 'Concerto skills' },
]

const emptyFilters = { search: '', rarities: [], elements: [], weapons: [] }
const WEAPON_API = '/api/wuwa-weapons'
const WEAPON_RARITIES = [1, 2, 3, 4, 5]
const SUBSTATS = ['ATK', 'HP', 'DEF', 'Crit Rate', 'Crit DMG', 'Energy Regen']
const emptyWeaponFilters = { search: '', rarities: [], types: [], substats: [] }

function parseRoute(pathname) {
  const rest = pathname
    .replace(/\/+$/, '')
    .replace(/^\/(?:wuthering-waves|wutheringwaves)/, '')
    .split('/')
    .filter(Boolean)
  const [section, slug] = rest
  if (!section) return { page: 'home' }
  if (section === 'characters' && rest.length === 1) return { page: 'list' }
  if (section === 'characters' && rest.length === 2) return { page: 'detail', slug }
  if (section === 'weapons' && rest.length === 1) return { page: 'weapons' }
  if (section === 'weapons' && rest.length === 2) return { page: 'weapon', slug }
  if (section === 'team-calculations' && rest.length === 1) return { page: 'team' }
  return { page: 'missing' }
}

function useRoute() {
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

function plainClick(event) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

function RouteLink({ to, navigate, children, ...props }) {
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
  if (!response.ok) throw new Error(body?.error || `Character service returned ${response.status}`)
  return body
}

function useRemote(url) {
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
            error: error instanceof Error ? error.message : 'Could not load character data',
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

const ELEMENT_NAMES = Object.keys(ELEMENTS)

// Renders the formatted `body` blocks: gold titles, blue skill references, element-coloured damage.
function Body({ body }) {
  return body.map((block, index) =>
    block.type === 'title' ? (
      <h4 key={index}>{block.text}</h4>
    ) : (
      <p key={index}>
        {block.runs.map((run, runIndex) => {
          if (run.t === 'hl')
            return (
              <span key={runIndex} className="wuwa-hl">
                {run.v}
              </span>
            )
          if (run.t === 'el' && ELEMENT_NAMES.includes(run.e))
            return (
              <span key={runIndex} style={{ color: ELEMENTS[run.e] }}>
                {run.v}
              </span>
            )
          return run.v
        })}
      </p>
    ),
  )
}

const highlight =
  /(\b\d+(?:\.\d+)?(?:%|s\b)?|\b(?:Aero|Electro|Fusion|Glacio|Havoc|Spectro)(?: DMG)?)/g

function RichText({ children }) {
  return String(children)
    .split(highlight)
    .map((part, index) => {
      if (index % 2 === 0) return part
      const element = ELEMENTS[part.split(' ')[0]]
      return element ? (
        <b key={index} className="wuwa-element-text" style={{ color: element }}>
          {part}
        </b>
      ) : (
        <b key={index} className="wuwa-num">
          {part}
        </b>
      )
    })
}

function CharacterArt({ character }) {
  const [failed, setFailed] = useState(false)
  if (!character.image_url || failed) {
    return (
      <span className="wuwa-art-fallback" aria-hidden="true">
        {character.name.charAt(0)}
      </span>
    )
  }
  return (
    <img
      src={character.image_url}
      alt=""
      loading="lazy"
      draggable="false"
      onError={() => setFailed(true)}
    />
  )
}

function Panel({ children }) {
  return <div className="wuwa-panel">{children}</div>
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function FilterGroup({ label, options, selected, onChange, render }) {
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

function CharactersPage({ navigate, filters, setFilters }) {
  const { data: characters, error, loading } = useRemote(API)
  const { search, rarities, elements, weapons } = filters

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (characters ?? []).filter(
      (character) =>
        (!needle || character.name.toLowerCase().includes(needle)) &&
        (!rarities.length || rarities.includes(character.rarity)) &&
        (!elements.length || elements.includes(character.element)) &&
        (!weapons.length || weapons.includes(character.weapon_type)),
    )
  }, [characters, search, rarities, elements, weapons])

  const dirty = search || rarities.length || elements.length || weapons.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="characters-title">
      <header className="wuwa-heading">
        <h1 id="characters-title">
          <i aria-hidden="true" /> All Wuthering Waves characters
        </h1>
        {characters && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'character' : 'characters'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search characters</span>
          <input
            type="search"
            value={search}
            placeholder="Search characters..."
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
          label="Element"
          options={Object.keys(ELEMENTS)}
          selected={elements}
          onChange={(value) => update({ elements: value })}
          render={(element) => (
            <>
              <span className="wuwa-dot" style={{ background: ELEMENTS[element] }} />
              {element}
            </>
          )}
        />
        <FilterGroup
          label="Weapon"
          options={WEAPONS}
          selected={weapons}
          onChange={(value) => update({ weapons: value })}
          render={(weapon) => weapon}
        />
        <button
          type="button"
          className="wuwa-reset"
          disabled={!dirty}
          onClick={() => setFilters(emptyFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading characters...</Panel>}
      {error && <Panel>{error}</Panel>}
      {characters && shown.length === 0 && <Panel>No characters match these filters.</Panel>}

      <ul className="wuwa-grid">
        {shown.map((character) => (
          <li key={character.slug}>
            <RouteLink
              className={`wuwa-card rarity-${character.rarity}`}
              style={{ '--element': ELEMENTS[character.element] }}
              to={`${BASE}/characters/${character.slug}`}
              navigate={navigate}
              aria-label={`${character.name}, ${character.rarity} star ${character.element} ${character.weapon_type}`}
            >
              <CharacterArt character={character} />
              <span className="wuwa-card-element" aria-hidden="true" />
              {character.is_new && <span className="wuwa-card-new">NEW</span>}
              <span className="wuwa-card-name">{character.name}</span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

function statKey(stat) {
  return String(stat)
    .toLowerCase()
    .replace(/[^a-z%]/g, '')
}

function computeStats(character, includeFortes) {
  let { hp, atk, def } = character
  const elementKey = `${character.element.toLowerCase()}dmg`
  const stats = {
    critRate: Number(character.crit_rate ?? 0),
    critDmg: Number(character.crit_dmg ?? 0),
    healing: Number(character.healing_bonus ?? 0),
    elementDmg: Number(character.element_dmg_bonus ?? 0),
  }
  if (includeFortes) {
    for (const { stat, value } of character.minor_fortes ?? []) {
      const amount = Number(value)
      const key = statKey(stat)
      if (key === 'atk%') atk *= 1 + amount / 100
      else if (key === 'hp%') hp *= 1 + amount / 100
      else if (key === 'def%') def *= 1 + amount / 100
      else if (key === 'critrate') stats.critRate += amount
      else if (key === 'critdmg') stats.critDmg += amount
      else if (key === 'healingbonus') stats.healing += amount
      else if (key === elementKey) stats.elementDmg += amount
    }
  }
  const percent = (value) => `${Number(value.toFixed(1))}%`
  return [
    ['HP', Math.floor(hp)],
    ['ATK', Math.floor(atk)],
    ['DEF', Math.floor(def)],
    ['Max Energy', character.max_energy],
    ['Crit Rate', percent(stats.critRate)],
    ['Crit DMG', percent(stats.critDmg)],
    ['Healing Bonus', percent(stats.healing)],
    [`${character.element} DMG`, percent(stats.elementDmg)],
  ]
}

function Collapsible({ chip, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <article className={`wuwa-skill${open ? '' : ' collapsed'}`}>
      <header>
        <span className="wuwa-chip">{chip}</span>
        <h3>{title}</h3>
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

function SkillCard({ skill }) {
  return (
    <Collapsible chip={skill.kind} title={skill.name}>
      <div className="wuwa-skill-body">
        {skill.body?.length ? (
          <Body body={skill.body} />
        ) : (
          <>
            {skill.description && (
              <p>
                <RichText>{skill.description}</RichText>
              </p>
            )}
            {(skill.entries ?? []).map((entry) => (
              <div key={entry.label}>
                <h4>{entry.label}</h4>
                <p>
                  <RichText>{entry.text}</RichText>
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </Collapsible>
  )
}

function CharacterPage({ slug, navigate }) {
  const { data: character, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)
  const [tab, setTab] = useState('active')
  const [includeFortes, setIncludeFortes] = useState(false)

  const tabs = SKILL_TABS.filter((item) => character?.skills.some((skill) => skill.tab === item.id))
  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id
  const color = character && ELEMENTS[character.element]

  const back = (
    <RouteLink className="wuwa-back" to={`${BASE}/characters`} navigate={navigate}>
      {'\u2190'} All characters
    </RouteLink>
  )

  if (loading)
    return (
      <section className="wuwa-section">
        {back}
        <Panel>Loading character...</Panel>
      </section>
    )
  if (error || !character) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{error || 'Character not found.'}</Panel>
      </section>
    )
  }

  return (
    <section className="wuwa-section" aria-labelledby="character-title">
      {back}
      <div className="wuwa-profile" style={{ '--element': color }}>
        <div className={`wuwa-portrait rarity-${character.rarity}`}>
          <CharacterArt character={character} />
        </div>
        <div className="wuwa-profile-copy">
          <p className="wuwa-eyebrow">
            {'\u2605'.repeat(character.rarity)} {character.rarity}-star resonator
          </p>
          <h1 id="character-title">{character.name}</h1>
          <dl className="wuwa-meta">
            <div>
              <dt>Element</dt>
              <dd style={{ color }}>{character.element}</dd>
            </div>
            <div>
              <dt>Weapon</dt>
              <dd>{character.weapon_type}</dd>
            </div>
            {character.release_version && (
              <div>
                <dt>Released</dt>
                <dd>Version {character.release_version}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {tabs.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Skills
          </h2>
          <div className="wuwa-tabs" role="tablist" aria-label="Skill type">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeTab === item.id}
                className={activeTab === item.id ? 'on' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="wuwa-skill-grid" role="tabpanel">
            {character.skills
              .filter((skill) => skill.tab === activeTab)
              .map((skill) => (
                <SkillCard key={`${skill.kind}-${skill.name}`} skill={skill} />
              ))}
          </div>
        </>
      )}

      {character.sequences.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Resonance chain (dupes)
          </h2>
          <div className="wuwa-chain">
            {character.sequences.map((sequence) => (
              <Collapsible key={sequence.node} chip={`S${sequence.node}`} title={sequence.name}>
                <div className="wuwa-skill-body">
                  {sequence.body?.length ? (
                    <Body body={sequence.body} />
                  ) : (
                    <p>
                      <RichText>{sequence.description}</RichText>
                    </p>
                  )}
                </div>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      {character.minor_fortes?.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Minor fortes (total)
          </h2>
          <div className="wuwa-fortes">
            {character.minor_fortes.map((forte) => (
              <div key={forte.stat}>
                {forte.stat} <b>+{forte.value}%</b>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="wuwa-subheading">
        <i aria-hidden="true" /> Stats <small>Lv. 90</small>
      </h2>
      <label className="wuwa-switch">
        <input
          type="checkbox"
          checked={includeFortes}
          onChange={(event) => setIncludeFortes(event.target.checked)}
        />
        <span>Include minor fortes</span>
      </label>
      <dl className="wuwa-stats">
        {computeStats(character, includeFortes).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? '\u2014'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function WeaponsPage({ navigate, filters, setFilters }) {
  const { data: weapons, error, loading } = useRemote(WEAPON_API)
  const { search, rarities, types, substats } = filters

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (weapons ?? []).filter(
      (weapon) =>
        (!needle ||
          weapon.name.toLowerCase().includes(needle) ||
          (weapon.skill_name ?? '').toLowerCase().includes(needle)) &&
        (!rarities.length || rarities.includes(weapon.rarity)) &&
        (!types.length || types.includes(weapon.weapon_type)) &&
        (!substats.length || substats.includes(weapon.sub_stat)),
    )
  }, [weapons, search, rarities, types, substats])

  const dirty = search || rarities.length || types.length || substats.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="weapons-title">
      <header className="wuwa-heading">
        <h1 id="weapons-title">
          <i aria-hidden="true" /> All Wuthering Waves weapons
        </h1>
        {weapons && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'weapon' : 'weapons'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search weapons</span>
          <input
            type="search"
            value={search}
            placeholder="Search weapons or skills..."
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <FilterGroup
          label="Rarity"
          options={WEAPON_RARITIES}
          selected={rarities}
          onChange={(value) => update({ rarities: value })}
          render={(rarity) => `${rarity}\u2605`}
        />
        <FilterGroup
          label="Type"
          options={WEAPONS}
          selected={types}
          onChange={(value) => update({ types: value })}
          render={(type) => type}
        />
        <FilterGroup
          label="Substat"
          options={SUBSTATS}
          selected={substats}
          onChange={(value) => update({ substats: value })}
          render={(stat) => stat}
        />
        <button
          type="button"
          className="wuwa-reset"
          disabled={!dirty}
          onClick={() => setFilters(emptyWeaponFilters)}
        >
          {'\u00D7'} Reset
        </button>
      </div>

      {loading && <Panel>Loading weapons...</Panel>}
      {error && <Panel>{error}</Panel>}
      {weapons && shown.length === 0 && <Panel>No weapons match these filters.</Panel>}

      <ul className="wuwa-weapon-grid">
        {shown.map((weapon) => (
          <li key={weapon.slug}>
            <RouteLink
              className={`wuwa-weapon-card rarity-${weapon.rarity}`}
              to={`${BASE}/weapons/${weapon.slug}`}
              navigate={navigate}
              aria-label={`${weapon.name}, ${weapon.rarity} star ${weapon.weapon_type}`}
            >
              <span className="wuwa-weapon-icon">
                <CharacterArt character={weapon} />
              </span>
              <span className="wuwa-weapon-info">
                <span className="wuwa-weapon-name">{weapon.name}</span>
                <span className="wuwa-weapon-sub">
                  {'\u2605'.repeat(weapon.rarity)} {weapon.weapon_type}
                </span>
                <span className="wuwa-weapon-stats">
                  ATK {weapon.atk} {'\u00B7'} {weapon.sub_stat} {weapon.sub_value}
                </span>
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

function WeaponPage({ slug, navigate }) {
  const {
    data: weapon,
    error,
    loading,
  } = useRemote(`${WEAPON_API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${BASE}/weapons`} navigate={navigate}>
      {'\u2190'} All weapons
    </RouteLink>
  )

  if (loading)
    return (
      <section className="wuwa-section">
        {back}
        <Panel>Loading weapon...</Panel>
      </section>
    )
  if (error || !weapon) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{error || 'Weapon not found.'}</Panel>
      </section>
    )
  }

  const syntony = weapon.syntony ?? []
  const levels = weapon.levels ?? []
  const recommended = weapon.recommended ?? []
  const lines = (weapon.obtain ?? '').split('\n').filter(Boolean)

  return (
    <section className="wuwa-section" aria-labelledby="weapon-title">
      {back}
      <div className="wuwa-profile wuwa-weapon-profile" style={{ '--element': 'var(--accent)' }}>
        <div className={`wuwa-portrait wuwa-weapon-portrait rarity-${weapon.rarity}`}>
          <CharacterArt character={weapon} />
        </div>
        <div className="wuwa-profile-copy">
          <p className="wuwa-eyebrow">
            {'\u2605'.repeat(weapon.rarity)} {weapon.rarity}-star {weapon.weapon_type}
          </p>
          <h1 id="weapon-title">{weapon.name}</h1>
          <dl className="wuwa-meta">
            <div>
              <dt>Base ATK (Lv. {weapon.max_level ?? 90})</dt>
              <dd>{weapon.atk}</dd>
            </div>
            <div>
              <dt>
                {weapon.sub_stat} (Lv. {weapon.max_level ?? 90})
              </dt>
              <dd>{weapon.sub_value}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{weapon.weapon_type}</dd>
            </div>
          </dl>
        </div>
      </div>

      <h2 className="wuwa-subheading">
        <i aria-hidden="true" /> Weapon skill
      </h2>
      <div className="wuwa-skill-grid">
        <Collapsible chip="Skill" title={weapon.skill_name}>
          <div className="wuwa-skill-body">
            <p>
              <RichText>{weapon.skill_text}</RichText>
            </p>
          </div>
        </Collapsible>
      </div>

      {syntony.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Syntony ranks
          </h2>
          <div className="wuwa-chain">
            {syntony.map((text, index) => (
              <Collapsible key={index} chip={`R${index + 1}`} title={`Rank ${index + 1}`}>
                <div className="wuwa-skill-body">
                  <p>
                    <RichText>{text}</RichText>
                  </p>
                </div>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      {levels.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Level stats
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible chip="Stats" title="ATK and substat by level">
              <div className="wuwa-skill-body">
                <table className="wuwa-levels">
                  <thead>
                    <tr>
                      <th>Lv.</th>
                      <th>ATK</th>
                      <th>{weapon.sub_stat}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((row) => (
                      <tr key={row.level}>
                        <td>{row.level}</td>
                        <td>{row.atk}</td>
                        <td>{row.sub}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Collapsible>
          </div>
        </>
      )}

      {recommended.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Recommended characters
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible chip="Best for" title={`${recommended.length} characters`}>
              <ul className="wuwa-recommended">
                {recommended.map((item) => (
                  <li key={item.name}>
                    <span
                      className="wuwa-dot"
                      style={{ background: ELEMENTS[item.element] ?? 'var(--w-muted)' }}
                    />
                    {item.name}
                    {item.rarity ? <small>{`${item.rarity}\u2605`}</small> : null}
                  </li>
                ))}
              </ul>
            </Collapsible>
          </div>
        </>
      )}

      {(lines.length > 0 || weapon.lore) && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Details
          </h2>
          <div className="wuwa-skill-grid">
            {lines.length > 0 && (
              <Collapsible chip="Obtain" title="How to get">
                <div className="wuwa-skill-body">
                  {lines.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </Collapsible>
            )}
            {weapon.lore && (
              <Collapsible chip="Lore" title="Description">
                <div className="wuwa-skill-body">
                  <p>{weapon.lore}</p>
                </div>
              </Collapsible>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function TeamCalculationsPage() {
  return (
    <section className="wuwa-section" aria-labelledby="team-title">
      <header className="wuwa-heading">
        <h1 id="team-title">
          <i aria-hidden="true" /> Team calculations
        </h1>
      </header>
      <Panel>
        <strong className="wuwa-soon">Coming soon</strong>
        <span>Damage and team comparisons will live here.</span>
      </Panel>
    </section>
  )
}

const titles = {
  home: '',
  list: 'Characters',
  weapons: 'Weapons',
  weapon: 'Weapon',
  detail: 'Character',
  team: 'Team Calculations',
  missing: 'Page not found',
}

function ToTopButton() {
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

export default function WutheringWaves() {
  const [colorMode, toggleColorMode] = useColorMode()
  const [pathname, navigate] = useRoute()
  const [filters, setFilters] = useState(emptyFilters)
  const [weaponFilters, setWeaponFilters] = useState(emptyWeaponFilters)
  const route = parseRoute(pathname)

  useEffect(() => {
    if (pathname.startsWith('/wutheringwaves'))
      navigate(pathname.replace('/wutheringwaves', BASE), { replace: true })
  }, [pathname, navigate])

  useEffect(() => {
    const section =
      route.page === 'detail' ? route.slug.replace(/-/g, ' ') : (titles[route.page] ?? '')
    document.title = `${site.identity.channelName} \u2014 Wuthering Waves${section ? ` \u00B7 ${section}` : ''}`
  }, [route.page, route.slug])

  const activeId =
    route.page === 'list' || route.page === 'detail'
      ? 'characters'
      : route.page === 'weapons' || route.page === 'weapon'
        ? 'weapons'
        : route.page === 'team'
          ? 'team-calculations'
          : ''

  return (
    <div className={`site gaming-site wuwa-site ${colorMode === 'light' ? 'theme-light' : ''}`}>
      <Sidebar
        items={wuwaNavigation}
        brandHref={BASE}
        brandMark={
          <>
            <span className="ww-w1">W</span>
            <span className="ww-w2">W</span>
          </>
        }
        brandName="Wuthering Waves"
        bottomHref="/gaming#playing"
        bottomText="BACK TO GAMING"
        bottomIcon={'\u2190'}
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        activeId={activeId}
        onNavigate={(href, event) => {
          if (!href || !plainClick(event)) return
          event.preventDefault()
          navigate(href)
        }}
      />
      <main id="main" className={`wuwa-main${route.page === 'home' ? ' is-home' : ''}`}>
        {route.page === 'home' && <HomePage navigate={navigate} />}
        {route.page === 'list' && (
          <CharactersPage navigate={navigate} filters={filters} setFilters={setFilters} />
        )}
        {route.page === 'detail' && (
          <CharacterPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'weapons' && (
          <WeaponsPage navigate={navigate} filters={weaponFilters} setFilters={setWeaponFilters} />
        )}
        {route.page === 'weapon' && (
          <WeaponPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'team' && <TeamCalculationsPage />}
        {route.page === 'missing' && (
          <section className="wuwa-section">
            <Panel>
              This page does not exist.{' '}
              <RouteLink to={`${BASE}/characters`} navigate={navigate}>
                Back to characters
              </RouteLink>
            </Panel>
          </section>
        )}
        <div className="wuwa-footer-wrap">
          <footer className="gaming-footer wuwa-footer">
            <span>
              © {new Date().getFullYear()} {site.identity.name.toUpperCase()} /{' '}
              {site.identity.channelName.toUpperCase()}
            </span>
            <a
              href="#main"
              onClick={(event) => {
                event.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              BACK TO TOP ↑
            </a>
          </footer>
        </div>
        <ToTopButton />
      </main>
    </div>
  )
}
