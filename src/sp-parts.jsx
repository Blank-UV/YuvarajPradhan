// Small pieces shared by the Silver Palace character and motive pages.
import React, { useState } from 'react'

export const ARCHIVE = '/silver-palace/archives'
export const numberFormat = new Intl.NumberFormat('en-US')

export function Art({ src, name }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span className="wuwa-art-fallback" aria-hidden="true">
        {name.charAt(0)}
      </span>
    )
  }
  return <img src={src} alt="" loading="lazy" draggable="false" onError={() => setFailed(true)} />
}

export function TraitIcon({ trait }) {
  if (!trait?.image_url) return null
  return <img className="sp-trait-icon" src={trait.image_url} alt="" loading="lazy" />
}

// Slider over a list of published steps (character levels, skill levels, motive ranks).
export function LevelSlider({ label, levels, index, onChange, unit = 'Lv.' }) {
  const level = levels[index]
  return (
    <div className="sp-slider">
      <div className="sp-slider-head">
        <span>{label}</span>
        <b>
          {unit} {level}
        </b>
      </div>
      <input
        type="range"
        min={0}
        max={levels.length - 1}
        step={1}
        value={index}
        aria-label={label}
        aria-valuetext={`${unit} ${level}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="sp-slider-ticks" role="group" aria-label={`${label} levels`}>
        {levels.map((value, position) => (
          <button
            key={value}
            type="button"
            className={position === index ? 'on' : ''}
            aria-pressed={position === index}
            onClick={() => onChange(position)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
