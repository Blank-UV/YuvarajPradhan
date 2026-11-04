import {
  BUILD_STATS,
  ELEMENT_COLORS,
  SKILL_KINDS,
  critValue,
  selectedPreset,
  sonataCounts,
  statValue,
} from './wuwa-build.js'

const imageCache = new Map()
function loadImage(url) {
  if (!url) return Promise.resolve(null)
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => {
          imageCache.delete(url)
          reject(
            new Error(
              'A showcase image could not load. Check the bucket upload and public access, then retry.',
            ),
          )
        }
        image.src = url
      }),
    )
  }
  return imageCache.get(url)
}

export async function renderBuildCard({
  catalog,
  build,
  character,
  reference,
  weapon,
  weaponReference,
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 940
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser does not support image rendering.')
  const color = ELEMENT_COLORS[character.element] ?? '#69c5ed'
  const path = (value) => (value ? `${catalog.image_base}${value}` : null)
  const skills = SKILL_KINDS.map((kind) => reference.skills.find((row) => row.kind === kind))
  const echoRows = build.echoes.map((slot) => catalog.echoes.find((row) => row.slug === slot.slug))
  const urls = [
    reference.portrait_path ? path(reference.portrait_path) : character.image_url,
    weapon?.image_url,
    ...skills.map((skill) => path(skill?.icon_path)),
    ...reference.sequences.map((node) => path(node.icon_path)),
    ...echoRows.map((echo) => echo?.image_url),
    ...build.echoes.map(
      (slot) => catalog.sonatas.find((row) => row.slug === slot.sonata)?.image_url,
    ),
  ]
  const images = await Promise.all(urls.map(loadImage))
  const portrait = images[0]
  const weaponImage = images[1]
  const skillImages = images.slice(2, 7)
  const chainImages = images.slice(7, 7 + reference.sequences.length)
  const echoImages = images.slice(7 + reference.sequences.length, 12 + reference.sequences.length)
  const setImages = images.slice(12 + reference.sequences.length)

  function box(x, y, w, h, fill = 'rgba(7,15,32,0.64)', stroke = 'rgba(235,240,255,0.16)') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 12)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
  function text(value, x, y, size = 20, fill = '#edf2ff', weight = 400, maxWidth) {
    ctx.fillStyle = fill
    ctx.font = `${weight} ${size}px Arial, sans-serif`
    let string = String(value)
    if (maxWidth && ctx.measureText(string).width > maxWidth) {
      while (string.length && ctx.measureText(`${string}...`).width > maxWidth)
        string = string.slice(0, -1)
      string += '...'
    }
    ctx.fillText(string, x, y)
  }
  function fitImage(image, x, y, w, h, cover = false) {
    if (!image) return
    const scale = (cover ? Math.max : Math.min)(w / image.width, h / image.height)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.drawImage(
      image,
      x + (w - image.width * scale) / 2,
      y + (h - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    )
    ctx.restore()
  }
  const gradient = ctx.createLinearGradient(0, 0, 1600, 940)
  gradient.addColorStop(0, '#0c1529')
  gradient.addColorStop(0.55, `${color}55`)
  gradient.addColorStop(1, '#10172d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1600, 940)
  // Keep the decorative background deterministic across exports.
  for (let i = 0; i < 160; i += 1) {
    ctx.fillStyle = `rgba(230,240,255,${0.1 + (i % 5) * 0.06})`
    ctx.fillRect((i * 197 + 31) % 1600, (i * 113 + 19) % 940, 2, 2)
  }
  text('IAMUV / BUILD SHOW', 1270, 36, 16, '#d4dff4', 700)
  box(24, 24, 330, 562, `${color}22`)
  fitImage(portrait, 30, 30, 318, 550)
  if (!portrait) text('Artwork unavailable', 55, 300, 22, '#d4dff4')

  text(character.name, 388, 66, 34, '#ffffff', 700, 500)
  const level = reference.level_stats.find(
    (row) => `${row.level}:${row.ascension}` === build.characterLevel,
  )
  text(
    `Lv. ${level?.level ?? '?'} / 90  |  ${character.element}  |  S${build.chain}`,
    390,
    102,
    20,
    '#d4dff4',
  )
  text(build.name || 'YOUR BUILD', 935, 66, 23, '#ffffff', 700, 300)
  text(build.uid ? `UID: ${build.uid}` : 'EQUIPMENT BUILD', 935, 102, 16, '#d4dff4', 400, 290)

  box(382, 126, 780, 300)
  BUILD_STATS.forEach((stat, index) => {
    const column = Math.floor(index / 6)
    const row = index % 6
    const x = 405 + column * 390
    const y = 164 + row * 46
    text(
      stat.key === 'element' ? `${character.element} DMG Bonus` : stat.label,
      x,
      y,
      17,
      '#d4dff4',
      600,
      220,
    )
    text(statValue(build.stats[stat.key], stat.percent), x + 250, y, 21, '#ffe29b', 700, 100)
  })

  box(1180, 126, 396, 300)
  text('FORTE & RESONANCE', 1200, 156, 17, color, 700)
  reference.sequences.forEach((node, index) => {
    const x = 1210 + index * 59
    ctx.globalAlpha = index < Number(build.chain) ? 1 : 0.25
    fitImage(chainImages[index], x, 178, 40, 40)
    ctx.globalAlpha = 1
    text(String(node.node), x + 15, 242, 16, index < Number(build.chain) ? '#ffe29b' : '#9aabc7')
  })
  skills.forEach((skill, index) => {
    const x = 1198 + index * 74
    fitImage(skillImages[index], x + 10, 274, 42, 42)
    text(`Lv. ${build.skills[index]}`, x + 5, 347, 17, '#ffffff', 700)
    text(['Normal', 'Skill', 'Forte', 'Liberation', 'Intro'][index], x, 375, 12, '#d4dff4')
  })

  box(24, 608, 330, 278)
  text('WEAPON', 46, 642, 15, color, 700)
  text(weapon?.name || 'Not selected', 46, 678, 23, '#ffffff', 700, 290)
  const weaponLevel = weaponReference?.level_stats.find(
    (row) => `${row.level}:${row.ascension}` === build.weaponLevel,
  )
  fitImage(weaponImage, 210, 700, 120, 150)
  text(
    weapon
      ? `Lv. ${weaponLevel?.level ?? '?'} / ${weapon.max_level} | R${build.rank}`
      : 'Select a weapon in the editor',
    46,
    716,
    16,
    '#d4dff4',
    400,
    275,
  )
  if (weaponLevel) {
    text(`ATK  ${weaponLevel.atk}`, 46, 768, 21, '#ffe29b', 700)
    text(weaponReference.sub_stat, 46, 807, 16, '#d4dff4')
    text(
      statValue(weaponLevel.sub_value, weaponReference.sub_is_percent),
      46,
      840,
      23,
      '#ffe29b',
      700,
    )
  }
  text(`ECHO CV  ${critValue(build.echoes)}`, 390, 471, 22, '#ffe29b', 700)
  const sets = sonataCounts(build.echoes, catalog.echoes)
    .map(
      (set) =>
        `${catalog.sonatas.find((row) => row.slug === set.slug)?.name ?? set.slug} (${set.count})`,
    )
    .join('  /  ')
  text(sets || 'Choose echoes and sonata sets', 660, 470, 17, '#d4dff4', 400, 900)

  build.echoes.forEach((slot, index) => {
    const x = 382 + index * 240
    const echo = echoRows[index]
    box(x, 494, 226, 392)
    text(echo?.name || `ECHO SLOT ${index + 1}`, x + 12, 522, 14, '#ffffff', 700, 202)
    fitImage(echoImages[index], x + 12, 540, 96, 102)
    fitImage(setImages[index], x + 180, 548, 28, 28)
    if (echo) {
      text(`COST ${echo.cost} | +${slot.level}`, x + 12, 665, 13, '#d4dff4')
      const preset = selectedPreset(catalog, slot)
      const main = preset?.stats.find((row) => !row.fixed && row.stat === slot.main)
      text(main?.stat ?? 'Main stat not set', x + 110, 612, 13, '#d4dff4', 106)
      text(
        main ? statValue(main.value, main.unit === 'percent') : '\u2014',
        x + 110,
        641,
        21,
        '#ffe29b',
        700,
      )
      const fixed = preset?.stats.find((row) => row.fixed)
      text(fixed ? `+${fixed.value} ${fixed.stat}` : '', x + 120, 665, 13, '#d4dff4')
    }
    slot.substats.forEach((sub, row) => {
      const definition = catalog.rules.echo_substats.find(
        (stat) => String(stat.property_id) === sub.id,
      )
      const y = 706 + row * 35
      ctx.fillStyle = row % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.07)'
      ctx.fillRect(x + 8, y - 22, 210, 31)
      text(
        definition
          ? `${definition.stat}${definition.unit === 'percent' && ['HP', 'ATK', 'DEF'].includes(definition.stat) ? '%' : ''}`
          : '\u2014',
        x + 14,
        y,
        13,
        '#d4dff4',
        400,
        146,
      )
      text(
        definition ? statValue(sub.value, definition.unit === 'percent') : '',
        x + 162,
        y,
        14,
        color,
        700,
        52,
      )
    })
  })
  text(
    'EQUIPMENT TOTALS + CUSTOM OVERRIDES / CONDITIONAL BUFFS NOT AUTO-APPLIED / NOT ACCOUNT VERIFIED',
    24,
    920,
    14,
    '#bfcee6',
  )
  return canvas
}
