// Builds sp-data/seed/sp-epiphanies.sql from sp-data/epiphanies/*.json (run
// scripts/sp-scrape-epiphanies.mjs first). Upserts by game id and replaces each epiphany's substats,
// so the file can be re-run.
// Usage: node scripts/sp-build-epiphanies-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { json, number, text } from './sp-sql.mjs'

const root = new URL('../sp-data/', import.meta.url)
const SOURCE = {
  name: 'Hideout Guides',
  url: 'https://www.hideoutgacha.com/games/silver-palace/database/epiphanies',
}

const files = (await readdir(new URL('epiphanies/', root)))
  .filter((file) => file.endsWith('.json'))
  .sort()
const items = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(new URL(`epiphanies/${file}`, root), 'utf8')),
  ),
)
items.sort((a, b) => a.source_id - b.source_id)
const addendums = JSON.parse(await readFile(new URL('epiphany-addendums.json', root), 'utf8'))

const parts = [
  `-- Silver Palace epiphanies: ${items.length} entries`,
  '-- Run db/silver-palace-schema.sql and db/silver-palace-epiphanies-schema.sql first. Safe to re-run.',
  '',
  '-- Possible addendums of any-character Ink (shared by every epiphany)',
  'delete from sp_epiphany_addendums;',
  `insert into sp_epiphany_addendums (position, label, value, value_num, unit) values\n${addendums
    .map(
      (row) =>
        `    (${number(row.position)}, ${text(row.label)}, ${text(row.value)}, ${number(row.num)}, ${text(row.unit)})`,
    )
    .join(',\n')};`,
  '',
]

for (const item of items) {
  const main = item.main_stat
  parts.push(
    `-- ${item.name}`,
    `insert into sp_epiphanies
  (slug, source_id, name, rarity, type, level, main_stat_label, main_stat_value, main_stat_num,
   main_stat_unit, description, lore, image_path, sources)
values (${[
      text(item.slug),
      number(item.source_id),
      text(item.name),
      number(item.rarity),
      text(item.type),
      number(item.level),
      text(main?.label),
      text(main?.value),
      number(main?.num),
      text(main?.unit),
      text(item.description),
      text(item.lore),
      text(item.image_path),
      json([SOURCE]),
    ].join(', ')})
on conflict (source_id) do update set
  slug = excluded.slug, name = excluded.name, rarity = excluded.rarity, type = excluded.type,
  level = excluded.level, main_stat_label = excluded.main_stat_label,
  main_stat_value = excluded.main_stat_value, main_stat_num = excluded.main_stat_num,
  main_stat_unit = excluded.main_stat_unit, description = excluded.description, lore = excluded.lore,
  image_path = excluded.image_path, sources = excluded.sources;`,
    `delete from sp_epiphany_substats where epiphany_id = (select id from sp_epiphanies where source_id = ${number(item.source_id)});`,
  )
  if (item.substats.length) {
    parts.push(
      `insert into sp_epiphany_substats (epiphany_id, position, label, value, value_num, unit)
select e.id, v.position, v.label, v.value, v.value_num, v.unit
from sp_epiphanies e, (values
${item.substats
  .map(
    (sub) =>
      `    (${number(sub.position)}, ${text(sub.label)}, ${text(sub.value)}, ${number(sub.num)}::numeric, ${text(sub.unit)}::text)`,
  )
  .join(',\n')}
) as v(position, label, value, value_num, unit)
where e.source_id = ${number(item.source_id)};`,
    )
  }
  parts.push('')
}

await mkdir(new URL('seed/', root), { recursive: true })
await writeFile(new URL('seed/sp-epiphanies.sql', root), parts.join('\n'))
console.log(`sp-epiphanies.sql: ${items.length} epiphanies`)
