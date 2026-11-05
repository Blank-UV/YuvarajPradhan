import React, { useEffect, useState } from 'react'
import { preloadData } from './archive-kit.jsx'
import './archive-loader.css'

const MIN_DURATION = 1400
const MAX_DURATION = 7000
const LEAVE_MS = 1200
const BARS = 36

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The opening sequence runs once per browser session for each game and never for reduced motion.
export function shouldShowArchiveLoader(key) {
  if (reducedMotion()) return false
  try {
    return window.sessionStorage.getItem(`archive-loader:${key}`) !== 'done'
  } catch {
    return true
  }
}

export function markArchiveLoaderShown(key) {
  try {
    window.sessionStorage.setItem(`archive-loader:${key}`, 'done')
  } catch {
    // storage unavailable: the sequence simply plays again next time
  }
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = image.onerror = resolve
    image.src = url
  })
}

// Progress follows the real work: the archive data requests and the hero image. Failed requests
// count as finished (the pages show their own error), and a time limit keeps it from hanging.
export default function ArchiveLoader({
  variant,
  storageKey,
  title,
  eyebrow,
  status,
  urls,
  images,
  onDone,
}) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('loading')

  useEffect(() => {
    const start = performance.now()
    let loaded = 0
    let finished = false
    let frame
    const jobs = [...urls.map(preloadData), ...images.map(preloadImage)]
    jobs.forEach((job) =>
      job.then(() => {
        loaded += 1
      }),
    )
    Promise.all(jobs).then(() => {
      finished = true
    })

    // The shown value eases toward the real progress, so it glides instead of jumping when a
    // request finishes.
    let shown = 0
    let last = start
    function tick(now) {
      const elapsed = now - start
      const time = Math.min(elapsed / MIN_DURATION, 1)
      const real = jobs.length ? loaded / jobs.length : 1
      const timedOut = elapsed >= MAX_DURATION
      const target = timedOut || (finished && time >= 1) ? 100 : Math.min(time, real) * 99
      shown += (target - shown) * (1 - Math.exp(-(now - last) / 220))
      last = now
      if (target === 100 && shown > 99.4) {
        setProgress(100)
        setPhase('leaving')
        return
      }
      setProgress((previous) => Math.max(previous, shown))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [urls, images])

  useEffect(() => {
    document.documentElement.classList.add('arc-loader-active')
    return () => document.documentElement.classList.remove('arc-loader-active')
  }, [])

  useEffect(() => {
    if (phase !== 'leaving') return undefined
    const timer = setTimeout(() => {
      markArchiveLoaderShown(storageKey)
      onDone()
    }, LEAVE_MS)
    return () => clearTimeout(timer)
  }, [phase, storageKey, onDone])

  const lit = (progress / 100) * BARS
  const percent = Math.round(progress)

  return (
    <div
      className={`arc-loader arc-${variant}${phase === 'leaving' ? ' arc-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${percent}%`}
    >
      {variant === 'sp' && (
        <>
          <div className="arc-half arc-half-top" aria-hidden="true" />
          <div className="arc-half arc-half-bottom" aria-hidden="true" />
        </>
      )}
      <div className="arc-stage" aria-hidden="true">
        {variant === 'wuwa' ? (
          <>
            <span className="arc-ring" />
            <span className="arc-ring" />
            <span className="arc-ring" />
          </>
        ) : (
          <>
            <span className="arc-diamond" />
            <span className="arc-frame">
              <i className="arc-corner arc-corner-tl" />
              <i className="arc-corner arc-corner-tr" />
              <i className="arc-corner arc-corner-bl" />
              <i className="arc-corner arc-corner-br" />
            </span>
          </>
        )}
      </div>

      <div className="arc-center">
        <p className="arc-eyebrow">{eyebrow}</p>
        <h1 className="arc-title">{title}</h1>

        {variant === 'wuwa' ? (
          <div className="arc-wave" aria-hidden="true">
            {Array.from({ length: BARS }, (_, index) => (
              <span
                key={index}
                className={index + 1 <= lit ? 'on' : ''}
                style={{ '--i': index, '--h': 0.35 + 0.65 * Math.abs(Math.sin(index * 0.55)) }}
              />
            ))}
          </div>
        ) : (
          <div className="arc-line" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
            <b style={{ left: `${progress}%` }} />
          </div>
        )}

        <div className="arc-count">
          <span>{percent}</span>
          <small>%</small>
        </div>
        <p className="arc-status">{status}</p>
      </div>
    </div>
  )
}
