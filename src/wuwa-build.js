export const ELEMENT_COLORS = {
  Aero: '#55dfb5',
  Electro: '#b187ff',
  Fusion: '#f18565',
  Glacio: '#69c5ed',
  Havoc: '#d58adc',
  Spectro: '#e8cf76',
}

export const BUILD_STATS = [
  { key: 'hp', label: 'HP', id: 2, percent: false },
  { key: 'atk', label: 'ATK', id: 7, percent: false },
  { key: 'def', label: 'DEF', id: 10, percent: false },
  { key: 'energy', label: 'Energy Regen', id: 11, percent: true },
  { key: 'critRate', label: 'Crit. Rate', id: 8, percent: true },
  { key: 'critDmg', label: 'Crit. DMG', id: 9, percent: true },
  { key: 'skill', label: 'Skill DMG Bonus', id: 14, percent: true },
  { key: 'basic', label: 'Basic Attack DMG Bonus', id: 17, percent: true },
  { key: 'heavy', label: 'Heavy Attack DMG Bonus', id: 18, percent: true },
  { key: 'liberation', label: 'Liberation DMG Bonus', id: 19, percent: true },
  { key: 'element', label: 'Element DMG Bonus', percent: true },
  { key: 'healing', label: 'Healing Bonus', id: 35, percent: true },
]
export const SKILL_KINDS = [
  'Normal Attack',
  'Resonance Skill',
  'Forte Circuit',
  'Resonance Liberation',
  'Intro Skill',
]
export const emptyEcho = () => ({
  slug: '',
  sonata: '',
  rarity: 5,
  level: 25,
  main: '',
  substats: Array.from({ length: 5 }, () => ({ id: '', value: '' })),
})
export const emptyBuild = () => ({
  character: '',
  variant: '',
  characterLevel: '',
  weapon: '',
  weaponLevel: '',
  rank: 1,
  name: '',
  uid: '',
  chain: 0,
  minorFortes: [],
  skills: [1, 1, 1, 1, 1],
  stats: Object.fromEntries(BUILD_STATS.map((stat) => [stat.key, ''])),
  echoes: Array.from({ length: 5 }, emptyEcho),
})
export const statLabel = (stat) =>
  `${stat.stat}${stat.unit === 'percent' && !stat.stat.includes('%') ? ' %' : ''}`
export const statValue = (value, percent = false) =>
  value === '' || value == null
    ? '\u2014'
    : `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })}${percent ? '%' : ''}`

export function selectedPreset(catalog, slot) {
  const echo = catalog.echoes.find((row) => row.slug === slot.slug)
  return catalog.rules.echo_main_stats.find(
    (row) =>
      row.cost === echo?.cost &&
      row.rarity === Number(slot.rarity) &&
      row.level === Number(slot.level),
  )
}

export function critValue(slots) {
  let total = 0
  for (const slot of slots) {
    for (const stat of slot.substats) {
      const value = Number(stat.value)
      if (Number.isFinite(value)) {
        if (Number(stat.id) === 8) total += value * 2
        if (Number(stat.id) === 9) total += value
      }
    }
  }
  return Math.round(total * 10) / 10
}

export function sonataCounts(slots, echoes) {
  const counts = new Map()
  const seen = new Set()
  for (const slot of slots) {
    const echo = echoes.find((row) => row.slug === slot.slug)
    // Copies of the same echo do not count twice toward a sonata bonus.
    if (!echo || !slot.sonata || seen.has(slot.slug)) continue
    if (!(echo.sonata_effects ?? []).some((set) => set.slug === slot.sonata)) continue
    seen.add(slot.slug)
    counts.set(slot.sonata, (counts.get(slot.sonata) ?? 0) + 1)
  }
  return [...counts].map(([slug, count]) => ({ slug, count }))
}

export function buildIssues(build, catalog) {
  const issues = []
  const equipped = build.echoes.filter((slot) => slot.slug)
  const cost = equipped.reduce(
    (sum, slot) => sum + (catalog.echoes.find((row) => row.slug === slot.slug)?.cost ?? 0),
    0,
  )
  if (cost > 12) issues.push(`Echo cost is ${cost}/12. Use a total cost of 12 or less.`)
  build.echoes.forEach((slot, index) => {
    if (!slot.slug) return
    const echo = catalog.echoes.find((row) => row.slug === slot.slug)
    if (!echo) issues.push(`Echo ${index + 1} is unavailable.`)
    if (!(echo?.sonata_effects ?? []).some((set) => set.slug === slot.sonata)) {
      issues.push(`Choose a valid sonata for Echo ${index + 1}.`)
    }
    if (
      !selectedPreset(catalog, slot)?.stats.some((stat) => !stat.fixed && stat.stat === slot.main)
    ) {
      issues.push(`Choose a valid main stat for Echo ${index + 1}.`)
    }
    const chosen = slot.substats.filter((row) => row.id !== '')
    if (new Set(chosen.map((row) => row.id)).size !== chosen.length) {
      issues.push(`Echo ${index + 1} has duplicate substat types.`)
    }
    const cap = Number(slot.rarity) === 2 ? 0 : Math.floor(Number(slot.level) / 5)
    if (chosen.length > cap)
      issues.push(`Echo ${index + 1} has more substats than its level allows.`)
    if (
      chosen.some(
        (row) => row.value === '' || !Number.isFinite(Number(row.value)) || Number(row.value) < 0,
      )
    ) {
      issues.push(`Enter valid values for Echo ${index + 1}'s selected substats.`)
    }
  })
  return issues
}

export function levelKey(row) {
  return row ? `${row.level}:${row.ascension}` : ''
}

export function echoCost(slots, echoes) {
  return slots.reduce(
    (total, slot) => total + (echoes.find((echo) => echo.slug === slot.slug)?.cost ?? 0),
    0,
  )
}

// Only unconditional reference stats are combined. Conditional passives need
// in-game totals, not a guessed always-on buff.
export function calculateBuildStats({ build, catalog, character, reference, weaponReference }) {
  const level = reference?.level_stats.find((row) => levelKey(row) === build.characterLevel)
  const weaponLevel = weaponReference?.level_stats.find(
    (row) => levelKey(row) === build.weaponLevel,
  )
  const stats = Object.fromEntries(BUILD_STATS.map((stat) => [stat.key, 0]))
  const flat = { hp: 0, atk: 0, def: 0 }
  const percent = { hp: 0, atk: 0, def: 0 }
  const warnings = []
  const normalize = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace('critical', 'crit')
      .replace('resonance', '')
      .replace(/bonus$/, '')
  function add(name, unit, value) {
    if (!Number.isFinite(value)) return
    const key = normalize(name)
    const baseKey = ['hp', 'atk', 'def'].find((stat) => key === stat)
    if (baseKey) {
      ;(unit === 'percent' ? percent : flat)[baseKey] += value
      return
    }
    const definition = BUILD_STATS.find(
      (stat) => stat.key !== 'element' && normalize(stat.label) === key,
    )
    if (definition) {
      if (stats[definition.key] !== null) stats[definition.key] += value
    } else if (key === normalize(`${character?.element} DMG`)) stats.element += value
    else if (!/^(aero|electro|fusion|glacio|havoc|spectro)dmg$/.test(key))
      warnings.push(`Not calculated: ${name}.`)
  }
  if (!level)
    return { stats: Object.fromEntries(BUILD_STATS.map((stat) => [stat.key, null])), warnings: [] }
  const raw = reference.base_stats
  for (const [key, source] of [
    ['critRate', 'Crit'],
    ['critDmg', 'CritDamage'],
    ['energy', 'EnergyEfficiency'],
  ]) {
    stats[key] = Number.isFinite(raw[source]) ? raw[source] / 100 : null
    if (stats[key] === null) warnings.push(`Base ${key} is missing from the source.`)
  }
  if (weaponLevel)
    add(
      weaponReference.sub_stat,
      weaponReference.sub_is_percent ? 'percent' : 'flat',
      weaponLevel.sub_value,
    )
  build.echoes.forEach((slot) => {
    if (!slot.slug) return
    const preset = selectedPreset(catalog, slot)
    preset?.stats
      .filter((stat) => stat.fixed || stat.stat === slot.main)
      .forEach((stat) => add(stat.stat, stat.unit, stat.value))
    slot.substats.forEach((roll) => {
      const definition = catalog.rules.echo_substats.find(
        (stat) => String(stat.property_id) === roll.id,
      )
      if (
        definition &&
        roll.value !== '' &&
        Number.isFinite(Number(roll.value)) &&
        Number(roll.value) >= 0
      ) {
        add(definition.stat, definition.unit, Number(roll.value))
      }
    })
  })
  const minorFortes = character?.minor_fortes ?? []
  minorFortes.forEach((forte, index) => {
    if (build.minorFortes.includes(index))
      add(
        forte.stat,
        forte.stat.includes('%') || !['HP', 'ATK', 'DEF'].includes(forte.stat) ? 'percent' : 'flat',
        forte.value,
      )
  })
  for (const key of ['hp', 'atk', 'def']) {
    const base = level[key]
    if (base == null) {
      stats[key] = null
      warnings.push(
        `Base ${key.toUpperCase()} is missing from the source. Enter an in-game total if needed.`,
      )
    } else {
      const totalBase = base + (key === 'atk' ? (weaponLevel?.atk ?? 0) : 0)
      stats[key] = Math.floor(totalBase * (1 + percent[key] / 100) + flat[key])
    }
  }
  for (const key of Object.keys(stats)) {
    if (stats[key] != null) stats[key] = Math.round(stats[key] * 10) / 10
  }
  return { stats, warnings: [...new Set(warnings)] }
}

export function resolvedBuildStats(build, calculated) {
  return Object.fromEntries(
    BUILD_STATS.map(({ key }) => [
      key,
      build.stats[key] === '' ? calculated[key] : Number(build.stats[key]),
    ]),
  )
}
