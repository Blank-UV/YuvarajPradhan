import React, { useEffect, useRef, useState } from 'react'
import { filterEchoes } from './wuwa-catalog.js'
import { ELEMENT_COLORS, echoCost } from './wuwa-build.js'

export function BuildArt({ src, className = '', alt = '', ...props }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (!src || failed)
    return (
      <span
        className={`build-art-missing ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        Artwork unavailable
      </span>
    )
  return (
    <img {...props} className={className} src={src} alt={alt} onError={() => setFailed(true)} />
  )
}

function Chips({ label, options, value, onChange }) {
  return (
    <div className="build-picker-chips" role="group" aria-label={label}>
      <span>{label}</span>
      <button type="button" aria-pressed={!value} onClick={() => onChange('')}>
        All
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(value === option ? '' : option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export default function WuwaBuildPicker({ picker, catalog, build, character, onSelect, onClose }) {
  const dialog = useRef(null)
  const searchInput = useRef(null)
  const [search, setSearch] = useState('')
  const [element, setElement] = useState('')
  const [rarity, setRarity] = useState('')
  const [weaponType, setWeaponType] = useState('')
  const [cost, setCost] = useState('')
  const [echoClass, setEchoClass] = useState('')
  const [sonata, setSonata] = useState('')
  const isEcho = picker.type === 'echo'
  const isCharacter = picker.type === 'character'
  const title = isEcho
    ? `Select Echo ${picker.index + 1}`
    : isCharacter
      ? 'Choose your Resonator'
      : 'Choose your weapon'
  const noun = isEcho ? 'echoes' : isCharacter ? 'Resonators' : 'weapons'
  const current = isEcho
    ? build.echoes[picker.index].slug
    : isCharacter
      ? build.character
      : build.weapon
  const rows = isEcho
    ? filterEchoes(catalog.echoes, {
        search,
        costs: cost ? [cost] : [],
        classes: echoClass ? [echoClass] : [],
        sonata,
      })
    : (isCharacter ? catalog.characters : catalog.weapons).filter(
        (row) =>
          row.name.toLowerCase().includes(search.trim().toLowerCase()) &&
          (!rarity || row.rarity === rarity) &&
          (!isCharacter ||
            ((!element || row.element === element) &&
              (!weaponType || row.weapon_type === weaponType))) &&
          (isCharacter || row.weapon_type === character.weapon_type),
      )
  const sonatas = [
    ...new Set(catalog.echoes.flatMap((echo) => echo.sonata_effects.map((set) => set.name))),
  ].sort()
  const remaining = isEcho
    ? 12 -
      echoCost(
        build.echoes.filter((_, index) => index !== picker.index),
        catalog.echoes,
      )
    : 0
  useEffect(() => {
    const node = dialog.current
    const opener = document.activeElement
    node.showModal()
    searchInput.current.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      node.close()
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
    }
  }, [])
  function reset() {
    setSearch('')
    setElement('')
    setRarity('')
    setWeaponType('')
    setCost('')
    setEchoClass('')
    setSonata('')
  }
  return (
    <dialog
      ref={dialog}
      className="build-picker"
      aria-labelledby="build-picker-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="build-picker-header">
        <div>
          <p className="build-kicker">BUILD YOUR LOADOUT</p>
          <h2 id="build-picker-title">{title}</h2>
          <p>
            {isEcho
              ? `${remaining} cost remaining for this slot. Select a card to equip it.`
              : isCharacter
                ? 'Select a portrait to start. Equipment values fill in automatically.'
                : `${character.weapon_type} weapons only. Select a card to equip it.`}
          </p>
        </div>
        <button
          className="build-button"
          type="button"
          onClick={onClose}
          aria-label="Close selection"
        >
          Close <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="build-picker-filters">
        <label className="build-field">
          <span className="sr-only">Search {noun}</span>
          <input
            ref={searchInput}
            type="search"
            placeholder={`Search ${noun}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {isEcho ? (
          <>
            <Chips label="Cost" options={[1, 3, 4]} value={cost} onChange={setCost} />
            <Chips
              label="Class"
              options={['Calamity', 'Overlord', 'Elite', 'Common']}
              value={echoClass}
              onChange={setEchoClass}
            />
            <label className="build-field">
              <span className="sr-only">Sonata effect</span>
              <select value={sonata} onChange={(event) => setSonata(event.target.value)}>
                <option value="">All sonata effects</option>
                {sonatas.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            {isCharacter && (
              <>
                <Chips
                  label="Element"
                  options={Object.keys(ELEMENT_COLORS)}
                  value={element}
                  onChange={setElement}
                />
                <label className="build-field">
                  <span className="sr-only">Weapon type</span>
                  <select
                    value={weaponType}
                    onChange={(event) => setWeaponType(event.target.value)}
                  >
                    <option value="">All weapon types</option>
                    {[...new Set(catalog.characters.map((row) => row.weapon_type))]
                      .sort()
                      .map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                  </select>
                </label>
              </>
            )}
            <Chips
              label="Rarity"
              options={isCharacter ? [4, 5] : [1, 2, 3, 4, 5]}
              value={rarity}
              onChange={setRarity}
            />
          </>
        )}
        <button className="build-text-button" type="button" onClick={reset}>
          Reset filters
        </button>
      </div>
      <div className="build-picker-results">
        <p className="build-hint" role="status">
          {rows.length} {noun}
          {isEcho && ' / Over-budget choices are marked, not hidden.'}
        </p>
        {!rows.length && (
          <div className="build-no-results">
            <h3>No matches</h3>
            <p>Try a different search or reset your filters.</p>
            <button className="build-button" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
        <div className={`build-picker-grid ${isCharacter ? 'characters' : ''}`}>
          {rows.map((row) => (
            <button
              type="button"
              key={row.slug}
              className={`build-pick-card ${row.slug === current ? 'selected' : ''}`}
              style={{ '--pick-color': ELEMENT_COLORS[row.element] ?? 'var(--build-color)' }}
              aria-label={`Select ${row.name}`}
              aria-pressed={row.slug === current}
              onClick={() => onSelect(row)}
            >
              <span className="build-pick-art">
                <BuildArt src={row.image_url} loading="lazy" />
              </span>
              <strong>{row.name}</strong>
              <span className="build-pick-meta">
                {isEcho
                  ? `${row.cost} COST / ${row.class ?? 'Echo'}`
                  : `${row.rarity} stars / ${isCharacter ? row.element : row.weapon_type}`}
              </span>
              {isEcho && (
                <span className="build-pick-sets">
                  {row.sonata_effects.map((set) => (
                    <BuildArt
                      key={set.slug}
                      src={catalog.sonatas.find((item) => item.slug === set.slug)?.image_url}
                      title={set.name}
                    />
                  ))}
                </span>
              )}
              {isEcho && row.cost > remaining && (
                <span className="build-pick-budget">Over budget by {row.cost - remaining}</span>
              )}
              <span className="build-pick-action">
                {row.slug === current ? 'Equipped' : 'Select + '}
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
