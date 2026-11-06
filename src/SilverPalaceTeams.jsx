import React, { useMemo, useState } from 'react'
import { Panel, RouteLink, useRemote } from './archive-kit.jsx'
import { ARCHIVE, Art } from './sp-parts.jsx'
import teams from './data/sp-teams.json'

const ATTRIBUTES = ['Ignis', 'Glacies', 'Gravitas', 'Fulmen', 'Radiatio', 'Alba']
const GEAR = [
  { key: 'motives', label: 'Motive', kind: 'motives' },
  { key: 'implements', label: 'Implements', kind: 'implements' },
  { key: 'epiphanies', label: 'Epiphany', kind: 'epiphanies' },
  { key: 'catalysts', label: 'Catalysts', kind: 'catalysts' },
]

const indexByName = (list) => new Map((list ?? []).map((item) => [item.name.toLowerCase(), item]))
const tally = (members, pick) => {
  const counts = new Map()
  for (const member of members) counts.set(pick(member), (counts.get(pick(member)) ?? 0) + 1)
  return [...counts]
}

function GearItem({ kind, name, entry, navigate }) {
  const body = (
    <>
      <span className="sp-team-gear-art">
        <Art src={entry?.image_url} name={name} />
      </span>
      <span>{name}</span>
    </>
  )
  return entry ? (
    <RouteLink
      className="sp-team-gear-item"
      to={`${ARCHIVE}/${kind}/${entry.slug}`}
      navigate={navigate}
    >
      {body}
    </RouteLink>
  ) : (
    <span className="sp-team-gear-item">{body}</span>
  )
}

function Chip({ name, icon }) {
  return (
    <span className="sp-team-chip">
      {icon && <img src={icon} alt="" width="18" height="18" loading="lazy" />}
      {name}
    </span>
  )
}

function MemberDetail({ member, character, icons, gear, navigate }) {
  return (
    <div className="sp-team-member">
      <div className="sp-team-member-head">
        <span className="sp-team-portrait">
          <Art src={character?.image_url} name={member.name} />
        </span>
        <span>
          <small>
            {member.seat} · {member.role}
          </small>
          <b>{member.name}</b>
        </span>
      </div>
      <div className="sp-team-chips">
        <Chip name={member.attribute} icon={icons.attributes.get(member.attribute)} />
        <Chip name={member.combat_style} icon={icons.styles.get(member.combat_style)} />
      </div>
      <p className="sp-guide-text">{member.summary}</p>

      {member.has_build ? (
        <>
          {member.key_stats.length > 0 && (
            <div className="sp-team-block">
              <h4>Key Stats</h4>
              <ul className="sp-team-tags">
                {member.key_stats.map((stat) => (
                  <li key={stat}>{stat}</li>
                ))}
              </ul>
            </div>
          )}
          {GEAR.map(({ key, label, kind }) =>
            member[key].length ? (
              <div className="sp-team-block" key={key}>
                <h4>{label}</h4>
                <div className="sp-team-gear">
                  {member[key].map((name, index) => (
                    <GearItem
                      key={`${name}-${index}`}
                      kind={kind}
                      name={name}
                      entry={gear[kind].get(name.toLowerCase())}
                      navigate={navigate}
                    />
                  ))}
                </div>
                {key === 'epiphanies' && member.addendum && (
                  <p className="sp-team-addendum">
                    Addendum: <b>{member.addendum}</b>
                  </p>
                )}
              </div>
            ) : null,
          )}
        </>
      ) : (
        <p className="sp-team-addendum">No build published yet.</p>
      )}

      <RouteLink
        className="wuwa-btn sp-team-link"
        to={`${ARCHIVE}/characters/${member.slug}`}
        navigate={navigate}
      >
        {member.has_build ? 'Full build' : 'Character page'} {'\u2192'}
      </RouteLink>
    </div>
  )
}

export default function SilverPalaceTeams({ navigate }) {
  const { data: characters, error, loading } = useRemote('/api/sp-characters')
  const { data: motives } = useRemote('/api/sp-motives')
  const { data: implementsList } = useRemote('/api/sp-implements')
  const { data: epiphanies } = useRemote('/api/sp-epiphanies')
  const { data: catalysts } = useRemote('/api/sp-catalysts')
  const [attribute, setAttribute] = useState('')
  const [teamId, setTeamId] = useState(teams[0].id)
  const [seat, setSeat] = useState(1)

  const bySlug = useMemo(
    () => new Map((characters ?? []).map((character) => [character.slug, character])),
    [characters],
  )
  const icons = useMemo(() => {
    const attributes = new Map()
    const styles = new Map()
    for (const character of characters ?? []) {
      if (character.attribute)
        attributes.set(character.attribute.name, character.attribute.image_url)
      if (character.combat_style)
        styles.set(character.combat_style.name, character.combat_style.image_url)
    }
    return { attributes, styles }
  }, [characters])
  const gear = useMemo(
    () => ({
      motives: indexByName(motives),
      implements: indexByName(implementsList),
      epiphanies: indexByName(epiphanies),
      catalysts: indexByName(catalysts),
    }),
    [motives, implementsList, epiphanies, catalysts],
  )

  const counts = useMemo(
    () =>
      Object.fromEntries(
        ATTRIBUTES.map((name) => [
          name,
          teams.filter((team) => team.members.some((m) => m.attribute === name)).length,
        ]),
      ),
    [],
  )
  const shown = attribute
    ? teams.filter((team) => team.members.some((member) => member.attribute === attribute))
    : teams
  const index = Math.max(
    0,
    shown.findIndex((team) => team.id === teamId),
  )
  const team = shown[index]
  const member = team.members.find((m) => m.seat === seat) ?? team.members[0]

  const pickTeam = (id) => {
    setTeamId(id)
    setSeat(1)
  }

  if (loading || error || !characters) {
    return (
      <section className="wuwa-section sp-guide">
        <Panel>{loading ? 'Loading teams...' : error || 'Teams could not be loaded.'}</Panel>
      </section>
    )
  }

  return (
    <section className="wuwa-section sp-guide sp-teams" aria-labelledby="sp-teams-title">
      <header className="wuwa-heading">
        <h1 id="sp-teams-title">
          <i aria-hidden="true" /> Silver Palace team compositions
        </h1>
        <span className="wuwa-count" aria-live="polite">
          Showing {shown.length} {shown.length === 1 ? 'team' : 'teams'}
        </span>
      </header>

      <div className="sp-team-filter" role="group" aria-label="Attributes">
        <button
          type="button"
          className={attribute ? '' : 'on'}
          aria-pressed={!attribute}
          onClick={() => setAttribute('')}
        >
          All <small>{teams.length}</small>
        </button>
        {ATTRIBUTES.map((name) => (
          <button
            key={name}
            type="button"
            className={attribute === name ? 'on' : ''}
            aria-pressed={attribute === name}
            onClick={() => setAttribute(attribute === name ? '' : name)}
          >
            {icons.attributes.get(name) && (
              <img src={icons.attributes.get(name)} alt="" width="18" height="18" />
            )}
            {name} <small>{counts[name]}</small>
          </button>
        ))}
      </div>

      <div className="sp-team-layout">
        <nav className="sp-team-list" aria-label="Teams">
          {shown.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === team.id ? 'on' : ''}
              aria-current={item.id === team.id ? 'true' : undefined}
              onClick={() => pickTeam(item.id)}
            >
              <span className="sp-team-num">
                {String(teams.indexOf(item) + 1).padStart(2, '0')}
              </span>
              <span className="sp-team-faces" aria-hidden="true">
                {item.members.map((m) => (
                  <span key={m.seat}>
                    <Art src={bySlug.get(m.slug)?.image_url} name={m.name} />
                  </span>
                ))}
              </span>
              <b>{item.name}</b>
            </button>
          ))}
        </nav>

        <article className="sp-team-detail" aria-live="polite">
          <div className="sp-guide-section-head">
            <h2>
              <span className="sp-team-num">
                {String(teams.indexOf(team) + 1).padStart(2, '0')}
              </span>{' '}
              {team.name}
            </h2>
            <span className="sp-team-steppers">
              <button
                type="button"
                aria-label="Previous team"
                disabled={index === 0}
                onClick={() => pickTeam(shown[index - 1].id)}
              >
                {'\u2039'}
              </button>
              <button
                type="button"
                aria-label="Next team"
                disabled={index === shown.length - 1}
                onClick={() => pickTeam(shown[index + 1].id)}
              >
                {'\u203A'}
              </button>
            </span>
          </div>

          <div className="sp-team-seats" role="group" aria-label="Members">
            {team.members.map((m) => (
              <button
                key={m.seat}
                type="button"
                className={m.seat === member.seat ? 'on' : ''}
                aria-pressed={m.seat === member.seat}
                onClick={() => setSeat(m.seat)}
              >
                <span className="sp-team-seat-art">
                  <Art src={bySlug.get(m.slug)?.image_url} name={m.name} />
                </span>
                <span className="sp-team-seat-text">
                  <small>
                    {m.seat} · {m.role}
                  </small>
                  <b>{m.name}</b>
                </span>
                {icons.attributes.get(m.attribute) && (
                  <img
                    src={icons.attributes.get(m.attribute)}
                    alt={m.attribute}
                    title={m.attribute}
                    width="20"
                    height="20"
                  />
                )}
              </button>
            ))}
          </div>

          <MemberDetail
            key={`${team.id}-${member.seat}`}
            member={member}
            character={bySlug.get(member.slug)}
            icons={icons}
            gear={gear}
            navigate={navigate}
          />

          <div className="sp-team-summary">
            <p className="sp-team-tagline">
              <b>{team.tag}</b>
              {team.tag_note && <span> · {team.tag_note}</span>}
            </p>
            <ul className="sp-team-tags">
              {team.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <p className="sp-guide-text">{team.summary}</p>
            <dl className="sp-team-comp">
              <div>
                <dt>Attributes</dt>
                <dd>
                  {tally(team.members, (m) => m.attribute).map(([name, count]) => (
                    <span key={name}>
                      <Chip name={name} icon={icons.attributes.get(name)} />
                      <b>{count}</b>
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt>Combat Styles</dt>
                <dd>
                  {tally(team.members, (m) => m.combat_style).map(([name, count]) => (
                    <span key={name}>
                      <Chip name={name} icon={icons.styles.get(name)} />
                      <b>{count}</b>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </section>
  )
}
