import React, { useEffect, useState } from 'react'

const MIN_DURATION = 1000
const WIPE_DELAY = 500
const FADE_START = 1400
const REMOVE_AFTER = 2500

function preload(url) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = image.onerror = resolve
    image.src = url
  })
}

// Opening sequence: progress counter and bar, then an accent wipe, then a fade into the page.
export default function Loader({ images, title, slogan, onDone }) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('loading')

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const minDuration = reduceMotion ? 0 : MIN_DURATION
    const start = performance.now()
    let loaded = 0
    let frame
    let finished = false
    const total = images.length + 1

    const assets = [
      ...images.map((url) =>
        preload(url).then(() => {
          loaded += 1
        }),
      ),
      (document.fonts?.ready || Promise.resolve()).then(() => {
        loaded += 1
      }),
    ]
    Promise.all(assets).then(() => {
      finished = true
    })

    function tick(now) {
      const time = Math.min((now - start) / minDuration || 1, 1)
      const real = loaded / total
      const target = Math.min(time, real)
      setProgress((previous) => Math.max(previous, Math.round(target * 100)))
      if (finished && time >= 1) {
        setProgress(100)
        setPhase('leaving')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [images])

  useEffect(() => {
    document.documentElement.classList.add('loader-active')
    return () => document.documentElement.classList.remove('loader-active')
  }, [])

  useEffect(() => {
    if (phase !== 'leaving') return undefined
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(onDone, reduceMotion ? 0 : REMOVE_AFTER)
    return () => clearTimeout(timer)
  }, [phase, onDone])

  return (
    <div
      className={`loader ${phase === 'leaving' ? 'loader-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${progress}%`}
      style={{ '--loader-wipe-delay': `${WIPE_DELAY}ms`, '--loader-fade-delay': `${FADE_START}ms` }}
    >
      <div className="loader-bg" aria-hidden="true" />
      <div className="loader-logo">{title}</div>
      <div className="loader-deco-block">
        <span className="loader-triangles" aria-hidden="true" />
        <div className="loader-divider" />
        <div className="loader-slogan">{slogan}</div>
      </div>
      <div className="loader-progress">
        <div className="loader-bar" style={{ '--loader-progress': progress / 100 }} />
        <div className="loader-text">
          <div className="loader-core">
            <span className="loader-value">{progress}</span>
            <span className="loader-symbol">%</span>
          </div>
          <div className="loader-status">Loading...</div>
        </div>
      </div>
    </div>
  )
}
