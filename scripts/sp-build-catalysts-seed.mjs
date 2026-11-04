// Builds sp-data/seed/sp-catalysts.sql from sp-data/catalysts/*.json (run
// scripts/sp-scrape-catalysts.mjs first). Upserts by game id and replaces each catalyst's sources,
// so the file can be re-run.
// Usage: node scripts/sp-build-catalysts-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { json, number, text } from './sp-sql.mjs'

const root = new URL('../sp-data/', import.meta.url)
const SOURCE = {
  name: 'Hideout Guides',
  url: 'https://www.hideoutgacha.com/games/silver-palace/database/catalysts',
}

const files = (await readdir(new URL('catalysts/', root)))
  .filter((file) => file.endsWith('.json'))
  .sort()
const items = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(`catalysts/${file}`, root), 'utf8'))),
)
items.sort((a, b) => a.source_id - b.source_id)

const parts = [
  `-- Silver Palace catalysts: ${items.length} entries`,
  '-- Run db/silver-palace-schema.sql and db/silver-palace-catalysts-schema.sql first. Safe to re-run.',
  '',
]

for (const item of items) {
  parts.push(
    `-- ${item.name}`,
    `insert into sp_catalysts (slug, source_id, name, rarity, type, description, max_stack, image_path, sources)
values (${[
      text(item.slug),
      number(item.source_id),
      text(item.name),
      number(item.rarity),
      text(item.type),
      text(item.description),
      number(item.max_stack),
      text(item.image_path),
      json([SOURCE]),
    ].join(', ')})
on conflict (source_id) do update set
  slug = excluded.slug, name = excluded.name, rarity = excluded.rarity, type = excluded.type,
  description = excluded.description, max_stack = excluded.max_stack, image_path = excluded.image_path,
  sources = excluded.sources;`,
    `delete from sp_catalyst_sources where catalyst_id = (select id from sp_catalysts where source_id = ${number(item.source_id)});`,
  )
  if (item.obtain.length) {
    parts.push(
      `insert into sp_catalyst_sources (catalyst_id, position, name)
select c.id, v.position, v.name
from sp_catalysts c, (values
${item.obtain.map((name, index) => `    (${index + 1}, ${text(name)})`).join(',\n')}
) as v(position, name)
where c.source_id = ${number(item.source_id)};`,
    )
  }
  parts.push('')
}

await mkdir(new URL('seed/', root), { recursive: true })
await writeFile(new URL('seed/sp-catalysts.sql', root), parts.join('\n'))
console.log(`sp-catalysts.sql: ${items.length} catalysts`)
