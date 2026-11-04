// Builds wuwa-data/seed/echoes-NN.sql from wuwa-data/echoes/*.json (run scraper/parse-echoes.mjs first).
// Usage: node scripts/wuwa-build-echo-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../wuwa-data/', import.meta.url)
const echoesDir = new URL('echoes/', root)
const seedDir = new URL('seed/', root)
const PER_FILE = 50

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
const text = (value) => {
  if (value == null || value === '') return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
const number = (value) => (value == null || Number.isNaN(value) ? 'null' : String(Number(value)))
const json = (value) => `${text(JSON.stringify(value))}::jsonb`

function echoSql(echo) {
  return [
    `-- ${echo.name}`,
    'insert into wuwa_echoes',
    '  (slug, name, number, cost, class, image_path, main_stats, sub_stats, skill_text, skill_rank,',
    '   cooldown, sonata_effects, where_to_get, drops)',
    `values (${[
      text(echo.slug),
      text(echo.name),
      text(echo.number),
      number(echo.cost),
      text(echo.class),
      text(`echoes/${echo.slug}.png`),
      json(echo.main_stats ?? []),
      json(echo.sub_stats ?? []),
      text(echo.skill_text),
      text(echo.skill_rank),
      number(echo.cooldown),
      json(echo.sonata_effects ?? []),
      json(echo.where_to_get ?? []),
      json(echo.drops ?? []),
    ].join(', ')})`,
    'on conflict (slug) do update set',
    '  name = excluded.name, number = excluded.number, cost = excluded.cost, class = excluded.class,',
    '  image_path = excluded.image_path, main_stats = excluded.main_stats, sub_stats = excluded.sub_stats,',
    '  skill_text = excluded.skill_text, skill_rank = excluded.skill_rank, cooldown = excluded.cooldown,',
    '  sonata_effects = excluded.sonata_effects, where_to_get = excluded.where_to_get,',
    '  drops = excluded.drops;',
    '',
  ].join('\n')
}

const files = (await readdir(echoesDir)).filter((file) => file.endsWith('.json')).sort()
const echoes = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(file, echoesDir), 'utf8'))),
)
await mkdir(seedDir, { recursive: true })
for (let index = 0; index * PER_FILE < echoes.length; index += 1) {
  const chunk = echoes.slice(index * PER_FILE, (index + 1) * PER_FILE)
  const name = `echoes-${String(index + 1).padStart(2, '0')}.sql`
  await writeFile(new URL(name, seedDir), chunk.map(echoSql).join('\n'))
  console.log(`${name}: ${chunk.length} echoes`)
}
