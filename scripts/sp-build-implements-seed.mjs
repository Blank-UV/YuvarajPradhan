// Builds sp-data/seed/sp-implements.sql from sp-data/implements/*.json (run
// scripts/sp-scrape-implements.mjs first). Upserts by site id and replaces each set's pieces and
// stats, so the file can be re-run.
// Usage: node scripts/sp-build-implements-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { json, number, text } from './sp-sql.mjs'

const root = new URL('../sp-data/', import.meta.url)
const SOURCE = {
  name: 'Hideout Guides',
  url: 'https://www.hideoutgacha.com/games/silver-palace/database/implements',
}

const files = (await readdir(new URL('implements/', root)))
  .filter((file) => file.endsWith('.json'))
  .sort()
const items = await Promise.all(
  files.map(async (file) =>
    JSON.parse(await readFile(new URL(`implements/${file}`, root), 'utf8')),
  ),
)
items.sort((a, b) => a.source_id - b.source_id)

const parts = [
  `-- Silver Palace implements: ${items.length} sets`,
  '-- Run db/silver-palace-schema.sql and db/silver-palace-implements-schema.sql first. Safe to re-run.',
  '',
]

for (const item of items) {
  const id = number(item.source_id)
  parts.push(
    `-- ${item.name}`,
    `insert into sp_implements (slug, source_id, name, rarity, type, description, lore, max_stack, image_path, sources)
values (${[
      text(item.slug),
      id,
      text(item.name),
      number(item.rarity),
      text(item.type),
      text(item.description),
      text(item.lore),
      number(item.max_stack),
      text(item.image_path),
      json([SOURCE]),
    ].join(', ')})
on conflict (source_id) do update set
  slug = excluded.slug, name = excluded.name, rarity = excluded.rarity, type = excluded.type,
  description = excluded.description, lore = excluded.lore, max_stack = excluded.max_stack,
  image_path = excluded.image_path, sources = excluded.sources;`,
    `delete from sp_implement_pieces where implement_id = (select id from sp_implements where source_id = ${id});`,
    `insert into sp_implement_pieces (implement_id, position, name, image_path)
select s.id, v.position, v.name, v.image_path
from sp_implements s, (values
${item.pieces
  .map((piece) => `    (${piece.position}, ${text(piece.name)}, ${text(piece.image_path)})`)
  .join(',\n')}
) as v(position, name, image_path)
where s.source_id = ${id};`,
  )
  const rows = item.pieces.flatMap((piece) =>
    piece.stats.flatMap((stat) =>
      stat.levels.map(
        (entry) =>
          `    (${piece.position}, ${stat.position}, ${number(entry.level)}, ${text(stat.label)}, ${text(entry.value)}, ${number(entry.num)})`,
      ),
    ),
  )
  parts.push(
    `insert into sp_implement_stats (piece_id, position, level, label, value, num)
select p.id, v.stat_position, v.level, v.label, v.value, v.num
from sp_implements s
join sp_implement_pieces p on p.implement_id = s.id
join (values
${rows.join(',\n')}
) as v(piece_position, stat_position, level, label, value, num) on v.piece_position = p.position
where s.source_id = ${id};`,
    '',
  )
}

await mkdir(new URL('seed/', root), { recursive: true })
await writeFile(new URL('seed/sp-implements.sql', root), parts.join('\n'))
console.log(`sp-implements.sql: ${items.length} implements`)
