import React, { useEffect, useRef, useState } from 'react'
import {
  BUILD_STATS,
  ELEMENT_COLORS,
  SKILL_KINDS,
  buildIssues,
  calculateBuildStats,
  critValue,
  echoCost,
  emptyBuild,
  emptyEcho,
  levelKey,
  resolvedBuildStats,
  selectedPreset,
  sonataCounts,
  statLabel,
  statValue,
} from './wuwa-build.js'
import WuwaBuildPicker, { BuildArt } from './WuwaBuildPicker.jsx'
import { renderBuildCard } from './wuwa-build-card.js'
import './wuwa-build.css'

async function getData(query, signal) {
  const response = await fetch(`/api/wuwa-builder${query}`, { signal })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(
      'Builder service is unavailable. Restart the server or redeploy the latest build.',
    )
  }
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || `Builder service returned ${response.status}`)
  return body
}
function useData(query, reload) {
  const [state, setState] = useState({ query: null, loading: true, data: null, error: '' })
  useEffect(() => {
    if (query === null) {
      setState({ query, loading: false, data: null, error: '' })
      return undefined
    }
    const controller = new AbortController()
    setState({ query, loading: true, data: null, error: '' })
    getData(query, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ query, loading: false, data, error: '' })
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({ query, loading: false, data: null, error: error.message })
      },
    )
    return () => controller.abort()
  }, [query, reload])
  return state.query === query ? state : { loading: query !== null, data: null, error: '' }
}
function Field({ label, children, className = '' }) {
  return (
    <label className={`build-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}
function NumberInput({ label, value, onChange, disabled, placeholder, percent = false }) {
  return (
    <span className="build-number">
      <input
        aria-label={label}
        type="number"
        min={0}
        step={percent ? '0.1' : '1'}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value
          if (next === '' || (Number.isFinite(Number(next)) && Number(next) >= 0)) onChange(next)
        }}
      />
      {percent && <span aria-hidden="true">%</span>}
    </span>
  )
}
function LevelSelect({ label, rows, value, onChange }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {!value && <option value="">Choose level</option>}
        {rows.map((row) => (
          <option key={levelKey(row)} value={levelKey(row)}>
            Lv. {row.level} / Asc. {row.ascension}
          </option>
        ))}
      </select>
    </Field>
  )
}
function LoadError({ state, onRetry }) {
  if (state.loading)
    return (
      <p className="build-hint" role="status">
        Loading reference data...
      </p>
    )
  if (state.error)
    return (
      <div className="build-warning" role="alert">
        <p>{state.error}</p>
        <button className="build-button" onClick={onRetry}>
          Retry data
        </button>
      </div>
    )
  return null
}

function EchoSlot({ slot, index, catalog, onPick, onChange }) {
  const echo = catalog.echoes.find((row) => row.slug === slot.slug)
  const preset = selectedPreset(catalog, slot)
  const mainStats = preset?.stats.filter((stat) => !stat.fixed) ?? []
  const main = mainStats.find((stat) => stat.stat === slot.main)
  const fixed = preset?.stats.find((stat) => stat.fixed)
  const cap = Number(slot.rarity) === 2 ? 0 : Math.floor(Number(slot.level) / 5)
  function changeLevel(rarity, level) {
    const limit = rarity === 2 ? 0 : Math.floor(level / 5)
    onChange({
      ...slot,
      rarity,
      level,
      substats: slot.substats.map((row, i) => (i < limit ? row : { id: '', value: '' })),
    })
  }
  return (
    <article
      className={`build-echo-slot ${echo ? 'equipped' : ''}`}
      aria-label={`Echo slot ${index + 1}`}
    >
      <div className="build-slot-top">
        <span>{index === 0 ? '01 / ACTIVE ECHO' : `0${index + 1} / ECHO`}</span>
        {echo && (
          <button
            className="build-text-button"
            aria-label={`Remove Echo ${index + 1}`}
            onClick={() => onChange(emptyEcho())}
          >
            Remove
          </button>
        )}
      </div>
      <button
        className="build-echo-pick"
        onClick={onPick}
        aria-label={`${echo ? 'Change' : 'Select'} Echo ${index + 1}`}
      >
        {echo ? (
          <>
            <BuildArt src={echo.image_url} />
            <span>
              <strong>{echo.name}</strong>
              <small>{echo.cost} COST / Change echo</small>
            </span>
          </>
        ) : (
          <>
            <span className="build-slot-plus" aria-hidden="true">
              +
            </span>
            <strong>Select an echo</strong>
            <small>Browse, filter & equip</small>
          </>
        )}
      </button>
      {echo && (
        <>
          <Field label={`Echo ${index + 1} sonata`}>
            <select
              value={slot.sonata}
              onChange={(event) => onChange({ ...slot, sonata: event.target.value })}
            >
              {!slot.sonata && <option value="">Select a sonata</option>}
              {echo.sonata_effects.map((set) => (
                <option key={set.slug} value={set.slug}>
                  {set.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="build-fields two">
            <Field label={`Echo ${index + 1} rarity`}>
              <select
                value={slot.rarity}
                onChange={(event) => {
                  const rarity = Number(event.target.value)
                  changeLevel(rarity, Math.min(Number(slot.level), rarity * 5))
                }}
              >
                {[2, 3, 4, 5].map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity} stars
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Echo ${index + 1} level`}>
              <select
                value={slot.level}
                onChange={(event) => changeLevel(Number(slot.rarity), Number(event.target.value))}
              >
                {Array.from({ length: Number(slot.rarity) * 5 + 1 }, (_, level) => (
                  <option key={level} value={level}>
                    +{level}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="build-main-stat">
            <Field label={`Echo ${index + 1} main stat`}>
              <select
                value={slot.main}
                onChange={(event) => onChange({ ...slot, main: event.target.value })}
              >
                <option value="">Choose main stat</option>
                {mainStats.map((stat) => (
                  <option key={stat.stat} value={stat.stat}>
                    {statLabel(stat)}
                  </option>
                ))}
              </select>
            </Field>
            <strong>{main ? statValue(main.value, main.unit === 'percent') : '\u2014'}</strong>
            <small>
              {fixed ? `+${fixed.value} ${fixed.stat} / fixed` : 'Fixed stat unavailable'}
            </small>
          </div>
          <div className="build-roll-heading">
            <span>TUNED SUBSTATS</span>
            <span>{critValue([slot])} CV</span>
          </div>
          <div className="build-rolls">
            {slot.substats.map((roll, i) => {
              const definition = catalog.rules.echo_substats.find(
                (stat) => String(stat.property_id) === roll.id,
              )
              return (
                <div className="build-roll" key={i}>
                  <select
                    aria-label={`Echo ${index + 1} substat ${i + 1}`}
                    value={roll.id}
                    disabled={i >= cap}
                    onChange={(event) =>
                      onChange({
                        ...slot,
                        substats: slot.substats.map((row, n) =>
                          n === i ? { id: event.target.value, value: '' } : row,
                        ),
                      })
                    }
                  >
                    <option value="">{i >= cap ? 'Locked by level' : '+ Add substat'}</option>
                    {catalog.rules.echo_substats.map((stat) => (
                      <option
                        key={stat.property_id}
                        value={stat.property_id}
                        disabled={slot.substats.some(
                          (other, n) => n !== i && other.id === String(stat.property_id),
                        )}
                      >
                        {statLabel(stat)}
                      </option>
                    ))}
                  </select>
                  <NumberInput
                    label={`Echo ${index + 1} roll ${i + 1}`}
                    value={roll.value}
                    placeholder="Roll"
                    disabled={!roll.id || i >= cap}
                    percent={definition?.unit === 'percent'}
                    onChange={(value) =>
                      onChange({
                        ...slot,
                        substats: slot.substats.map((row, n) =>
                          n === i ? { ...row, value } : row,
                        ),
                      })
                    }
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </article>
  )
}

export default function WuwaBuildShow() {
  const [reload, setReload] = useState(0)
  const [build, setBuild] = useState(emptyBuild)
  const [picker, setPicker] = useState(null)
  const [adjustStats, setAdjustStats] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const exportLock = useRef(false)
  const catalogState = useData('', reload)
  const characterState = useData(
    build.character ? `?character=${encodeURIComponent(build.character)}` : null,
    reload,
  )
  const weaponState = useData(
    build.weapon ? `?weapon=${encodeURIComponent(build.weapon)}` : null,
    reload,
  )
  const catalog = catalogState.data
  const character = catalog?.characters.find((row) => row.slug === build.character)
  const variants = characterState.data?.variants ?? []
  const reference = variants.find((row) => String(row.game_id) === build.variant) ?? variants[0]
  const weapon = catalog?.weapons.find((row) => row.slug === build.weapon)
  const weaponReference = weaponState.data
  const asset = (path) => (path ? `${catalog.image_base}${path}` : null)
  function patch(changes) {
    setBuild((current) => ({ ...current, ...changes }))
    setExportMessage('')
  }
  function changeEcho(index, value) {
    patch({ echoes: build.echoes.map((row, i) => (i === index ? value : row)) })
  }
  useEffect(() => {
    if (!reference) return
    setBuild((current) => ({
      ...current,
      variant: String(reference.game_id),
      characterLevel: current.characterLevel || levelKey(reference.level_stats.at(-1)),
    }))
  }, [reference])
  useEffect(() => {
    if (!weaponReference) return
    setBuild((current) => ({
      ...current,
      weaponLevel: current.weaponLevel || levelKey(weaponReference.level_stats.at(-1)),
    }))
  }, [weaponReference])
  function selectItem(row) {
    if (picker.type === 'character') {
      if (row.slug !== build.character) {
        patch({
          ...emptyBuild(),
          character: row.slug,
          name: build.name,
          uid: build.uid,
          echoes: build.echoes,
          ...(character?.weapon_type === row.weapon_type
            ? {
                weapon: build.weapon,
                weaponLevel: build.weaponLevel,
                rank: build.rank,
              }
            : {}),
        })
        setAdjustStats(false)
      }
    } else if (picker.type === 'weapon') {
      if (row.slug !== build.weapon) patch({ weapon: row.slug, weaponLevel: '', rank: 1 })
    } else if (row.slug !== build.echoes[picker.index].slug) {
      changeEcho(picker.index, {
        ...emptyEcho(),
        slug: row.slug,
        sonata: row.sonata_effects[0]?.slug ?? '',
      })
    }
    setPicker(null)
  }
  const calculation =
    catalog && reference
      ? calculateBuildStats({ build, catalog, character, reference, weaponReference })
      : null
  const totals = calculation ? resolvedBuildStats(build, calculation.stats) : {}
  const issues = catalog ? buildIssues(build, catalog) : []
  const ready = Boolean(
    reference && build.characterLevel && weaponReference && build.weaponLevel && !issues.length,
  )
  async function exportCard(copy) {
    if (!ready || exportLock.current) return
    exportLock.current = true
    setExporting(true)
    setExportMessage('')
    try {
      if (copy && (!navigator.clipboard?.write || !window.ClipboardItem))
        throw new Error('Image copying is not supported here. Use Export PNG instead.')
      // Hand the clipboard a promise during the click gesture; rendering happens
      // only for export, never as the interactive page.
      const blob = renderBuildCard({
        catalog,
        build: { ...build, stats: totals },
        character,
        reference,
        weapon,
        weaponReference,
      }).then(
        (canvas) =>
          new Promise((resolve, reject) =>
            canvas.toBlob(
              (value) =>
                value ? resolve(value) : reject(new Error('Could not create the showcase image.')),
              'image/png',
            ),
          ),
      )
      if (copy) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setExportMessage('Showcase image copied.')
      } else {
        const url = URL.createObjectURL(await blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `IamUV-${build.character}-build.png`
        document.body.append(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 10000)
        setExportMessage('Showcase PNG downloaded.')
      }
    } catch (error) {
      setExportMessage(`Export failed: ${error.message}`)
    } finally {
      exportLock.current = false
      setExporting(false)
    }
  }
  if (catalogState.loading || catalogState.error)
    return (
      <section className="wuwa-section build-show">
        <h1>Build/Show</h1>
        <LoadError state={catalogState} onRetry={() => setReload((value) => value + 1)} />
      </section>
    )
  const cost = echoCost(build.echoes, catalog.echoes)
  const sets = sonataCounts(build.echoes, catalog.echoes)
  const overrides = BUILD_STATS.filter(({ key }) => build.stats[key] !== '').length
  return (
    <section
      className="wuwa-section build-show"
      style={{ '--build-color': ELEMENT_COLORS[character?.element] ?? '#69c5ed' }}
      aria-labelledby="build-show-title"
    >
      <header className="build-page-heading">
        <div>
          <p className="build-kicker">YOUR RESONATOR. YOUR BUILD.</p>
          <h1 id="build-show-title">
            Build<span>/</span>Show
          </h1>
          <p>Tap the artwork to choose. Fine-tune your loadout right here.</p>
        </div>
        <div className="build-export">
          <button
            className="build-button"
            disabled={!ready || exporting}
            onClick={() => exportCard(true)}
          >
            Copy image
          </button>
          <button
            className="build-button primary"
            disabled={!ready || exporting}
            onClick={() => exportCard(false)}
          >
            {exporting ? 'Creating image...' : 'Export PNG \u2197'}
          </button>
        </div>
      </header>
      <p
        className={
          exportMessage.startsWith('Export failed') ? 'build-warning' : 'build-export-status'
        }
        role={exportMessage.startsWith('Export failed') ? 'alert' : 'status'}
      >
        {exportMessage}
      </p>
      <div className="build-stage">
        <div className="build-character-column">
          <button
            className={`build-resonator-art ${character ? 'has-character' : ''}`}
            onClick={() => setPicker({ type: 'character' })}
            aria-label={character ? `Change Resonator: ${character.name}` : 'Select Resonator'}
          >
            {character ? (
              <>
                <BuildArt src={asset(reference?.portrait_path) || character.image_url} />
                <span className="build-art-caption">
                  <small>
                    {character.element} / {character.weapon_type}
                  </small>
                  <strong>{character.name}</strong>
                  <span>
                    Change Resonator <b aria-hidden="true">+</b>
                  </span>
                </span>
              </>
            ) : (
              <span className="build-resonator-empty">
                <span aria-hidden="true" className="build-slot-plus">
                  +
                </span>
                <strong>Choose your Resonator</strong>
                <small>Open the character gallery</small>
              </span>
            )}
          </button>
          <div className="build-weapon-panel">
            <button
              className="build-weapon-pick"
              disabled={!reference}
              onClick={() => setPicker({ type: 'weapon' })}
              aria-label={weapon ? `Change weapon: ${weapon.name}` : 'Select weapon'}
            >
              <span>
                <small>WEAPON / {character?.weapon_type ?? 'SELECT RESONATOR FIRST'}</small>
                <strong>{weapon?.name ?? 'Equip a weapon'}</strong>
                <span>{weapon ? 'Change weapon +' : 'Browse compatible weapons +'}</span>
              </span>
              {weapon && <BuildArt src={weapon.image_url} />}
            </button>
            {build.weapon && (
              <LoadError state={weaponState} onRetry={() => setReload((value) => value + 1)} />
            )}
            {weaponReference && (
              <>
                <div className="build-fields two">
                  <LevelSelect
                    label="Weapon level"
                    rows={weaponReference.level_stats}
                    value={build.weaponLevel}
                    onChange={(value) => patch({ weaponLevel: value })}
                  />
                  <Field label="Syntony rank">
                    <select
                      value={build.rank}
                      onChange={(event) => patch({ rank: Number(event.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((rank) => (
                        <option key={rank} value={rank}>
                          Rank {rank}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="build-weapon-values">
                  {(() => {
                    const level = weaponReference.level_stats.find(
                      (row) => levelKey(row) === build.weaponLevel,
                    )
                    return (
                      <>
                        <span>
                          ATK <b>{statValue(level?.atk)}</b>
                        </span>
                        <span>
                          {weaponReference.sub_stat}{' '}
                          <b>{statValue(level?.sub_value, weaponReference.sub_is_percent)}</b>
                        </span>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="build-details-column">
          <div className="build-identity">
            <div>
              <p className="build-kicker">
                {character
                  ? `${character.element.toUpperCase()} / ${character.rarity} STARS`
                  : 'START WITH A RESONATOR'}
              </p>
              <h2>{character?.name ?? 'An empty canvas. Endless possibilities.'}</h2>
            </div>
            {reference && (
              <LevelSelect
                label="Resonator level"
                rows={reference.level_stats}
                value={build.characterLevel}
                onChange={(value) => patch({ characterLevel: value })}
              />
            )}
          </div>
          {build.character && (
            <LoadError state={characterState} onRetry={() => setReload((value) => value + 1)} />
          )}
          {variants.length > 1 && (
            <Field label="Artwork variant">
              <select
                value={build.variant}
                onChange={(event) => patch({ variant: event.target.value, characterLevel: '' })}
              >
                {variants.map((row, index) => (
                  <option key={row.game_id} value={row.game_id}>
                    Variant {index + 1}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {reference ? (
            <>
              <div className="build-stat-panel">
                <div className="build-panel-heading">
                  <h3>Equipment totals</h3>
                  <button
                    className="build-text-button"
                    aria-expanded={adjustStats}
                    onClick={() => setAdjustStats((value) => !value)}
                  >
                    {adjustStats ? 'Done editing' : 'Adjust totals'}
                    {overrides ? ` (${overrides})` : ''}
                  </button>
                </div>
                <p className="build-hint">
                  Calculated from level, weapon, echoes & selected minor fortes.{' '}
                  {weaponState.loading
                    ? 'Weapon values are loading.'
                    : 'Totals update as you build.'}
                </p>
                <div className="build-stats-grid">
                  {BUILD_STATS.map((stat) => {
                    const label =
                      stat.key === 'element' ? `${character.element} DMG Bonus` : stat.label
                    const icon =
                      stat.key === 'element'
                        ? reference.element_icon_path
                        : catalog.rules.stat_definitions.find((row) => row.id === stat.id)
                            ?.icon_path
                    return (
                      <div
                        className={`build-stat-row ${build.stats[stat.key] !== '' ? 'overridden' : ''}`}
                        key={stat.key}
                      >
                        <BuildArt src={asset(icon)} />
                        <span>
                          {label}
                          {build.stats[stat.key] !== '' && <small>Custom total</small>}
                        </span>
                        {adjustStats ? (
                          <NumberInput
                            label={`${label} override`}
                            value={build.stats[stat.key]}
                            percent={stat.percent}
                            placeholder={
                              calculation.stats[stat.key] == null
                                ? '\u2014'
                                : String(calculation.stats[stat.key])
                            }
                            onChange={(value) =>
                              patch({ stats: { ...build.stats, [stat.key]: value } })
                            }
                          />
                        ) : (
                          <output aria-label={`${label} total`}>
                            {statValue(totals[stat.key], stat.percent)}
                          </output>
                        )}
                      </div>
                    )
                  })}
                </div>
                {adjustStats && (
                  <div className="build-adjust-note">
                    <p className="build-hint">
                      Optional: enter an in-game total to replace a calculated value, not add to it.
                      Clear it to return to automatic.
                    </p>
                    <button
                      className="build-text-button"
                      disabled={!overrides}
                      onClick={() => patch({ stats: emptyBuild().stats })}
                    >
                      Reset custom totals
                    </button>
                  </div>
                )}
                <details className="build-calculation-note">
                  <summary>What's included?</summary>
                  <p>
                    Character base stats + weapon base/secondary stats + echo main, fixed and tuned
                    stats. Percent ATK scales character + weapon base ATK; percent HP/DEF scales
                    character base stats. Unlocked minor fortes below are optional. Weapon passives,
                    resonance-chain buffs, sonata bonuses, active echo skills and combat buffs are
                    not applied automatically. Use Adjust totals to match your in-game screen.
                  </p>
                </details>
                {calculation.warnings.map((warning) => (
                  <p key={warning} className="build-warning" role="alert">
                    {warning}
                  </p>
                ))}
              </div>
              <div className="build-forte-panel">
                <div className="build-panel-heading">
                  <h3>Forte & resonance</h3>
                  <span className="build-hint">Click a chain to unlock</span>
                </div>
                <div className="build-chain">
                  {reference.sequences.map((node) => (
                    <button
                      key={node.node}
                      className={node.node <= build.chain ? 'unlocked' : ''}
                      aria-label={`Resonance chain ${node.node}: ${node.name}`}
                      aria-pressed={node.node <= build.chain}
                      title={node.name}
                      onClick={() => patch({ chain: build.chain === node.node ? 0 : node.node })}
                    >
                      <BuildArt src={asset(node.icon_path)} />
                      <span>S{node.node}</span>
                    </button>
                  ))}
                </div>
                <div className="build-skills">
                  {SKILL_KINDS.map((kind, index) => (
                    <Field label={kind} key={kind} className="build-skill">
                      <BuildArt
                        src={asset(reference.skills.find((row) => row.kind === kind)?.icon_path)}
                      />
                      <select
                        aria-label={`${kind} level`}
                        value={build.skills[index]}
                        onChange={(event) =>
                          patch({
                            skills: build.skills.map((row, i) =>
                              i === index ? Number(event.target.value) : row,
                            ),
                          })
                        }
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            Lv. {i + 1}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
                {character.minor_fortes?.length > 0 && (
                  <div className="build-minor-fortes">
                    <span className="build-hint">Minor fortes / full stat branches</span>
                    {character.minor_fortes.map((forte, index) => (
                      <label key={index}>
                        <input
                          type="checkbox"
                          checked={build.minorFortes.includes(index)}
                          onChange={(event) =>
                            patch({
                              minorFortes: event.target.checked
                                ? [...build.minorFortes, index]
                                : build.minorFortes.filter((item) => item !== index),
                            })
                          }
                        />
                        {forte.stat} +{forte.value}
                        {forte.stat.includes('%') || !['HP', 'ATK', 'DEF'].includes(forte.stat)
                          ? '%'
                          : ''}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <details className="build-player">
                <summary>
                  Personalize your export <span>Optional name & UID</span>
                </summary>
                <div className="build-fields two">
                  <Field label="Display name">
                    <input
                      maxLength={32}
                      placeholder="Your name"
                      value={build.name}
                      onChange={(event) => patch({ name: event.target.value })}
                    />
                  </Field>
                  <Field label="UID">
                    <input
                      inputMode="numeric"
                      maxLength={20}
                      placeholder="Your UID"
                      value={build.uid}
                      onChange={(event) => patch({ uid: event.target.value.replace(/\D/g, '') })}
                    />
                  </Field>
                </div>
              </details>
            </>
          ) : (
            !build.character && (
              <div className="build-get-started">
                <span className="build-kicker">01 SELECT / 02 EQUIP / 03 REFINE / 04 EXPORT</span>
                <h3>Build visually, not through a form.</h3>
                <p>
                  Choose your character from the portrait panel, equip a weapon, then click any echo
                  slot below. Reference stats fill themselves in; only your tuned rolls need typing.
                </p>
                <button
                  className="build-button primary"
                  onClick={() => setPicker({ type: 'character' })}
                >
                  Browse Resonators
                </button>
              </div>
            )
          )}
        </div>
      </div>
      <section className="build-loadout" aria-labelledby="build-echo-title">
        <div className="build-loadout-heading">
          <div>
            <p className="build-kicker">FIVE SLOTS. MAKE THEM COUNT.</p>
            <h2 id="build-echo-title">Echo loadout</h2>
          </div>
          <div className="build-loadout-metrics">
            <span className={cost > 12 ? 'over-budget' : ''}>
              COST{' '}
              <b>
                {cost}
                <small> / 12</small>
              </b>
            </span>
            <span>
              ECHO CV <b>{critValue(build.echoes)}</b>
            </span>
          </div>
        </div>
        <div className="build-set-summary">
          {sets.length ? (
            sets.map((set) => {
              const sonata = catalog.sonatas.find((row) => row.slug === set.slug)
              return (
                <span key={set.slug}>
                  <BuildArt src={sonata?.image_url} />
                  {sonata?.name ?? set.slug}
                  <b>{set.count} pc</b>
                </span>
              )
            })
          ) : (
            <p className="build-hint">Your sonata sets will appear here as you equip echoes.</p>
          )}
        </div>
        <div className="build-echo-slots">
          {build.echoes.map((slot, index) => (
            <EchoSlot
              key={index}
              slot={slot}
              index={index}
              catalog={catalog}
              onPick={() => setPicker({ type: 'echo', index })}
              onChange={(value) => changeEcho(index, value)}
            />
          ))}
        </div>
        <p className="build-hint">
          Main stats fill automatically after selection. Enter your actual tuned rolls in each card.
          Duplicate echoes count once toward sonata pieces. Echo CV counts tuned crit rolls only.
        </p>
      </section>
      {issues.length > 0 && (
        <div className="build-warning" role="alert">
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
      <footer className="build-page-footer">
        <p>
          Private, on-page draft. Nothing is sent to your game account or saved on our server.
          Download before leaving.
        </p>
        <div className="build-export">
          <span>
            {!ready
              ? 'Choose a Resonator & weapon, then complete equipped echo stats.'
              : 'Ready to show your build. Image is generated only on export.'}
          </span>
          <button
            className="build-button primary"
            disabled={!ready || exporting}
            onClick={() => exportCard(false)}
          >
            {exporting ? 'Creating image...' : 'Export PNG \u2197'}
          </button>
        </div>
      </footer>
      {picker && (
        <WuwaBuildPicker
          key={`${picker.type}-${picker.index ?? ''}`}
          picker={picker}
          catalog={catalog}
          build={build}
          character={character}
          onSelect={selectItem}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  )
}
