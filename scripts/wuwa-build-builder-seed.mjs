// Usage: node scripts/wuwa-build-builder-seed.mjs
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { sqlJson, sqlText } from './wuwa-builder-data.mjs'

const root = new URL('../wuwa-data/builder/', import.meta.url)
const data = JSON.parse(await readFile(new URL('data.json', root), 'utf8'))
const manifest = JSON.parse(await readFile(new URL('upload-manifest.json', root), 'utf8'))
const report = JSON.parse(await readFile(new URL('report.json', root), 'utf8'))
if (!data.characters.length || !data.weapons.length || !data.rules.echo_main_stats.length) {
  throw new Error('Empty reference data; run wuwa-fetch-builder-data.mjs first')
}
if (Number.isNaN(Date.parse(data.fetched_at))) throw new Error('Invalid collection timestamp')

const available = new Set()
for (const image of manifest) {
  if (
    !/^builder\/(?:portraits|skills|sequences|elements|stats)\/[\w.-]+\.png$/.test(
      image.bucket_path,
    )
  ) {
    throw new Error(`Unsafe bucket path ${image.bucket_path}`)
  }
  if (available.has(image.bucket_path)) throw new Error(`Duplicate image ${image.bucket_path}`)
  const buffer = await readFile(new URL(`../images/${image.bucket_path}`, root))
  if (
    buffer.length !== image.bytes ||
    createHash('sha256').update(buffer).digest('hex') !== image.sha256 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.readUInt32BE(16) !== image.width ||
    buffer.readUInt32BE(20) !== image.height
  ) {
    throw new Error(`Image validation failed: ${image.bucket_path}`)
  }
  available.add(image.bucket_path)
}
function validatePaths(value) {
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith('_path') && item && !available.has(item)) {
      throw new Error(`Unresolved image reference ${item}`)
    }
    validatePaths(item)
  }
}
validatePaths(data)

const fetched = sqlText(data.fetched_at)
const jsonColumns = new Set(['base_stats', 'level_stats', 'skills', 'sequences', 'rank_parameters'])
function upsert(table, row, keys) {
  const columns = Object.keys(row)
  if (columns.some((name) => !/^[a-z_]+$/.test(name))) throw new Error('Invalid column')
  const values = columns.map((key) => {
    const value = row[key]
    if (jsonColumns.has(key)) return value == null ? 'null' : sqlJson(value)
    if (typeof value === 'boolean') return String(value)
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value)) throw new Error(`Invalid integer ${key}`)
      return String(value)
    }
    return sqlText(value)
  })
  return [
    `insert into ${table} (${columns.join(', ')}, fetched_at)`,
    `values (${values.join(', ')}, ${fetched})`,
    `on conflict (${keys.join(', ')}) do update set`,
    [...columns.filter((key) => !keys.includes(key)), 'fetched_at']
      .map((key) => `  ${key} = excluded.${key}`)
      .join(',\n') + ';',
  ].join('\n')
}

const seedDir = new URL('seed/', root)
await mkdir(seedDir, { recursive: true })
// Only remove this generator's obsolete parts, never Archives seed files.
for (const filename of await readdir(seedDir)) {
  if (/^(?:01-rules|02-characters-\d+|03-weapons-\d+)\.sql$/.test(filename)) {
    await rm(new URL(filename, seedDir))
  }
}
const files = []
async function save(name, statements) {
  await writeFile(new URL(name, seedDir), ['begin;', ...statements, 'commit;', ''].join('\n\n'))
  files.push(name)
}
await save(
  '01-rules.sql',
  Object.entries(data.rules).map(
    ([key, value]) =>
      `insert into wuwa_builder_rules (key, data, sources, fetched_at)\n` +
      `values (${sqlText(key)}, ${sqlJson(value)}, ${sqlJson(data.sources)}, ${fetched})\n` +
      'on conflict (key) do update set data = excluded.data, sources = excluded.sources, fetched_at = excluded.fetched_at;',
  ),
)
for (const [prefix, table, rows, size, keys] of [
  ['02-characters', 'wuwa_builder_characters', data.characters, 5, ['character_slug', 'game_id']],
  ['03-weapons', 'wuwa_builder_weapons', data.weapons, 25, ['weapon_slug']],
]) {
  for (let offset = 0; offset < rows.length; offset += size) {
    await save(
      `${prefix}-${String(offset / size + 1).padStart(2, '0')}.sql`,
      rows.slice(offset, offset + size).map((row) => upsert(table, row, keys)),
    )
  }
}
console.log(
  `Validated ${manifest.length} images and wrote ${files.length} SQL files in wuwa-data\\builder\\seed.`,
)
console.log(JSON.stringify({ counts: report.counts, files, issues: report.issues }, null, 2))
