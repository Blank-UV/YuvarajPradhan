import React, { useEffect, useMemo, useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import Sidebar, { wuwaNavigation } from './Sidebar.jsx'
import useColorMode from './useColorMode.js'
import {
  Collapsible,
  FilterGroup,
  FilterPanel,
  Panel,
  RouteLink,
  ToTopButton,
  plainClick,
  useRemote,
  usePrefetch,
  usePrefetchDetails,
  useRoute,
} from './archive-kit.jsx'
import heroImage from '../images/wuwa/hero/piano.jpg'
import ArchiveLoader, { shouldShowArchiveLoader } from './ArchiveLoader.jsx'

const BASE = '/wuthering-waves'
const ARCHIVE = `${BASE}/archives`
const ARCHIVE_TABS = [
  { id: 'characters', label: 'Characters', href: `${ARCHIVE}/characters` },
  { id: 'weapons', label: 'Weapons', href: `${ARCHIVE}/weapons` },
  { id: 'sonata-effects', label: 'Sonata effects', href: `${ARCHIVE}/sonata-effects` },
  { id: 'echoes', label: 'Echoes', href: `${ARCHIVE}/echoes` },
]
const API = '/api/wuwa-characters'
const LOADER_IMAGES = [heroImage]
const PREFETCH = [API, '/api/wuwa-weapons', '/api/wuwa-sonata', '/api/wuwa-echoes']
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
          <RouteLink className="wuwa-btn primary" to={`${ARCHIVE}/characters`} navigate={navigate}>
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
const SONATA_API = '/api/wuwa-sonata'
const SONATA_ELEMENTS = [...Object.keys(ELEMENTS), 'General']
const SONATA_KINDS = ['2 + 5 pieces', '3 pieces', '1 piece']
const emptySonataFilters = { search: '', elements: [], kinds: [] }
const ECHO_API = '/api/wuwa-echoes'
const ECHO_COSTS = [4, 3, 1]
const ECHO_CLASSES = ['Calamity', 'Overlord', 'Elite', 'Common']
const emptyEchoFilters = { search: '', costs: [], classes: [], sonata: '' }

const ARCHIVE_SECTIONS = ['characters', 'weapons', 'sonata-effects', 'echoes']

function parseRoute(pathname) {
  let rest = pathname
    .replace(/\/+$/, '')
    .replace(/^\/(?:wuthering-waves|wutheringwaves)/, '')
    .split('/')
    .filter(Boolean)
  const [first] = rest
  if (!first) return { page: 'home' }
  // Characters, weapons, sonata effects and echoes live under /archives; the old addresses redirect.
  if (ARCHIVE_SECTIONS.includes(first))
    return { page: 'redirect', to: `${ARCHIVE}/${rest.join('/')}` }
  if (first === 'archives') {
    rest = rest.slice(1)
    if (!rest.length) return { page: 'redirect', to: `${ARCHIVE}/characters` }
    const [section, slug] = rest
    if (section === 'characters' && rest.length === 1) return { page: 'list' }
    if (section === 'characters' && rest.length === 2) return { page: 'detail', slug }
    if (section === 'weapons' && rest.length === 1) return { page: 'weapons' }
    if (section === 'weapons' && rest.length === 2) return { page: 'weapon', slug }
    if (section === 'echoes' && rest.length === 1) return { page: 'echoes' }
    if (section === 'echoes' && rest.length === 2) return { page: 'echo', slug }
    if (section === 'sonata-effects' && rest.length === 1) return { page: 'sonatas' }
    if (section === 'sonata-effects' && rest.length === 2) return { page: 'sonata', slug }
    return { page: 'missing' }
  }
  if (first === 'team-calculations' && rest.length === 1) return { page: 'team' }
  return { page: 'missing' }
}

const ARCHIVE_PAGE_TAB = {
  list: 'characters',
  detail: 'characters',
  weapons: 'weapons',
  weapon: 'weapons',
  sonatas: 'sonata-effects',
  sonata: 'sonata-effects',
  echoes: 'echoes',
  echo: 'echoes',
}

function ArchiveBar({ active, navigate }) {
  return (
    <header className="wuwa-archive-bar">
      <p className="wuwa-archive-title">
        <i aria-hidden="true" /> Archives
      </p>
      <nav className="wuwa-archive-tabs" aria-label="Archives sections">
        {ARCHIVE_TABS.map((tab) => (
          <RouteLink
            key={tab.id}
            to={tab.href}
            navigate={navigate}
            className={active === tab.id ? 'on' : ''}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </RouteLink>
        ))}
      </nav>
    </header>
  )
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
      decoding="async"
      draggable="false"
      onError={() => setFailed(true)}
    />
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
        <FilterPanel
          active={rarities.length + elements.length + weapons.length}
          dirty={dirty}
          onReset={() => setFilters(emptyFilters)}
        >
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
        </FilterPanel>
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
              to={`${ARCHIVE}/characters/${character.slug}`}
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
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/characters`} navigate={navigate}>
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
        <FilterPanel
          active={rarities.length + types.length + substats.length}
          dirty={dirty}
          onReset={() => setFilters(emptyWeaponFilters)}
        >
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
        </FilterPanel>
      </div>

      {loading && <Panel>Loading weapons...</Panel>}
      {error && <Panel>{error}</Panel>}
      {weapons && shown.length === 0 && <Panel>No weapons match these filters.</Panel>}

      <ul className="wuwa-weapon-grid">
        {shown.map((weapon) => (
          <li key={weapon.slug}>
            <RouteLink
              className={`wuwa-weapon-card rarity-${weapon.rarity}`}
              to={`${ARCHIVE}/weapons/${weapon.slug}`}
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
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/weapons`} navigate={navigate}>
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

function pieceKind(set) {
  const pieces = (set.bonuses ?? []).map((bonus) => bonus.pieces)
  return pieces.includes(5)
    ? SONATA_KINDS[0]
    : pieces.includes(3)
      ? SONATA_KINDS[1]
      : SONATA_KINDS[2]
}

const sonataElement = (set) => set.element ?? 'General'

function SonataArt({ set }) {
  return <CharacterArt character={set} />
}

function SonatasPage({ navigate, filters, setFilters }) {
  const { data: sets, error, loading } = useRemote(SONATA_API)
  const { search, elements, kinds } = filters

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (sets ?? []).filter(
      (set) =>
        (!needle ||
          set.name.toLowerCase().includes(needle) ||
          set.bonuses.some((bonus) => bonus.text.toLowerCase().includes(needle))) &&
        (!elements.length || elements.includes(sonataElement(set))) &&
        (!kinds.length || kinds.includes(pieceKind(set))),
    )
  }, [sets, search, elements, kinds])

  const dirty = search || elements.length || kinds.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="sonatas-title">
      <header className="wuwa-heading">
        <h1 id="sonatas-title">
          <i aria-hidden="true" /> All sonata effects
        </h1>
        {sets && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'set' : 'sets'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search sonata effects</span>
          <input
            type="search"
            value={search}
            placeholder="Search sets or bonus text..."
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <FilterPanel
          active={elements.length + kinds.length}
          dirty={dirty}
          onReset={() => setFilters(emptySonataFilters)}
        >
          <FilterGroup
            label="Element"
            options={SONATA_ELEMENTS}
            selected={elements}
            onChange={(value) => update({ elements: value })}
            render={(element) => (
              <>
                {ELEMENTS[element] && (
                  <span className="wuwa-dot" style={{ background: ELEMENTS[element] }} />
                )}
                {element}
              </>
            )}
          />
          <FilterGroup
            label="Pieces"
            options={SONATA_KINDS}
            selected={kinds}
            onChange={(value) => update({ kinds: value })}
            render={(kind) => kind}
          />
        </FilterPanel>
      </div>

      {loading && <Panel>Loading sonata effects...</Panel>}
      {error && <Panel>{error}</Panel>}
      {sets && shown.length === 0 && <Panel>No sonata effects match these filters.</Panel>}

      <ul className="wuwa-sonata-grid">
        {shown.map((set) => (
          <li key={set.slug}>
            <RouteLink
              className="wuwa-sonata-card"
              style={{ '--element': ELEMENTS[set.element] ?? 'var(--accent)' }}
              to={`${ARCHIVE}/sonata-effects/${set.slug}`}
              navigate={navigate}
              aria-label={`${set.name}, ${pieceKind(set)}`}
            >
              <span className="wuwa-sonata-icon">
                <SonataArt set={set} />
              </span>
              <span className="wuwa-sonata-info">
                <span className="wuwa-sonata-name">{set.name}</span>
                {set.bonuses.map((bonus) => (
                  <span key={bonus.pieces} className="wuwa-sonata-bonus">
                    <b>{bonus.pieces}-pc</b> {bonus.text}
                  </span>
                ))}
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

const PRIORITY_LABEL = { lock: 'Lock', optional: 'Optional', discard: 'Discard' }

function SonataPage({ slug, navigate }) {
  const { data: set, error, loading } = useRemote(`${SONATA_API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/sonata-effects`} navigate={navigate}>
      {'\u2190'} All sonata effects
    </RouteLink>
  )

  if (loading)
    return (
      <section className="wuwa-section">
        {back}
        <Panel>Loading sonata effect...</Panel>
      </section>
    )
  if (error || !set) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{error || 'Sonata effect not found.'}</Panel>
      </section>
    )
  }

  const bestCharacters = set.best_characters ?? []
  const optionalCharacters = set.optional_characters ?? []
  const mainStats = Object.entries(set.main_stats ?? {}).sort(([a], [b]) => Number(b) - Number(a))
  const echoes = set.echoes ?? []
  const where = set.where_to_get ?? []
  const notes = set.notes ?? []

  return (
    <section className="wuwa-section" aria-labelledby="sonata-title">
      {back}
      <div
        className="wuwa-profile wuwa-weapon-profile"
        style={{ '--element': ELEMENTS[set.element] ?? 'var(--accent)' }}
      >
        <div className="wuwa-portrait wuwa-sonata-portrait">
          <SonataArt set={set} />
        </div>
        <div className="wuwa-profile-copy">
          <p className="wuwa-eyebrow">
            {set.element ?? 'General'} {'\u00B7'} {pieceKind(set)}
          </p>
          <h1 id="sonata-title">{set.name}</h1>
          <dl className="wuwa-meta">
            {set.bonuses.map((bonus) => (
              <div key={bonus.pieces}>
                <dt>Set bonus</dt>
                <dd>{bonus.pieces}-piece</dd>
              </div>
            ))}
            {echoes.length > 0 && (
              <div>
                <dt>Echoes</dt>
                <dd>{echoes.length}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <h2 className="wuwa-subheading">
        <i aria-hidden="true" /> Set bonuses
      </h2>
      <div className="wuwa-chain">
        {set.bonuses.map((bonus) => (
          <Collapsible
            key={bonus.pieces}
            chip={`${bonus.pieces}-pc`}
            title={`${bonus.pieces}-piece bonus`}
          >
            <div className="wuwa-skill-body">
              <p>
                <RichText>{bonus.text}</RichText>
              </p>
            </div>
          </Collapsible>
        ))}
      </div>

      {(bestCharacters.length > 0 || optionalCharacters.length > 0) && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Best characters
          </h2>
          <div className="wuwa-skill-grid">
            {bestCharacters.length > 0 && (
              <Collapsible
                chip="Best"
                title={`${bestCharacters.length} ${bestCharacters.length === 1 ? 'character' : 'characters'}`}
              >
                <ul className="wuwa-recommended">
                  {bestCharacters.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </Collapsible>
            )}
            {optionalCharacters.length > 0 && (
              <Collapsible
                chip="Optional"
                title={`${optionalCharacters.length} alternative builds`}
              >
                <ul className="wuwa-recommended">
                  {optionalCharacters.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </Collapsible>
            )}
          </div>
        </>
      )}

      {mainStats.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Echo main stats
          </h2>
          <div className="wuwa-skill-grid">
            {mainStats.map(([cost, stats]) => (
              <Collapsible key={cost} chip={`Cost ${cost}`} title="Main stat priority">
                <ul className="wuwa-recommended wuwa-stat-priority">
                  {stats.map((item) => (
                    <li key={item.stat} className={`priority-${item.priority}`}>
                      {item.stat}
                      <small>{PRIORITY_LABEL[item.priority]}</small>
                    </li>
                  ))}
                </ul>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      {echoes.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Echoes in this set
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible chip="Echoes" title={`${echoes.length} echoes can use this set`}>
              <ul className="wuwa-recommended">
                {echoes.map((echo) => (
                  <li key={echo.name}>
                    {echo.name}
                    {echo.cost ? <small>{`Cost ${echo.cost}`}</small> : null}
                  </li>
                ))}
              </ul>
            </Collapsible>
          </div>
        </>
      )}

      {where.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Where to get
          </h2>
          <div className="wuwa-skill-grid">
            {where.map((section) => (
              <Collapsible key={section.title} chip="Farm" title={section.title}>
                <div className="wuwa-skill-body">
                  {(section.text ?? []).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                  {(section.rows ?? []).map((row, index) => (
                    <p key={`row-${index}`} className="wuwa-where-row">
                      {row}
                    </p>
                  ))}
                </div>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      {notes.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Notes
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible chip="Guide" title="How to use this set">
              <div className="wuwa-skill-body">
                {notes.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </Collapsible>
          </div>
        </>
      )}
    </section>
  )
}

const sonataIcon = (echo, slug) => (echo.image_base ? `${echo.image_base}sonata/${slug}.png` : null)

function SonataChip({ echo, effect }) {
  const [failed, setFailed] = useState(false)
  const src = sonataIcon(echo, effect.slug)
  return src && !failed ? (
    <img
      className="wuwa-sonata-mini"
      src={src}
      alt=""
      title={effect.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : null
}

function EchoesPage({ navigate, filters, setFilters }) {
  const { data: echoes, error, loading } = useRemote(ECHO_API)
  const { search, costs, classes, sonata } = filters

  const sonataNames = useMemo(
    () =>
      [
        ...new Set((echoes ?? []).flatMap((echo) => echo.sonata_effects.map((item) => item.name))),
      ].sort(),
    [echoes],
  )
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (echoes ?? []).filter(
      (echo) =>
        (!needle || echo.name.toLowerCase().includes(needle)) &&
        (!costs.length || costs.includes(echo.cost)) &&
        (!classes.length || classes.includes(echo.class)) &&
        (!sonata || echo.sonata_effects.some((item) => item.name === sonata)),
    )
  }, [echoes, search, costs, classes, sonata])

  const dirty = search || costs.length || classes.length || sonata
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="echoes-title">
      <header className="wuwa-heading">
        <h1 id="echoes-title">
          <i aria-hidden="true" /> All echoes
        </h1>
        {echoes && (
          <span className="wuwa-count" aria-live="polite">
            Showing {shown.length} {shown.length === 1 ? 'echo' : 'echoes'}
          </span>
        )}
      </header>

      <div className="wuwa-toolbar">
        <label className="wuwa-search">
          <span className="sr-only">Search echoes</span>
          <input
            type="search"
            value={search}
            placeholder="Search echoes..."
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <FilterPanel
          active={costs.length + classes.length + (sonata ? 1 : 0)}
          dirty={dirty}
          onReset={() => setFilters(emptyEchoFilters)}
        >
          <FilterGroup
            label="Cost"
            options={ECHO_COSTS}
            selected={costs}
            onChange={(value) => update({ costs: value })}
            render={(cost) => `${cost}-cost`}
          />
          <FilterGroup
            label="Class"
            options={ECHO_CLASSES}
            selected={classes}
            onChange={(value) => update({ classes: value })}
            render={(item) => item}
          />
          <label className="wuwa-select">
            <span className="sr-only">Sonata effect</span>
            <select value={sonata} onChange={(event) => update({ sonata: event.target.value })}>
              <option value="">All sonata effects</option>
              {sonataNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </FilterPanel>
      </div>

      {loading && <Panel>Loading echoes...</Panel>}
      {error && <Panel>{error}</Panel>}
      {echoes && shown.length === 0 && <Panel>No echoes match these filters.</Panel>}

      <ul className="wuwa-echo-grid">
        {shown.map((echo) => (
          <li key={echo.slug}>
            <RouteLink
              className="wuwa-echo-card"
              to={`${ARCHIVE}/echoes/${echo.slug}`}
              navigate={navigate}
              aria-label={`${echo.name}, ${echo.cost}-cost ${echo.class ?? ''} echo`}
            >
              <span className="wuwa-echo-icon">
                <CharacterArt character={echo} />
              </span>
              <span className="wuwa-echo-name">{echo.name}</span>
              <span className="wuwa-echo-meta">
                <b>{echo.cost}</b> {echo.class}
              </span>
              <span className="wuwa-echo-sonatas">
                {echo.sonata_effects.map((effect) => (
                  <SonataChip key={effect.slug} echo={echo} effect={effect} />
                ))}
              </span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EchoPage({ slug, navigate }) {
  const { data: echo, error, loading } = useRemote(`${ECHO_API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/echoes`} navigate={navigate}>
      {'\u2190'} All echoes
    </RouteLink>
  )

  if (loading)
    return (
      <section className="wuwa-section">
        {back}
        <Panel>Loading echo...</Panel>
      </section>
    )
  if (error || !echo) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{error || 'Echo not found.'}</Panel>
      </section>
    )
  }

  const mainStats = echo.main_stats ?? []
  const subStats = echo.sub_stats ?? []
  const effects = echo.sonata_effects ?? []
  const where = echo.where_to_get ?? []
  const drops = echo.drops ?? []

  return (
    <section className="wuwa-section" aria-labelledby="echo-title">
      {back}
      <div className="wuwa-profile wuwa-weapon-profile" style={{ '--element': 'var(--accent)' }}>
        <div className="wuwa-portrait wuwa-echo-portrait">
          <CharacterArt character={echo} />
        </div>
        <div className="wuwa-profile-copy">
          <p className="wuwa-eyebrow">
            {echo.class ?? 'Echo'} {'\u00B7'} {echo.cost}-cost
          </p>
          <h1 id="echo-title">{echo.name}</h1>
          <dl className="wuwa-meta">
            <div>
              <dt>Cost</dt>
              <dd>{echo.cost}</dd>
            </div>
            {echo.class && (
              <div>
                <dt>Class</dt>
                <dd>{echo.class}</dd>
              </div>
            )}
            {echo.cooldown != null && (
              <div>
                <dt>Cooldown</dt>
                <dd>{echo.cooldown}s</dd>
              </div>
            )}
            {echo.number && (
              <div>
                <dt>No.</dt>
                <dd>{echo.number}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {echo.skill_text && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Echo skill
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible
              chip="Skill"
              title={echo.skill_rank ? `Skill at ${echo.skill_rank}` : 'Echo skill'}
            >
              <div className="wuwa-skill-body">
                <p>
                  <RichText>{echo.skill_text}</RichText>
                </p>
              </div>
            </Collapsible>
          </div>
        </>
      )}

      {effects.length > 0 && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Sonata effects
          </h2>
          <div className="wuwa-skill-grid">
            <Collapsible
              chip="Sets"
              title={`${effects.length} possible ${effects.length === 1 ? 'set' : 'sets'}`}
            >
              <ul className="wuwa-recommended wuwa-echo-sets">
                {effects.map((effect) => (
                  <li key={effect.slug}>
                    <SonataChip echo={echo} effect={effect} />
                    <RouteLink to={`${ARCHIVE}/sonata-effects/${effect.slug}`} navigate={navigate}>
                      {effect.name}
                    </RouteLink>
                  </li>
                ))}
              </ul>
            </Collapsible>
          </div>
        </>
      )}

      {(mainStats.length > 0 || subStats.length > 0) && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Stats <small>Lv. 25</small>
          </h2>
          <div className="wuwa-skill-grid">
            {mainStats.length > 0 && (
              <Collapsible chip="Main" title="Possible main stats">
                <ul className="wuwa-recommended wuwa-stat-priority">
                  {mainStats.map((item) => (
                    <li key={item.stat}>
                      {item.stat}
                      <small>{item.fixed ? `${item.value} fixed` : item.value}</small>
                    </li>
                  ))}
                </ul>
              </Collapsible>
            )}
            {subStats.length > 0 && (
              <Collapsible chip="Sub" title="Substat ranges">
                <ul className="wuwa-recommended wuwa-stat-priority">
                  {subStats.map((item) => (
                    <li key={item.stat}>
                      {item.stat}
                      <small>{item.range}</small>
                    </li>
                  ))}
                </ul>
              </Collapsible>
            )}
          </div>
        </>
      )}

      {(where.length > 0 || drops.length > 0) && (
        <>
          <h2 className="wuwa-subheading">
            <i aria-hidden="true" /> Where to get
          </h2>
          <div className="wuwa-skill-grid">
            {where.map((section) => (
              <Collapsible key={section.title} chip="Farm" title={section.title}>
                <div className="wuwa-skill-body">
                  {(section.text ?? []).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                  {(section.rows ?? []).map((row, index) => (
                    <p key={`row-${index}`} className="wuwa-where-row">
                      {row}
                    </p>
                  ))}
                </div>
              </Collapsible>
            ))}
            {drops.length > 0 && (
              <Collapsible chip="Drops" title="Material drops">
                <ul className="wuwa-recommended">
                  {drops.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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
  echoes: 'Echoes',
  echo: 'Echo',
  sonatas: 'Sonata effects',
  sonata: 'Sonata effect',
  detail: 'Character',
  team: 'Team Calculations',
  missing: 'Page not found',
}

export default function WutheringWaves() {
  const [colorMode, toggleColorMode] = useColorMode()
  const [pathname, navigate] = useRoute()
  usePrefetch(PREFETCH)
  usePrefetchDetails(API, API)
  const [opening, setOpening] = useState(() => shouldShowArchiveLoader('wuwa'))
  const [filters, setFilters] = useState(emptyFilters)
  const [weaponFilters, setWeaponFilters] = useState(emptyWeaponFilters)
  const [sonataFilters, setSonataFilters] = useState(emptySonataFilters)
  const [echoFilters, setEchoFilters] = useState(emptyEchoFilters)
  const route = parseRoute(pathname)

  useEffect(() => {
    if (route.page === 'redirect') navigate(route.to, { replace: true })
    else if (pathname.startsWith('/wutheringwaves'))
      navigate(pathname.replace('/wutheringwaves', BASE), { replace: true })
  }, [pathname, route.page, route.to, navigate])

  useEffect(() => {
    const section =
      route.page === 'detail' ? route.slug.replace(/-/g, ' ') : (titles[route.page] ?? '')
    document.title = `${site.identity.channelName} \u2014 Wuthering Waves${section ? ` \u00B7 ${section}` : ''}`
  }, [route.page, route.slug])

  const archiveTab = ARCHIVE_PAGE_TAB[route.page]
  const activeId = archiveTab ? 'archives' : route.page === 'team' ? 'team-calculations' : ''

  return (
    <div className={`site gaming-site wuwa-site ${colorMode === 'light' ? 'theme-light' : ''}`}>
      {opening && (
        <ArchiveLoader
          variant="wuwa"
          storageKey="wuwa"
          eyebrow="Resonance archive"
          title="Wuthering Waves"
          status="Tuning the frequency..."
          urls={PREFETCH}
          images={LOADER_IMAGES}
          onDone={() => setOpening(false)}
        />
      )}
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
        {archiveTab && <ArchiveBar active={archiveTab} navigate={navigate} />}
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
        {route.page === 'sonatas' && (
          <SonatasPage navigate={navigate} filters={sonataFilters} setFilters={setSonataFilters} />
        )}
        {route.page === 'sonata' && (
          <SonataPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'echoes' && (
          <EchoesPage navigate={navigate} filters={echoFilters} setFilters={setEchoFilters} />
        )}
        {route.page === 'echo' && (
          <EchoPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'team' && <TeamCalculationsPage />}
        {route.page === 'missing' && (
          <section className="wuwa-section">
            <Panel>
              This page does not exist.{' '}
              <RouteLink to={`${ARCHIVE}/characters`} navigate={navigate}>
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
