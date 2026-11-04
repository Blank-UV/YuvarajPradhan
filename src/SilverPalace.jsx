import React, { useEffect, useMemo, useState } from 'react'
import { siteProperties as site } from './site-properties.js'
import Sidebar, { silverPalaceNavigation } from './Sidebar.jsx'
import useColorMode from './useColorMode.js'
import heroImage from '../images/sp/hero/sp-main.jpg'
import {
  Collapsible,
  FilterGroup,
  Panel,
  RouteLink,
  ToTopButton,
  plainClick,
  useRemote,
  useRoute,
} from './archive-kit.jsx'
import { ARCHIVE, Art, LevelSlider, TraitIcon, numberFormat } from './sp-parts.jsx'
import { MotivePage, MotivesPage, emptyMotiveFilters } from './SilverPalaceMotives.jsx'
import { EpiphanyPage, EpiphaniesPage, emptyEpiphanyFilters } from './SilverPalaceEpiphanies.jsx'
import { CatalystPage, CatalystsPage, emptyCatalystFilters } from './SilverPalaceCatalysts.jsx'

const BASE = '/silver-palace'
const ARCHIVE_TABS = [
  { id: 'characters', label: 'Characters', href: `${ARCHIVE}/characters` },
  { id: 'motives', label: 'Motives', href: `${ARCHIVE}/motives` },
  { id: 'epiphanies', label: 'Epiphanies', href: `${ARCHIVE}/epiphanies` },
  { id: 'catalysts', label: 'Catalysts', href: `${ARCHIVE}/catalysts` },
]
const API = '/api/sp-characters'
const OVERVIEW =
  'Silver Palace is set in Silvernia, a city of detectives, aristocratic houses and a great many secrets. You play as the Detective, and the story advances case by case rather than as one continuous campaign.'
const RARITIES = [5, 4, 3]
const emptyFilters = { search: '', rarities: [], attributes: [], styles: [], identities: [] }

function parseRoute(pathname) {
  const rest = pathname
    .replace(/\/+$/, '')
    .replace(/^\/silver-palace/, '')
    .split('/')
    .filter(Boolean)
  if (!rest.length) return { page: 'home' }
  if (rest[0] === 'archives') {
    if (rest.length === 1) return { page: 'redirect', to: `${ARCHIVE}/characters` }
    if (rest[1] === 'characters' && rest.length === 2) return { page: 'list' }
    if (rest[1] === 'characters' && rest.length === 3) return { page: 'detail', slug: rest[2] }
    if (rest[1] === 'motives' && rest.length === 2) return { page: 'motives' }
    if (rest[1] === 'motives' && rest.length === 3) return { page: 'motive', slug: rest[2] }
    if (rest[1] === 'epiphanies' && rest.length === 2) return { page: 'epiphanies' }
    if (rest[1] === 'epiphanies' && rest.length === 3) return { page: 'epiphany', slug: rest[2] }
    if (rest[1] === 'catalysts' && rest.length === 2) return { page: 'catalysts' }
    if (rest[1] === 'catalysts' && rest.length === 3) return { page: 'catalyst', slug: rest[2] }
  }
  return { page: 'missing' }
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

const unique = (characters, pick) =>
  [...new Set(characters.map((character) => pick(character)?.name).filter(Boolean))].sort()

function CharactersPage({ navigate, filters, setFilters }) {
  const { data: characters, error, loading } = useRemote(API)
  const { search, rarities, attributes, styles, identities } = filters

  const options = useMemo(
    () => ({
      attributes: unique(characters ?? [], (c) => c.attribute),
      styles: unique(characters ?? [], (c) => c.combat_style),
      identities: unique(characters ?? [], (c) => c.identity),
      rarities: RARITIES.filter((rarity) => (characters ?? []).some((c) => c.rarity === rarity)),
    }),
    [characters],
  )

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (characters ?? []).filter(
      (character) =>
        (!needle ||
          [character.name, character.title, character.faction?.name]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(needle))) &&
        (!rarities.length || rarities.includes(character.rarity)) &&
        (!attributes.length || attributes.includes(character.attribute?.name)) &&
        (!styles.length || styles.includes(character.combat_style?.name)) &&
        (!identities.length || identities.includes(character.identity?.name)),
    )
  }, [characters, search, rarities, attributes, styles, identities])

  const dirty = search || rarities.length || attributes.length || styles.length || identities.length
  const update = (patch) => setFilters({ ...filters, ...patch })

  return (
    <section className="wuwa-section" aria-labelledby="sp-characters-title">
      <header className="wuwa-heading">
        <h1 id="sp-characters-title">
          <i aria-hidden="true" /> All Silver Palace characters
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
        {options.rarities.length > 1 && (
          <FilterGroup
            label="Rarity"
            options={options.rarities}
            selected={rarities}
            onChange={(value) => update({ rarities: value })}
            render={(rarity) => `${rarity}\u2605`}
          />
        )}
        <FilterGroup
          label="Attribute"
          options={options.attributes}
          selected={attributes}
          onChange={(value) => update({ attributes: value })}
          render={(name) => name}
        />
        <FilterGroup
          label="Combat style"
          options={options.styles}
          selected={styles}
          onChange={(value) => update({ styles: value })}
          render={(name) => name}
        />
        <FilterGroup
          label="Identity"
          options={options.identities}
          selected={identities}
          onChange={(value) => update({ identities: value })}
          render={(name) => name}
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

      <ul className="sp-grid">
        {shown.map((character) => (
          <li key={character.slug}>
            <RouteLink
              className={`sp-card rarity-${character.rarity}`}
              style={{ '--element': character.accent_color ?? undefined }}
              to={`${ARCHIVE}/characters/${character.slug}`}
              navigate={navigate}
              aria-label={`${character.name}, ${character.rarity} star ${character.attribute?.name ?? ''} ${character.combat_style?.name ?? ''}`}
            >
              <Art src={character.image_url} name={character.name} />
              <span className="sp-card-icons" aria-hidden="true">
                <TraitIcon trait={character.attribute} />
                <TraitIcon trait={character.combat_style} />
                <TraitIcon trait={character.identity} />
              </span>
              <span className="sp-card-name">{character.name}</span>
            </RouteLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

const number = numberFormat

function StatsSection({ character }) {
  const [index, setIndex] = useState(Math.max(character.stats.length - 1, 0))
  if (!character.stats.length) return null
  const stat = character.stats[index]
  return (
    <Collapsible chip="STATS" title="Base stats">
      <div className="sp-panel-body">
        <LevelSlider
          label="Character level"
          levels={character.stats.map((row) => row.level)}
          index={index}
          onChange={setIndex}
        />
        <dl className="sp-stats">
          <div>
            <dt>HP</dt>
            <dd>{number.format(stat.hp)}</dd>
          </div>
          <div>
            <dt>ATK</dt>
            <dd>{number.format(stat.atk)}</dd>
          </div>
          <div>
            <dt>DEF</dt>
            <dd>{number.format(stat.def)}</dd>
          </div>
        </dl>
        <p className="sp-note">Base stats at the chosen level, before gear.</p>
      </div>
    </Collapsible>
  )
}

function TrustSection({ character }) {
  if (!character.gifts.length && !character.trust.length) return null
  return (
    <Collapsible chip="TRUST" title="Trust & gifts">
      <div className="sp-panel-body">
        {character.gifts.length > 0 && (
          <>
            <h3 className="sp-minor-heading">Preferred gifts</h3>
            <ul className="sp-gifts">
              {character.gifts.map((gift) => (
                <li key={gift.name}>
                  {gift.image_url && <img src={gift.image_url} alt="" loading="lazy" />}
                  <span>{gift.name}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {character.trust.length > 0 && (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th scope="col">Trust level</th>
                  <th scope="col">Trust EXP</th>
                  <th scope="col">Running total</th>
                  <th scope="col">Gifts</th>
                  <th scope="col">Rewards</th>
                </tr>
              </thead>
              <tbody>
                {character.trust.map((row) => (
                  <tr key={row.level}>
                    <th scope="row">Lv. {row.level}</th>
                    <td>{row.exp == null ? 'Max' : number.format(row.exp)}</td>
                    <td>{number.format(row.running_total)}</td>
                    <td>{row.gifts_required}</td>
                    <td>
                      {row.rewards
                        .map((reward) =>
                          reward.quantity > 1
                            ? `${reward.name} \u00D7${number.format(reward.quantity)}`
                            : reward.name,
                        )
                        .join(' \u00B7 ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Collapsible>
  )
}

function Description({ blocks }) {
  return blocks.map((block, index) => {
    if (block.type === 'heading') return <h4 key={index}>{block.text}</h4>
    if (block.type === 'note')
      return (
        <p key={index} className="sp-note">
          {block.text}
        </p>
      )
    return <p key={index}>{block.text}</p>
  })
}

function SkillPanel({ skill }) {
  const [index, setIndex] = useState(Math.max(skill.levels.length - 1, 0))
  const levels = skill.levels
  const position = Math.min(index, levels.length - 1)
  const current = levels[position]
  return (
    <Collapsible chip={skill.code} title={skill.name}>
      <div className="wuwa-skill-body">
        <Description blocks={skill.description} />
      </div>
      {current && (
        <div className="sp-scaling">
          <LevelSlider
            label="Skill level"
            levels={levels.map((row) => row.level)}
            index={position}
            onChange={setIndex}
          />
          <dl className="sp-values">
            {skill.columns.map((label, column) => (
              <div key={label + column}>
                <dt>{label}</dt>
                <dd>{current.values[column]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Collapsible>
  )
}

function SkillsSection({ character }) {
  const [selected, setSelected] = useState(0)
  if (!character.skills.length) return null
  const skill = character.skills[Math.min(selected, character.skills.length - 1)]
  return (
    <>
      <div className="sp-tabs" role="tablist" aria-label="Skill">
        {character.skills.map((item, position) => (
          <button
            key={item.position}
            type="button"
            role="tab"
            aria-selected={position === selected}
            className={position === selected ? 'on' : ''}
            onClick={() => setSelected(position)}
          >
            {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
            <span>
              <small>{item.kind ?? item.code}</small>
              {item.name}
            </span>
          </button>
        ))}
      </div>
      <SkillPanel key={skill.position} skill={skill} />
    </>
  )
}

function PsychesSection({ character }) {
  if (!character.psyches.length) return null
  return (
    <>
      <p className="sp-note sp-psyche-note">Psyches are unlocked through duplicates.</p>
      <div className="sp-psyches">
        {character.psyches.map((psyche) => (
          <Collapsible
            key={psyche.position}
            chip={psyche.badge}
            title={psyche.name}
            icon={
              psyche.image_url && <img className="sp-psyche-icon" src={psyche.image_url} alt="" />
            }
          >
            <div className="wuwa-skill-body">
              <p>{psyche.description}</p>
            </div>
          </Collapsible>
        ))}
      </div>
    </>
  )
}

function DetailTabs({ character }) {
  const [tab, setTab] = useState('stats')
  const tabs = [
    { id: 'stats', label: 'Stats & Trust' },
    character.skills.length && { id: 'skills', label: 'Skills', count: character.skills.length },
    character.psyches.length && {
      id: 'psyches',
      label: 'Psyches',
      count: character.psyches.length,
    },
  ].filter(Boolean)
  return (
    <>
      <div className="sp-main-tabs" role="tablist" aria-label="Character details">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`sp-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="sp-tabpanel"
            className={tab === item.id ? 'on' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.count != null && <span>{item.count}</span>}
          </button>
        ))}
      </div>
      <div
        id="sp-tabpanel"
        role="tabpanel"
        aria-labelledby={`sp-tab-${tab}`}
        className="sp-tabpanel"
      >
        {tab === 'stats' && (
          <>
            <StatsSection character={character} />
            <TrustSection character={character} />
          </>
        )}
        {tab === 'skills' && <SkillsSection character={character} />}
        {tab === 'psyches' && <PsychesSection character={character} />}
      </div>
    </>
  )
}

function CharacterPage({ slug, navigate }) {
  const { data: character, error, loading } = useRemote(`${API}?slug=${encodeURIComponent(slug)}`)

  const back = (
    <RouteLink className="wuwa-back" to={`${ARCHIVE}/characters`} navigate={navigate}>
      {'\u2190'} All characters
    </RouteLink>
  )

  if (loading || error || !character) {
    return (
      <section className="wuwa-section">
        {back}
        <Panel>{loading ? 'Loading character...' : error || 'Character not found.'}</Panel>
      </section>
    )
  }

  const traits = [character.attribute, character.combat_style, character.identity].filter(Boolean)
  return (
    <section
      className="wuwa-section"
      aria-labelledby="sp-character-title"
      style={{ '--element': character.accent_color ?? undefined }}
    >
      {back}
      <div className="sp-profile">
        <div className={`sp-portrait rarity-${character.rarity}`}>
          <Art src={character.banner_url ?? character.image_url} name={character.name} />
        </div>
        <div className="sp-profile-copy">
          <p className="wuwa-eyebrow">
            Silver Palace{character.faction ? ` \u00B7 ${character.faction.name}` : ''}
          </p>
          <h1 id="sp-character-title">{character.name}</h1>
          <ul className="sp-traits" aria-label="Attribute, combat style and identity">
            {traits.map((trait) => (
              <li key={trait.slug}>
                <TraitIcon trait={trait} />
                {trait.name}
              </li>
            ))}
          </ul>
          <p className="sp-stars" aria-label={`${character.rarity}-star`}>
            {'\u2605'.repeat(character.rarity)}
          </p>
          <dl className="wuwa-meta">
            {character.title && (
              <div>
                <dt>Title</dt>
                <dd>{character.title}</dd>
              </div>
            )}
            {character.faction && (
              <div>
                <dt>Faction</dt>
                <dd>{character.faction.name}</dd>
              </div>
            )}
            {character.weapon && (
              <div>
                <dt>Weapon</dt>
                <dd>{character.weapon}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <DetailTabs key={character.slug} character={character} />
    </section>
  )
}

function HomePage({ navigate }) {
  return (
    <section className="wuwa-home" aria-labelledby="sp-home-title">
      <img className="wuwa-home-art" src={heroImage} alt="" fetchpriority="high" />
      <div className="wuwa-home-shade" aria-hidden="true" />
      <div className="wuwa-home-copy">
        <p className="wuwa-home-kicker">
          <i aria-hidden="true" /> Silvernia
        </p>
        <h1 id="sp-home-title">
          <span>Silver</span>
          <span>Palace</span>
        </h1>
        <p className="wuwa-home-text">{OVERVIEW}</p>
        <div className="wuwa-home-actions">
          <RouteLink className="wuwa-btn primary" to={`${ARCHIVE}/characters`} navigate={navigate}>
            Browse characters {'\u2192'}
          </RouteLink>
        </div>
        <ul className="wuwa-home-tags" aria-label="Highlights">
          <li>The Detective</li>
          <li>Aristocratic houses</li>
          <li>Case by case</li>
          <li>Secrets</li>
        </ul>
      </div>
    </section>
  )
}

export default function SilverPalace() {
  const [colorMode, toggleColorMode] = useColorMode()
  const [pathname, navigate] = useRoute()
  const [filters, setFilters] = useState(emptyFilters)
  const [motiveFilters, setMotiveFilters] = useState(emptyMotiveFilters)
  const [epiphanyFilters, setEpiphanyFilters] = useState(emptyEpiphanyFilters)
  const [catalystFilters, setCatalystFilters] = useState(emptyCatalystFilters)
  const route = parseRoute(pathname)

  useEffect(() => {
    if (route.page === 'redirect') navigate(route.to, { replace: true })
  }, [route.page, route.to, navigate])

  useEffect(() => {
    const section = {
      list: 'Characters',
      detail: route.slug?.replace(/-/g, ' '),
      motives: 'Motives',
      motive: route.slug?.replace(/-/g, ' '),
      epiphanies: 'Epiphanies',
      epiphany: route.slug?.replace(/-/g, ' '),
      catalysts: 'Catalysts',
      catalyst: route.slug?.replace(/-/g, ' '),
    }[route.page]
    document.title = `${site.identity.channelName} \u2014 Silver Palace${section ? ` \u00B7 ${section}` : ''}`
  }, [route.page, route.slug])

  const archiveTab = {
    list: 'characters',
    detail: 'characters',
    motives: 'motives',
    motive: 'motives',
    epiphanies: 'epiphanies',
    epiphany: 'epiphanies',
    catalysts: 'catalysts',
    catalyst: 'catalysts',
  }[route.page]
  const inArchive = Boolean(archiveTab)

  return (
    <div
      className={`site gaming-site wuwa-site sp-site ${colorMode === 'light' ? 'theme-light' : ''}`}
    >
      <Sidebar
        items={silverPalaceNavigation}
        brandHref={BASE}
        brandMark="SP"
        brandName="Silver Palace"
        bottomHref="/gaming#playing"
        bottomText="BACK TO GAMING"
        bottomIcon={'\u2190'}
        colorMode={colorMode}
        onToggleColorMode={toggleColorMode}
        activeId={inArchive ? 'archives' : ''}
        onNavigate={(href, event) => {
          if (!href || !plainClick(event)) return
          event.preventDefault()
          navigate(href)
        }}
      />
      <main id="main" className={`wuwa-main${route.page === 'home' ? ' is-home' : ''}`}>
        {inArchive && <ArchiveBar active={archiveTab} navigate={navigate} />}
        {route.page === 'home' && <HomePage navigate={navigate} />}
        {route.page === 'list' && (
          <CharactersPage navigate={navigate} filters={filters} setFilters={setFilters} />
        )}
        {route.page === 'detail' && (
          <CharacterPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'motives' && (
          <MotivesPage navigate={navigate} filters={motiveFilters} setFilters={setMotiveFilters} />
        )}
        {route.page === 'motive' && (
          <MotivePage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'epiphanies' && (
          <EpiphaniesPage
            navigate={navigate}
            filters={epiphanyFilters}
            setFilters={setEpiphanyFilters}
          />
        )}
        {route.page === 'epiphany' && (
          <EpiphanyPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
        {route.page === 'catalysts' && (
          <CatalystsPage
            navigate={navigate}
            filters={catalystFilters}
            setFilters={setCatalystFilters}
          />
        )}
        {route.page === 'catalyst' && (
          <CatalystPage key={route.slug} slug={route.slug} navigate={navigate} />
        )}
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
              {'\u00A9'} {new Date().getFullYear()} {site.identity.name.toUpperCase()} /{' '}
              {site.identity.channelName.toUpperCase()}
            </span>
            <a
              href="#main"
              onClick={(event) => {
                event.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              BACK TO TOP {'\u2191'}
            </a>
          </footer>
        </div>
        <ToTopButton />
      </main>
    </div>
  )
}
