const ROCKET_DELAY = 1.3
const FLIGHT = 1.9
const RISE = 0.8
const SCROLL_BEGIN = 0.3
const EXIT = 0.5
const REACH_T = ROCKET_DELAY + FLIGHT + EXIT
const SMOKE_START = ROCKET_DELAY + 0.15
const SMOKE_SPAWN_END = REACH_T + 0.2
const TOTAL = REACH_T + 1.9

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export const CONVERGE_SECONDS = ROCKET_DELAY + 0.1

function metal(ctx, x0, x1, dark, mid, light) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, dark)
  g.addColorStop(0.38, light)
  g.addColorStop(0.6, mid)
  g.addColorStop(1, dark)
  return g
}

function drawFlame(ctx, x, y, width, length, time, seed) {
  const flicker = Math.sin(time * 47 + seed) * 0.5 + Math.sin(time * 83 + seed * 2) * 0.5
  const len = length * (0.9 + flicker * 0.1)
  const sway = Math.sin(time * 31 + seed) * width * 0.2
  const layers = [
    { w: 1.35, l: 1, a: 0.5, c0: '255,70,20', c1: '255,120,30' },
    { w: 1, l: 0.78, a: 0.85, c0: '255,150,40', c1: '255,200,70' },
    { w: 0.62, l: 0.5, a: 0.95, c0: '255,235,170', c1: '255,250,220' },
    { w: 0.38, l: 0.26, a: 0.95, c0: '190,215,255', c1: '255,255,255' },
  ]
  layers.forEach((layer) => {
    const w = width * layer.w
    const l = len * layer.l
    const g = ctx.createLinearGradient(0, y, 0, y + l)
    g.addColorStop(0, `rgba(${layer.c1},${layer.a})`)
    g.addColorStop(0.55, `rgba(${layer.c0},${layer.a * 0.7})`)
    g.addColorStop(1, `rgba(${layer.c0},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - w, y)
    ctx.bezierCurveTo(x - w * 1.15, y + l * 0.4, x - w * 0.35 + sway, y + l * 0.8, x + sway, y + l)
    ctx.bezierCurveTo(x + w * 0.35 + sway, y + l * 0.8, x + w * 1.15, y + l * 0.4, x + w, y)
    ctx.closePath()
    ctx.fill()
  })
}

function drawRocketBody(ctx) {
  const boosterRed = metal(ctx, -16, -8, '#8a93a8', '#dfe4ee', '#ffffff')
  ;[-1, 1].forEach((side) => {
    ctx.save()
    ctx.scale(side, 1)
    // fin
    ctx.fillStyle = '#3a4054'
    ctx.beginPath()
    ctx.moveTo(14, 12)
    ctx.lineTo(26, 38)
    ctx.lineTo(23, 41)
    ctx.lineTo(14, 32)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#d63a4f'
    ctx.beginPath()
    ctx.moveTo(14, 12)
    ctx.lineTo(19, 24)
    ctx.lineTo(14, 22)
    ctx.closePath()
    ctx.fill()
    // booster
    ctx.fillStyle = boosterRed
    ctx.beginPath()
    ctx.moveTo(8, -6)
    ctx.quadraticCurveTo(12, -18, 15.5, -6)
    ctx.lineTo(15.5, 32)
    ctx.lineTo(8, 32)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#c4303f'
    ctx.beginPath()
    ctx.moveTo(8, -6)
    ctx.quadraticCurveTo(12, -18, 15.5, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#2b3042'
    ctx.beginPath()
    ctx.moveTo(10, 32)
    ctx.lineTo(14, 32)
    ctx.lineTo(15, 38)
    ctx.lineTo(9, 38)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  })

  // main engine bell
  const bell = metal(ctx, -8, 8, '#1d2130', '#4a526b', '#8d96b0')
  ctx.fillStyle = bell
  ctx.beginPath()
  ctx.moveTo(-5.5, 30)
  ctx.lineTo(5.5, 30)
  ctx.lineTo(8, 40)
  ctx.lineTo(-8, 40)
  ctx.closePath()
  ctx.fill()

  // core stage
  ctx.fillStyle = metal(ctx, -9.5, 9.5, '#8b94aa', '#dde2ec', '#ffffff')
  ctx.beginPath()
  ctx.moveTo(-9.5, -28)
  ctx.lineTo(9.5, -28)
  ctx.lineTo(9.5, 31)
  ctx.lineTo(-9.5, 31)
  ctx.closePath()
  ctx.fill()

  // black interstage and panel seams
  ctx.fillStyle = '#20263a'
  ctx.fillRect(-9.5, -28, 19, 4)
  ctx.fillRect(-9.5, 17, 19, 3)
  ctx.strokeStyle = 'rgba(40,48,70,0.28)'
  ctx.lineWidth = 0.7
  ;[-10, 4, 24].forEach((yy) => {
    ctx.beginPath()
    ctx.moveTo(-9.5, yy)
    ctx.lineTo(9.5, yy)
    ctx.stroke()
  })

  // nose cone
  const nose = metal(ctx, -9.5, 9.5, '#5e1220', '#d6384e', '#ff8294')
  ctx.fillStyle = nose
  ctx.beginPath()
  ctx.moveTo(-9.5, -28)
  ctx.bezierCurveTo(-9, -42, -4, -52, 0, -58)
  ctx.bezierCurveTo(4, -52, 9, -42, 9.5, -28)
  ctx.closePath()
  ctx.fill()

  // porthole
  ctx.fillStyle = '#9aa5bd'
  ctx.beginPath()
  ctx.arc(0, -13, 5.2, 0, Math.PI * 2)
  ctx.fill()
  const glass = ctx.createRadialGradient(-1.5, -14.5, 0.5, 0, -13, 4.2)
  glass.addColorStop(0, '#bfe4ff')
  glass.addColorStop(1, '#2a5fc4')
  ctx.fillStyle = glass
  ctx.beginPath()
  ctx.arc(0, -13, 3.9, 0, Math.PI * 2)
  ctx.fill()

  // specular line
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(-5, -24, 1.6, 50)
}

function drawRocket(ctx, x, y, k, time, thrust) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)

  ctx.globalCompositeOperation = 'lighter'
  const glowR = 46 * thrust
  const glow = ctx.createRadialGradient(0, 40, 0, 0, 40, glowR)
  glow.addColorStop(0, 'rgba(255,170,60,0.55)')
  glow.addColorStop(1, 'rgba(255,90,20,0)')
  ctx.fillStyle = glow
  ctx.fillRect(-glowR, 40 - glowR, glowR * 2, glowR * 2)
  drawFlame(ctx, 0, 39, 8, 80 * thrust, time, 0)
  drawFlame(ctx, -12, 37, 3.6, 42 * thrust, time, 2)
  drawFlame(ctx, 12, 37, 3.6, 42 * thrust, time, 4)
  ctx.globalCompositeOperation = 'source-over'

  drawRocketBody(ctx)
  ctx.restore()
}

// Full-screen overlay: rocket lift-off from (x, y), realistic fire and smoke,
// plus smoke rising from the bottom of the viewport. Calls onReach when the rocket leaves the top.
export function startLaunch({ x, y, onReach }) {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483000',
  })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const start = performance.now()
  const endY = -160
  const holdY = Math.max(110, Math.min(H * 0.42, y - 120))
  const exitAccel = (2 * (holdY - endY)) / (EXIT * EXIT)
  const streaks = Array.from({ length: 46 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    a: 0.4 + Math.random() * 0.6,
  }))
  let streakOffset = 0
  let startScroll = null
  let lastScroll = 0
  const smoke = []
  const trail = []
  const embers = []
  let last = start
  let reached = false
  let frame = 0
  let done = false

  const finish = () => {
    if (done) return
    done = true
    cancelAnimationFrame(frame)
    canvas.remove()
  }
  const safety = setTimeout(finish, (TOTAL + 6) * 1000)

  const drawPuff = (p, tint) => {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
    g.addColorStop(0, `rgba(${tint},${p.alpha})`)
    g.addColorStop(1, `rgba(${tint},0)`)
    ctx.fillStyle = g
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
  }

  const tick = (now) => {
    frame = requestAnimationFrame(tick)
    const t = (now - start) / 1000
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    ctx.clearRect(0, 0, W, H)

    const tau = t - ROCKET_DELAY
    const flying = tau >= 0 && tau <= FLIGHT + EXIT
    let rocketY = y
    if (tau >= FLIGHT) {
      const e = tau - FLIGHT
      rocketY = holdY - 0.5 * exitAccel * e * e
    } else if (tau >= RISE) {
      rocketY = holdY + Math.sin(tau * 6) * 1.5
    } else if (tau >= 0) {
      rocketY = y + (holdY - y) * easeInOut(tau / RISE)
    }
    const rocketK = Math.min(1, 0.12 + Math.max(0, tau) * 3.2) * 0.95
    const thrust = Math.min(1, 0.35 + Math.max(0, tau) * 1.6)
    const shake = tau >= 0 ? Math.sin(tau * 70) * Math.max(0, 1 - tau / 0.9) * 1.2 : 0
    const nozzleY = rocketY + 40 * rocketK

    // the page scrolls up behind the rocket, then eases back to where the visitor was
    let scrollV = 0
    if (tau >= 0) {
      if (startScroll === null) {
        startScroll = window.scrollY
        lastScroll = startScroll
      }
      let pos = startScroll
      if (tau >= SCROLL_BEGIN && tau <= FLIGHT) {
        pos = startScroll * (1 - easeInOut(clamp01((tau - SCROLL_BEGIN) / (FLIGHT - SCROLL_BEGIN))))
      } else if (tau > FLIGHT) {
        pos = 0
      }
      if (startScroll > 40 && t < REACH_T) window.scrollTo({ top: pos, behavior: 'instant' })
      scrollV = dt > 0 ? (lastScroll - pos) / dt : 0
      lastScroll = pos
    }
    streakOffset += scrollV * dt
    const speed = Math.abs(scrollV)
    if (speed > 120) {
      const len = Math.min(240, speed * 0.05) + 8
      streaks.forEach((s) => {
        const sy = (((s.y + streakOffset) % H) + H) % H
        const g = ctx.createLinearGradient(0, sy - len, 0, sy)
        const a = Math.min(0.55, speed / 3500) * s.a
        g.addColorStop(0, 'rgba(255,255,255,0)')
        g.addColorStop(1, `rgba(235,235,255,${a})`)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(s.x, sy - len)
        ctx.lineTo(s.x, sy)
        ctx.stroke()
      })
    }

    // ground-level smoke rising from the bottom edge of the screen
    if (t >= SMOKE_START && t <= SMOKE_SPAWN_END && smoke.length < 170) {
      const ramp = Math.min(1, (t - SMOKE_START) / 1.2)
      const count = Math.round(2 + ramp * 3)
      for (let i = 0; i < count; i++) {
        smoke.push({
          x: Math.random() * W,
          y: H + 30 - Math.random() * 50,
          vy: -(18 + Math.random() * 46),
          vx: (Math.random() - 0.5) * 26,
          r: 60 + Math.random() * 60,
          grow: 55 + Math.random() * 70,
          age: 0,
          life: 2.6 + Math.random() * 1.6,
          peak: 0.2 + Math.random() * 0.18,
          shade: 190 + Math.floor(Math.random() * 50),
        })
      }
    }

    const haze = Math.max(0, Math.min(1, (t - SMOKE_START) / 1.4) * Math.min(1, (TOTAL - t) / 1.4))
    if (haze > 0) {
      const g = ctx.createLinearGradient(0, H, 0, H * 0.45)
      g.addColorStop(0, `rgba(200,200,220,${0.55 * haze})`)
      g.addColorStop(0.5, `rgba(170,170,195,${0.22 * haze})`)
      g.addColorStop(1, 'rgba(170,170,195,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, H * 0.45, W, H * 0.55)
    }

    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]
      p.age += dt
      if (p.age >= p.life) {
        smoke.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.r += p.grow * dt
      p.alpha = p.peak * Math.sin(Math.PI * Math.min(1, (p.age / p.life) * 1.15))
      drawPuff(p, `${p.shade},${p.shade},${p.shade + 8}`)
    }

    // exhaust smoke trail left behind the rocket
    if (flying) {
      for (let i = 0; i < 2; i++) {
        trail.push({
          x: x + shake + (Math.random() - 0.5) * 10,
          y: nozzleY + 6,
          vx: (Math.random() - 0.5) * 30,
          vy: 15 + Math.random() * 30,
          r: 7 + Math.random() * 5,
          grow: 22 + Math.random() * 20,
          age: 0,
          life: 1.2 + Math.random() * 0.8,
          alpha: 0,
        })
      }
      for (let i = 0; i < 6; i++) {
        const spread = (Math.random() - 0.5) * 1.1
        embers.push({
          x: x + shake + (Math.random() - 0.5) * 8,
          y: nozzleY + 4,
          vx: Math.sin(spread) * (80 + Math.random() * 140),
          vy: 120 + Math.random() * 260,
          age: 0,
          life: 0.35 + Math.random() * 0.55,
          size: 1.2 + Math.random() * 2.2,
          hue: 18 + Math.random() * 36,
        })
      }
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i]
      p.age += dt
      if (p.age >= p.life) {
        trail.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += (p.vy + scrollV) * dt
      p.r += p.grow * dt
      const u = p.age / p.life
      p.alpha = 0.3 * (1 - u) * Math.min(1, u * 6)
      drawPuff(p, '225,222,232')
    }

    // launch-pad glow while the lights converge
    if (tau < 0.4) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40)
      const a = Math.min(1, t / ROCKET_DELAY) * (1 - Math.max(0, tau) / 0.4)
      g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 40, y - 40, 80, 80)
    }

    if (tau >= 0 && rocketY > endY - 90) {
      drawRocket(ctx, x + shake, rocketY, rocketK, t, thrust)
    }

    ctx.globalCompositeOperation = 'lighter'
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i]
      p.age += dt
      if (p.age >= p.life) {
        embers.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += (p.vy + scrollV) * dt
      const u = p.age / p.life
      ctx.fillStyle = `hsla(${p.hue},100%,${60 + (1 - u) * 15}%,${1 - u})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 - u * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    if (!reached && tau >= FLIGHT + EXIT) {
      reached = true
      onReach?.()
    }
    if (t >= TOTAL) {
      clearTimeout(safety)
      finish()
    }
  }
  frame = requestAnimationFrame(tick)

  return () => {
    clearTimeout(safety)
    if (startScroll !== null && !reached && !done && startScroll > 40) {
      window.scrollTo({ top: startScroll, behavior: 'instant' })
    }
    finish()
  }
}
