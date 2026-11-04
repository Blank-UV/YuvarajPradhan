// Builds sp-data/seed/sp-motives.sql from sp-data/motives/*.json (run scripts/sp-scrape-motives.mjs
// first). Upserts by game id and replaces each motive's ranks, so the file can be re-run.
// Identities that no character uses yet are added to sp_traits without overwriting existing icons.
// Usage: node scripts/sp-build-motives-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { json, number, text } from './sp-sql.mjs'

const root = new URL('../sp-data/', import.meta.url)
const SOURCE = {
  name: 'Hideout Guides',
  url: 'https://www.hideoutgacha.com/games/silver-palace/database/motives',
}

const files = (await readdir(new URL('motives/', root)))
  .filter((file) => file.endsWith('.json'))
  .sort()
const motives = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(`motives/${file}`, root), 'utf8'))),
)
// Rarest first, then by game id, which groups motives the way the game numbers them.
motives.sort((a, b) => b.rarity - a.rarity || a.source_id - b.source_id)

const identities = new Map()
for (const motive of motives)
  if (motive.identity) identities.set(motive.identity.slug, motive.identity)

const parts = [
  `-- Silver Palace motives: ${motives.length} entries`,
  '-- Run db/silver-palace-schema.sql and db/silver-palace-motives-schema.sql first. Safe to re-run.',
  '',
  '-- Identities (existing rows, and their icons, are left untouched)',
  ...[...identities.values()].map(
    (identity) =>
      `insert into sp_traits (kind, slug, name) values ('identity', ${text(identity.slug)}, ${text(identity.name)})\n  on conflict (kind, slug) do nothing;`,
  ),
  '',
]

for (const motive of motives) {
  const identity = motive.identity
    ? `(select id from sp_traits where kind = 'identity' and slug = ${text(motive.identity.slug)})`
    : 'null'
  parts.push(
    `-- ${motive.name}`,
    `insert into sp_motives
  (slug, source_id, name, rarity, identity_id, skill_name, base_hp, base_atk, bonus_stat, bonus_value,
   description, lore, image_path, sources)
values (${[
      text(motive.slug),
      number(motive.source_id),
      text(motive.name),
      number(motive.rarity),
      identity,
      text(motive.skill_name),
      number(motive.base_hp),
      number(motive.base_atk),
      text(motive.bonus_stat),
      text(motive.bonus_value),
      text(motive.description),
      text(motive.lore),
      text(motive.image_path),
      json([SOURCE]),
    ].join(', ')})
on conflict (source_id) do update set
  slug = excluded.slug, name = excluded.name, rarity = excluded.rarity, identity_id = excluded.identity_id,
  skill_name = excluded.skill_name, base_hp = excluded.base_hp, base_atk = excluded.base_atk,
  bonus_stat = excluded.bonus_stat, bonus_value = excluded.bonus_value, description = excluded.description,
  lore = excluded.lore, image_path = excluded.image_path, sources = excluded.sources;`,
    `delete from sp_motive_ranks where motive_id = (select id from sp_motives where source_id = ${number(motive.source_id)});`,
    `insert into sp_motive_ranks (motive_id, rank, description)
select m.id, v.rank, v.description
from sp_motives m, (values
${motive.ranks.map((rank) => `    (${number(rank.rank)}, ${text(rank.description)})`).join(',\n')}
) as v(rank, description)
where m.source_id = ${number(motive.source_id)};`,
    '',
  )
}

await mkdir(new URL('seed/', root), { recursive: true })
await writeFile(new URL('seed/sp-motives.sql', root), parts.join('\n'))
console.log(`sp-motives.sql: ${motives.length} motives, ${identities.size} identities`)
