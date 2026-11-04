// Builds wuwa-data/seed/sonata-01.sql from wuwa-data/sonata/*.json (run scraper/parse-sonata.mjs first).
// Usage: node scripts/wuwa-build-sonata-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../wuwa-data/', import.meta.url)
const sonataDir = new URL('sonata/', root)
const seedDir = new URL('seed/', root)

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
const text = (value) => {
  if (value == null || value === '') return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
const json = (value) => `${text(JSON.stringify(value))}::jsonb`

function setSql(set) {
  return [
    `-- ${set.name}`,
    'insert into wuwa_sonata_effects',
    '  (slug, name, element, image_path, bonuses, best_characters, optional_characters, main_stats,',
    '   where_to_get, echoes, notes)',
    `values (${[
      text(set.slug),
      text(set.name),
      text(set.element),
      text(`sonata/${set.slug}.png`),
      json(set.bonuses ?? []),
      json(set.best ?? []),
      json(set.optional ?? []),
      json(set.main_stats ?? {}),
      json(set.where_to_get ?? []),
      json(set.echoes ?? []),
      json(set.notes ?? []),
    ].join(', ')})`,
    'on conflict (slug) do update set',
    '  name = excluded.name, element = excluded.element, image_path = excluded.image_path,',
    '  bonuses = excluded.bonuses, best_characters = excluded.best_characters,',
    '  optional_characters = excluded.optional_characters, main_stats = excluded.main_stats,',
    '  where_to_get = excluded.where_to_get, echoes = excluded.echoes, notes = excluded.notes;',
    '',
  ].join('\n')
}

const files = (await readdir(sonataDir)).filter((file) => file.endsWith('.json')).sort()
const sets = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(file, sonataDir), 'utf8'))),
)
await mkdir(seedDir, { recursive: true })
await writeFile(new URL('sonata-01.sql', seedDir), sets.map(setSql).join('\n'))
console.log(`sonata-01.sql: ${sets.length} sonata effects`)
