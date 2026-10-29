import React, { useEffect, useRef } from 'react'
import { feature } from 'topojson-client'
import landData from 'world-atlas/land-110m.json'
import { startLaunch, CONVERGE_SECONDS } from './launchEffect.js'

const MAP_W = 720
const MAP_H = 360
const POINT_COUNT = 9000
const AUTO_SPEED = 0.0035
const HOVER_SPEED = 0.0008
const DEG = Math.PI / 180
const HUES = [350, 215, 140, 48, 280, 28, 175]
const RETURN_SECONDS = 1.1

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp01 = (v) => Math.max(0, Math.min(1, v))

const CITIES = {
  mumbai: [19.07, 72.87],
  tokyo: [35.68, 139.69],
  london: [51.5, -0.12],
  newYork: [40.71, -74.0],
  sydney: [-33.86, 151.2],
  saoPaulo: [-23.55, -46.63],
  losAngeles: [34.05, -118.24],
  dubai: [25.2, 55.27],
  singapore: [1.35, 103.82],
  capeTown: [-33.92, 18.42],
}
const ARC_PAIRS = [
  ['mumbai', 'london'],
  ['mumbai', 'tokyo'],
  ['mumbai', 'sydney'],
  ['london', 'newYork'],
  ['newYork', 'losAngeles'],
  ['tokyo', 'losAngeles'],
  ['dubai', 'capeTown'],
  ['singapore', 'saoPaulo'],
  ['newYork', 'saoPaulo'],
]
const ORBITS = [
  { tilt: 1.15, spin: 0.4, scale: 1.32, speed: 0.55, sats: 2, hue: 215 },
  { tilt: -0.7, spin: 2.2, scale: 1.5, speed: -0.38, sats: 1, hue: 330 },
]

function latLonToVec(lat, lon) {
  const la = lat * DEG
  const lo = lon * DEG
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]
}

function buildLandMask() {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  const land = feature(landData, landData.objects.land)
  const project = ([lon, lat]) => [((lon + 180) / 360) * MAP_W, ((90 - lat) / 180) * MAP_H]
  const drawPolygon = (rings) => {
    ctx.beginPath()
    rings.forEach((ring) => {
      ring.forEach((point, i) => {
        const [x, y] = project(point)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
    })
    ctx.fill('evenodd')
  }
  const geometries = land.features ? land.features.map((f) => f.geometry) : [land.geometry]
  geometries.forEach((g) => {
    if (g.type === 'Polygon') drawPolygon(g.coordinates)
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(drawPolygon)
  })
  return ctx.getImageData(0, 0, MAP_W, MAP_H).data
}

function buildPoints() {
  const mask = buildLandMask()
  const land = []
  const ocean = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < POINT_COUNT; i++) {
    const y = 1 - (i / (POINT_COUNT - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const lat = Math.asin(y)
    const lon = Math.atan2(x, z)
    const px = Math.min(MAP_W - 1, Math.floor(((lon * 180) / Math.PI + 180) * (MAP_W / 360)))
    const py = Math.min(MAP_H - 1, Math.floor((90 - (lat * 180) / Math.PI) * (MAP_H / 180)))
    const isLand = mask[(py * MAP_W + px) * 4 + 3] > 128
    ;(isLand ? land : ocean).push(x, y, z)
  }
  return { land: new Float32Array(land), ocean: new Float32Array(ocean.slice(0, 3 * 700)) }
}

function buildArcs() {
  return ARC_PAIRS.map(([from, to], index) => {
    const a = latLonToVec(...CITIES[from])
    const b = latLonToVec(...CITIES[to])
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
    const omega = Math.acos(dot)
    const sinOmega = Math.sin(omega) || 1
    const samples = []
    const count = 48
    for (let i = 0; i <= count; i++) {
      const t = i / count
      const wa = Math.sin((1 - t) * omega) / sinOmega
      const wb = Math.sin(t * omega) / sinOmega
      const lift = 1 + Math.sin(Math.PI * t) * 0.22 * (omega / Math.PI + 0.35)
      samples.push([
        (a[0] * wa + b[0] * wb) * lift,
        (a[1] * wa + b[1] * wb) * lift,
        (a[2] * wa + b[2] * wb) * lift,
      ])
    }
    return { samples, a, b, phase: index * 0.37 }
  })
}

// Each glowing point starts where it currently is and flies on its own curved path to the pad.
function buildFlyers(snapshot, padX, padY, cx, cy, radius) {
  const sources = snapshot.map((p) => ({ ...p }))
  while (sources.length < 22) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.sqrt(Math.random()) * radius * 0.95
    sources.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      hue: HUES[Math.floor(Math.random() * HUES.length)],
      size: 2,
    })
  }
  return sources.map((p) => {
    const dx = padX - p.x
    const dy = padY - p.y
    const length = Math.hypot(dx, dy) || 1
    const bend = (0.25 + Math.random() * 0.4) * length * (Math.random() < 0.5 ? -1 : 1)
    return {
      sx: p.x,
      sy: p.y,
      hue: p.hue,
      size: p.size,
      delay: Math.random() * 0.3,
      cpx: p.x + dx * 0.5 + (-dy / length) * bend,
      cpy: p.y + dy * 0.5 + (dx / length) * bend,
    }
  })
}

export default function HoloGlobe({ onActivate, label }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const onActivateRef = useRef(onActivate)
  onActivateRef.current = onActivate

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const points = buildPoints()
    const arcs = buildArcs()
    const state = {
      rotY: 4.2,
      rotX: 0.35,
      velocity: AUTO_SPEED,
      hover: false,
      dragging: false,
      lastX: 0,
      lastY: 0,
      moved: 0,
      launching: false,
      snapshot: [],
      flyers: [],
      launchStart: 0,
      reachAt: 0,
      cancelLaunch: null,
      visible: true,
      size: 0,
      frame: 0,
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      state.size = rect.width
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)

    const observer = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting
    })
    observer.observe(wrap)

    const draw = (time) => {
      state.frame = requestAnimationFrame(draw)
      if (!state.visible) return
      const s = state.size
      const cx = s / 2
      const cy = s / 2
      const accentRgb =
        getComputedStyle(wrap).getPropertyValue('--accent-rgb').trim() || '183, 164, 255'

      const holding = state.launching && !state.reachAt
      if (!state.dragging && !reduceMotion) {
        const target = holding ? 0 : state.hover ? HOVER_SPEED : AUTO_SPEED
        state.velocity += (target - state.velocity) * (holding ? 0.1 : 0.06)
        state.rotY += state.velocity
      }

      const flying = state.launching && !state.reachAt
      const flyU = flying
        ? clamp01((time - state.launchStart) / 1000 / CONVERGE_SECONDS)
        : state.reachAt
          ? 1
          : 0
      let conv = 0
      if (state.launching) {
        if (!state.reachAt) {
          conv = easeInOutCubic(flyU)
        } else {
          const back = (time - state.reachAt) / 1000 / RETURN_SECONDS
          conv = 1 - easeInOutCubic(clamp01(back))
          if (back >= 1) {
            state.launching = false
            state.reachAt = 0
            state.flyers = []
            conv = 0
          }
        }
      }
      const fade = 1 - conv
      const snapshot = []

      const radius = s * 0.34
      const padX = cx
      const padY = cy - radius
      ctx.clearRect(0, 0, s, s)

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.45)
      glow.addColorStop(0, `rgba(${accentRgb}, 0.16)`)
      glow.addColorStop(1, `rgba(${accentRgb}, 0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, s, s)

      const cosY = Math.cos(state.rotY)
      const sinY = Math.sin(state.rotY)
      const cosX = Math.cos(state.rotX)
      const sinX = Math.sin(state.rotX)

      const rotate = (x0, y0, z0) => {
        const x1 = x0 * cosY + z0 * sinY
        const z1 = -x0 * sinY + z0 * cosY
        const y2 = y0 * cosX - z1 * sinX
        const z2 = y0 * sinX + z1 * cosX
        return [cx + x1 * radius, cy - y2 * radius, z2]
      }

      const renderDots = (arr, baseSize, baseAlpha) => {
        for (let i = 0; i < arr.length; i += 3) {
          const [px, py, z2] = rotate(arr[i], arr[i + 1], arr[i + 2])
          const depth = (z2 + 1) / 2
          const alpha = z2 > 0 ? baseAlpha * (0.35 + depth * 0.65) : baseAlpha * 0.16
          const size = baseSize * (0.6 + depth * 0.7)
          ctx.fillStyle = `rgba(${accentRgb}, ${alpha})`
          ctx.fillRect(px - size / 2, py - size / 2, size, size)
        }
      }

      const body = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius)
      body.addColorStop(0, `rgba(${accentRgb}, 0.08)`)
      body.addColorStop(1, `rgba(${accentRgb}, 0.01)`)
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      const ringPoint = (o, angle) => {
        const x = Math.cos(angle) * o.scale
        const z = Math.sin(angle) * o.scale
        const y = z * Math.sin(o.tilt)
        const zz = z * Math.cos(o.tilt)
        const xr = x * Math.cos(o.spin) + zz * Math.sin(o.spin)
        const zr = -x * Math.sin(o.spin) + zz * Math.cos(o.spin)
        return rotate(xr, y, zr)
      }
      const drawRings = (frontPass) => {
        ORBITS.forEach((o) => {
          ctx.lineWidth = 1
          let prev = null
          for (let i = 0; i <= 90; i++) {
            const cur = ringPoint(o, (i / 90) * Math.PI * 2)
            if (prev && prev[2] + cur[2] > 0 === frontPass) {
              ctx.strokeStyle = `hsla(${o.hue}, 90%, 65%, ${(frontPass ? 0.5 : 0.14) * fade})`
              ctx.beginPath()
              ctx.moveTo(prev[0], prev[1])
              ctx.lineTo(cur[0], cur[1])
              ctx.stroke()
            }
            prev = cur
          }
          for (let k = 0; k < o.sats; k++) {
            const angle = (time / 1000) * o.speed + (k * Math.PI * 2) / o.sats
            const [px, py, pz] = ringPoint(o, angle)
            const hue = (o.hue + k * 70) % 360
            if (frontPass && pz > 0) snapshot.push({ x: px, y: py, hue, size: 2.8 })
            if (!state.launching && pz > 0 === frontPass) {
              ctx.fillStyle = `hsla(${hue}, 95%, 68%, ${frontPass ? 1 : 0.35})`
              ctx.fillRect(px - 2.5, py - 2.5, 5, 5)
            }
          }
        })
      }

      drawRings(false)
      renderDots(points.ocean, 1, 0.16)
      renderDots(points.land, 1.5, 0.6)

      arcs.forEach((arc, arcIndex) => {
        const hue = HUES[arcIndex % HUES.length]
        const projected = arc.samples.map((v) => rotate(v[0], v[1], v[2]))
        ctx.lineWidth = 1
        for (let i = 1; i < projected.length; i++) {
          if (projected[i][2] + projected[i - 1][2] < 0) continue
          ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.3 * fade})`
          ctx.beginPath()
          ctx.moveTo(projected[i - 1][0], projected[i - 1][1])
          ctx.lineTo(projected[i][0], projected[i][1])
          ctx.stroke()
        }
        const head = (((time / 2600 + arc.phase) % 1) + 1) % 1
        const headIndex = Math.floor(head * (projected.length - 1))
        if (projected[headIndex][2] > 0) {
          snapshot.push({
            x: projected[headIndex][0],
            y: projected[headIndex][1],
            hue,
            size: 3,
          })
        }
        for (let t = 0; t < 10 && !state.launching; t++) {
          const i = headIndex - t
          if (i < 1 || projected[i][2] < 0) continue
          ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.95 - t * 0.09})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(projected[i - 1][0], projected[i - 1][1])
          ctx.lineTo(projected[i][0], projected[i][1])
          ctx.stroke()
        }
        ;[arc.a, arc.b].forEach((end) => {
          const [px, py, pz] = rotate(end[0], end[1], end[2])
          if (pz < 0) return
          snapshot.push({ x: px, y: py, hue, size: 2.4 })
          if (state.launching) return
          const pulse = 3 + Math.sin(time / 300 + arc.phase * 9) * 1.2
          ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.8)`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(px, py, pulse + 2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = `hsl(${hue}, 100%, 75%)`
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3)
        })
      })

      drawRings(true)
      if (!state.launching) state.snapshot = snapshot

      if (flying) {
        ctx.globalCompositeOperation = 'lighter'
        state.flyers.forEach((f) => {
          const q = clamp01((flyU - f.delay) / (1 - f.delay))
          if (q <= 0 || q >= 1) return
          const at = (e) => {
            const m = 1 - e
            return [
              m * m * f.sx + 2 * m * e * f.cpx + e * e * padX,
              m * m * f.sy + 2 * m * e * f.cpy + e * e * padY,
            ]
          }
          for (let k = 11; k >= 0; k--) {
            const [fx, fy] = at(easeInOutCubic(clamp01(q - k * 0.022)))
            const a = (1 - k / 12) * 0.85
            ctx.fillStyle = `hsla(${f.hue}, 100%, ${k === 0 ? 85 : 68}%, ${a})`
            ctx.beginPath()
            ctx.arc(fx, fy, f.size * (1 - k / 16) + (k === 0 ? 0.8 : 0), 0, Math.PI * 2)
            ctx.fill()
          }
          const [hx, hy] = at(easeInOutCubic(q))
          const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12)
          halo.addColorStop(0, `hsla(${f.hue}, 100%, 70%, 0.5)`)
          halo.addColorStop(1, `hsla(${f.hue}, 100%, 70%, 0)`)
          ctx.fillStyle = halo
          ctx.fillRect(hx - 12, hy - 12, 24, 24)
        })
        ctx.globalCompositeOperation = 'source-over'
      }

      const flare = state.reachAt ? conv : state.launching ? clamp01((flyU - 0.55) / 0.45) : 0
      if (flare > 0) {
        const r = 6 + flare * 24
        const g = ctx.createRadialGradient(padX, padY, 0, padX, padY, r)
        g.addColorStop(0, `rgba(255,255,255,${flare})`)
        g.addColorStop(0.35, `hsla(${(time / 4) % 360}, 100%, 65%, ${flare * 0.7})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(padX - r, padY - r, r * 2, r * 2)
      }
      ctx.strokeStyle = `rgba(${accentRgb}, 0.3)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.005, 0, Math.PI * 2)
      ctx.stroke()
    }
    state.frame = requestAnimationFrame(draw)

    const onDown = (e) => {
      state.dragging = true
      state.moved = 0
      state.lastX = e.clientX
      state.lastY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e) => {
      if (!state.dragging) return
      const dx = e.clientX - state.lastX
      const dy = e.clientY - state.lastY
      state.lastX = e.clientX
      state.lastY = e.clientY
      state.moved += Math.abs(dx) + Math.abs(dy)
      state.rotY += dx * 0.008
      state.rotX = Math.max(-1.1, Math.min(1.1, state.rotX + dy * 0.006))
      state.velocity = dx * 0.008
    }
    const onUp = () => {
      if (!state.dragging) return
      state.dragging = false
      if (state.moved < 6 && !state.launching) {
        const open = () => onActivateRef.current?.()
        if (reduceMotion) {
          open()
          return
        }
        const rect = canvas.getBoundingClientRect()
        const padRadius = state.size * 0.34
        state.launching = true
        state.reachAt = 0
        state.launchStart = performance.now()
        state.flyers = buildFlyers(
          state.snapshot,
          state.size / 2,
          state.size / 2 - padRadius,
          state.size / 2,
          state.size / 2,
          padRadius,
        )
        state.cancelLaunch = startLaunch({
          x: rect.left + state.size / 2,
          y: rect.top + state.size / 2 - padRadius,
          onReach: () => {
            state.reachAt = performance.now()
            open()
          },
        })
      }
    }
    const onEnter = () => (state.hover = true)
    const onLeave = () => (state.hover = false)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      state.cancelLaunch?.()
      cancelAnimationFrame(state.frame)
      resizeObserver.disconnect()
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div className="holo-globe" ref={wrapRef}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
      <span className="holo-globe-hint" aria-hidden="true">
        DRAG TO SPIN / CLICK TO LAUNCH
      </span>
    </div>
  )
}
