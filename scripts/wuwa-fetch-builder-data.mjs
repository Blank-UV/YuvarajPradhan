// Collect public reference data only. No account data or Supabase credentials are used.
// Run from the repository root: node scripts/wuwa-fetch-builder-data.mjs [--refresh]
import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  characterLevels,
  echoMainStatPresets,
  parseDataModule,
  slugify,
  weaponLevels,
} from './wuwa-builder-data.mjs'

const execFile = promisify(execFileCallback)
const root = fileURLToPath(new URL('../wuwa-data/', import.meta.url))
const output = join(root, 'builder')
const cache = join(output, 'cache')
const origin = 'https://wuthering.gg'
const refresh = process.argv.includes('--refresh')
const fetchedAt = new Date().toISOString()
const issues = []
const sources = []
const assets = new Map()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
await mkdir(cache, { recursive: true })

async function download(url, file) {
  if (!refresh) {
    try {
      return await readFile(file)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  await mkdir(dirname(file), { recursive: true })
  const { stdout } = await execFile(
    'curl.exe',
    ['-f', '-sS', '-L', '--retry', '2', '--max-time', '60', url],
    { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
  )
  if (!stdout.length) throw new Error(`Empty response: ${url}`)
  await writeFile(`${file}.partial`, stdout)
  await rename(`${file}.partial`, file)
  return stdout
}

async function sourceFile(url) {
  const file = join(cache, createHash('sha256').update(url).digest('hex') + '.txt')
  const buffer = await download(url, file)
  sources.push({ url, sha256: createHash('sha256').update(buffer).digest('hex') })
  return buffer.toString('utf8')
}

const html = await sourceFile(`${origin}/characters/cantarella`)
const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)]
let loader
for (const [, path] of preloads) {
  const module = await sourceFile(new URL(path, origin).href)
  if (module.includes('../data/en/propertygrowth.json')) {
    loader = module
    break
  }
}
if (!loader) throw new Error('Public data loader not found; source layout changed')
const datasets = new Map(
  [...loader.matchAll(/"\.\.\/data\/en\/([^"/]+)":\(\)=>\w+\(\(\)=>import\("\.\/([^"/]+)"/g)].map(
    ([, name, file]) => [name, `${origin}/_nuxt/${file}`],
  ),
)
async function dataset(name) {
  const url = datasets.get(`${name}.json`)
  if (!url) throw new Error(`Source no longer publishes ${name}`)
  return parseDataModule(await sourceFile(url))
}
const characters = await dataset('characters')
const weapons = await dataset('weapons')
const properties = await dataset('propertyindex')
const growth = await dataset('propertygrowth')
const weaponGrowth = await dataset('weaponpropertygrowth')
const echoGrowth = await dataset('PhantomGrowth')
const echoData = await dataset('echoes')

async function localData(folder) {
  const dir = join(root, folder)
  return Promise.all(
    (await readdir(dir))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(dir, name), 'utf8'))),
  )
}
const roster = await localData('characters')
const localWeapons = await localData('weapons')
const echoes = await localData('echoes')

function asset(directory, filename, target = filename) {
  if (!filename) return null
  if (!/^[\w.-]+\.png$/i.test(filename) || !/^[\w.-]+\.png$/i.test(target)) {
    throw new Error(`Unexpected asset filename ${filename}`)
  }
  const path = `builder/${directory}/${target}`
  assets.set(path, {
    bucket_path: path,
    local_path: `wuwa-data/images/${path}`,
    source_url: `${origin}/images/${directory === 'portraits' ? 'iconrolepile' : directory === 'skills' ? 'iconskill' : directory === 'sequences' ? 'icondevice' : directory === 'elements' ? 'iconelement' : 'iconattribute'}/${filename}`,
  })
  return path
}

const aliases = { shorekeeper: 'the-shorekeeper' }
const characterRows = []
for (const character of characters) {
  const key = slugify(character.NameEn || character.Name)
  const slug = aliases[key] ?? key
  const local = roster.find((item) => item.slug === slug)
  if (!local) {
    issues.push({ kind: 'unmatched-character', name: character.Name, game_id: character.Id })
    continue
  }
  const levels = characterLevels(character.Stats, growth)
  if (
    !levels.length ||
    levels.some((row) => row.hp == null || row.atk == null || row.def == null)
  ) {
    issues.push({
      kind: 'missing-character-stats',
      slug,
      game_id: character.Id,
      fields: ['hp', 'atk', 'def'].filter((key) => !levels.length || levels[0][key] == null),
    })
  }
  const skills = (character.Skills ?? [])
    .filter((skill) => skill.SkillName)
    .map((skill) => ({
      kind: skill.TypeName,
      name: skill.SkillName,
      icon_path: asset('skills', skill.Icon),
      multipliers: (skill.Multipliers ?? []).map((multiplier) => ({
        name: multiplier.AttributeName,
        values: multiplier.SkillDetailNum.map((entry) => entry.ArrayString.slice(0, 10)),
      })),
    }))
  const sequences = (character.ResonantChainGroup ?? []).map((node, index) => ({
    node: index + 1,
    name: node.NodeName,
    icon_path: asset('sequences', node.NodeIcon),
  }))
  if (sequences.length !== 6) {
    issues.push({ kind: 'incomplete-character-chain', slug, game_id: character.Id })
  }
  if (!skills.length) issues.push({ kind: 'missing-character-skills', slug, game_id: character.Id })
  characterRows.push({
    character_slug: slug,
    game_id: character.Id,
    portrait_path: asset('portraits', character.FormationRoleCard, `${slug}-${character.Id}.png`),
    element_icon_path: asset('elements', character.Element?.Icon7),
    base_stats: character.Stats ?? null,
    level_stats: levels,
    skills,
    sequences,
    source_url: `${origin}/characters/${key}`,
  })
}
for (const local of roster) {
  if (!characterRows.some((row) => row.character_slug === local.slug)) {
    issues.push({ kind: 'character-not-published-by-source', slug: local.slug })
  }
}

const weaponRows = []
for (const weapon of weapons) {
  const slug = slugify(weapon.WeaponNameEn || weapon.WeaponName)
  const local = localWeapons.find((item) => item.slug === slug)
  if (!local) {
    issues.push({ kind: 'unmatched-weapon', name: weapon.WeaponName, game_id: weapon.Id })
    continue
  }
  weaponRows.push({
    weapon_slug: slug,
    game_id: weapon.Id,
    sub_stat: weapon.SecondPropId.Name,
    sub_is_percent: Boolean(weapon.SecondPropId.IsPercent || weapon.SecondPropId.IsRatio),
    level_stats: weaponLevels(weapon, weaponGrowth),
    // Keep parameters rather than inferring unconditional stat bonuses from passive prose.
    rank_parameters: weapon.DescParams.map((param, index) => {
      if (param.ArrayString.length !== 5) {
        issues.push({
          kind: 'incomplete-weapon-rank-parameter',
          slug,
          parameter: index,
          published_ranks: param.ArrayString.length,
        })
      }
      return Array.from({ length: 5 }, (_, rank) => param.ArrayString[rank] ?? null)
    }),
    source_url: `${origin}/weapons/${slug}`,
  })
}
for (const local of localWeapons) {
  if (!weaponRows.some((row) => row.weapon_slug === local.slug)) {
    issues.push({ kind: 'weapon-not-published-by-source', slug: local.slug })
  }
}

const usedPropertyIds = new Set([
  2, 7, 8, 9, 10, 11, 14, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 35, 10002, 10007, 10010,
])
const stats = properties
  .filter((prop) => usedPropertyIds.has(prop.Id))
  .map((prop) => ({
    id: prop.Id,
    name: prop.Name,
    unit: prop.IsPercent || prop.Id >= 10000 ? 'percent' : 'flat',
    icon_path: asset('stats', prop.Icon),
  }))

// The existing per-echo records provide cost-specific +25 options. Check agreement
// across every echo of the same cost instead of choosing one representative blindly.
const mainStats = []
for (const cost of [1, 3, 4]) {
  const matching = echoes.filter((echo) => echo.cost === cost)
  if (!matching.length) throw new Error(`No cost-${cost} echoes`)
  const expected = JSON.stringify(matching[0].main_stats)
  if (matching.some((echo) => JSON.stringify(echo.main_stats) !== expected)) {
    throw new Error(`Conflicting main-stat options for cost ${cost}`)
  }
  mainStats.push({
    cost,
    rarity: 5,
    level: 25,
    stats: matching[0].main_stats.map((stat) => ({
      stat: stat.stat,
      value: Number.parseFloat(stat.value),
      unit: stat.value.includes('%') ? 'percent' : 'flat',
      fixed: Boolean(stat.fixed),
    })),
  })
}
const allMainStats = echoMainStatPresets(echoData.mainProps, echoGrowth)
for (const preset of mainStats) {
  const sourceStats = allMainStats.find(
    (row) => row.cost === preset.cost && row.rarity === preset.rarity && row.level === preset.level,
  ).stats
  for (const stat of preset.stats) {
    if (!sourceStats.some((other) => JSON.stringify(other) === JSON.stringify(stat))) {
      throw new Error(`Archives/source main-stat mismatch: cost ${preset.cost}, ${stat.stat}`)
    }
  }
  if (sourceStats.length !== preset.stats.length) throw new Error('Main-stat count mismatch')
}
const subStats = echoData.subProps.map((prop) => ({
  property_id: prop.PropId,
  stat: prop.Prop.Name,
  unit: prop.AddType === 2 || prop.Prop.IsPercent ? 'percent' : 'flat',
  source_min: prop.SubStandardProperty,
  source_max: prop.Max,
  min: prop.SubStandardProperty / (prop.AddType === 2 || prop.Prop.IsPercent ? 100 : 1),
  max: prop.Max / (prop.AddType === 2 || prop.Prop.IsPercent ? 100 : 1),
  allowed_rolls: null,
  validation: 'reference-only',
}))
issues.push({
  kind: 'unverified-discrete-substat-rolls',
  detail:
    'Source publishes ranges, not discrete rolls. Ranges disagree with Prydwen for flat ATK/DEF, Energy Regen and Skill DMG. Do not use these as hard input limits; player enters the actual roll.',
  comparison_url: 'https://www.prydwen.gg/wuthering-waves/guides/echo-stats',
})

const manifest = []
const pending = [...assets.values()]
let completed = 0
let previousAssets = new Map()
try {
  const previous = JSON.parse(await readFile(join(output, 'upload-manifest.json'), 'utf8'))
  previousAssets = new Map(previous.map((entry) => [entry.bucket_path, entry]))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
async function imageBuffer(entry) {
  const previous = previousAssets.get(entry.bucket_path)
  if (!refresh && previous?.quality === 'published-optimized-image') {
    entry.source_url = previous.source_url
    entry.original_source_url = previous.original_source_url
    entry.quality = previous.quality
    issues.push({
      kind: 'lower-resolution-portrait',
      bucket_path: entry.bucket_path,
      source_url: entry.source_url,
    })
  }
  try {
    return await download(entry.source_url, join(root, 'images', entry.bucket_path))
  } catch (error) {
    if (!entry.bucket_path.startsWith('builder/portraits/')) throw error
    // Some original PNGs are missing while the exact image published in the
    // character page still exists as a pre-generated, lower-resolution asset.
    const character = characterRows.find((row) => row.portrait_path === entry.bucket_path)
    const page = await sourceFile(character.source_url)
    const images = [...page.matchAll(/src="([^"]*\/images\/iconrolepile\/[^"]+)"/g)]
    const [, published] =
      images.find(([, url]) => url.endsWith(entry.source_url.split('/').pop())) ?? []
    if (!published) throw error
    const original = entry.source_url
    entry.source_url = new URL(published.replace(/&amp;/g, '&'), origin).href
    const buffer = await download(entry.source_url, join(root, 'images', entry.bucket_path))
    entry.original_source_url = original
    entry.quality = 'published-optimized-image'
    issues.push({
      kind: 'lower-resolution-portrait',
      bucket_path: entry.bucket_path,
      source_url: entry.source_url,
    })
    return buffer
  }
}
async function worker() {
  while (pending.length) {
    const entry = pending.shift()
    try {
      const buffer = await imageBuffer(entry)
      if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        throw new Error('Not a PNG image')
      }
      manifest.push({
        ...entry,
        bytes: buffer.length,
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        sha256: createHash('sha256').update(buffer).digest('hex'),
      })
    } catch (error) {
      console.error(`Asset unavailable: ${entry.source_url}: ${error.message}`)
      issues.push({ kind: 'asset-unavailable', ...entry, error: error.message })
    }
    completed += 1
    if (completed % 50 === 0) console.log(`Images: ${completed}/${assets.size}`)
    if (refresh || !previousAssets.has(entry.bucket_path)) await sleep(250)
  }
}
await Promise.all([worker(), worker(), worker()])
const available = new Set(manifest.map((entry) => entry.bucket_path))
function removeMissingPaths(value) {
  if (Array.isArray(value)) return value.map(removeMissingPaths)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key.endsWith('_path') && item && !available.has(item) ? null : removeMissingPaths(item),
    ]),
  )
}
const data = removeMissingPaths({
  fetched_at: fetchedAt,
  sources,
  characters: characterRows,
  weapons: weaponRows,
  rules: {
    stat_definitions: stats,
    echo_main_stats: allMainStats,
    echo_substats: subStats,
    echo_growth: echoGrowth,
  },
})
manifest.sort((a, b) => a.bucket_path.localeCompare(b.bucket_path))
const report = {
  fetched_at: fetchedAt,
  counts: {
    characters: new Set(characterRows.map((row) => row.character_slug)).size,
    character_variants: characterRows.length,
    weapons: weaponRows.length,
    stat_definitions: stats.length,
    echo_substats: subStats.length,
    echo_main_stat_presets: allMainStats.length,
    images: manifest.length,
    bytes: manifest.reduce((total, entry) => total + entry.bytes, 0),
  },
  issues,
}
for (const [filename, value] of [
  ['data.json', data],
  ['upload-manifest.json', manifest],
  ['report.json', report],
]) {
  await writeFile(join(output, filename), JSON.stringify(value, null, 2) + '\n')
}
console.log(JSON.stringify(report, null, 2))
