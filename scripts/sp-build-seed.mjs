// Builds sp-data/seed/sp-NN.sql from sp-data/characters/*.json (run scripts/sp-scrape.mjs first).
// Every file is self-contained: it upserts the traits and gifts its characters use, then replaces
// each character's child rows, so files can be run in any order and re-run safely.
// Usage: node scripts/sp-build-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../sp-data/', import.meta.url)
const charactersDir = new URL('characters/', root)
const seedDir = new URL('seed/', root)
const PER_FILE = 5
const SOURCE = {
  name: 'Hideout Guides',
  url: 'https://www.hideoutgacha.com/games/silver-palace/character-information',
}

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
const text = (value) => {
  if (value == null || value === '') return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
const number = (value) => (value == null || Number.isNaN(value) ? 'null' : String(Number(value)))
const json = (value) => `${text(JSON.stringify(value ?? []))}::jsonb`

// "124%" -> { num: 124, unit: '%' }; "1,251.6%" -> 1251.6; text with no leading number -> null.
function splitValue(value) {
  const match = /^(-?[\d,]*\.?\d+)\s*(.*)$/.exec(String(value).trim())
  if (!match) return { num: null, unit: null }
  return { num: Number(match[1].replace(/,/g, '')), unit: match[2] || null }
}

const slugOf = (value) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const traitSql = (trait) =>
  `insert into sp_traits (kind, slug, name, image_path) values (${[
    text(trait.kind),
    text(trait.slug),
    text(trait.name),
    text(trait.image_path),
  ].join(
    ', ',
  )})\n  on conflict (kind, slug) do update set name = excluded.name, image_path = excluded.image_path;`

const giftSql = (gift) =>
  `insert into sp_gifts (slug, name, image_path) values (${[text(gift.slug), text(gift.name), text(gift.image_path)].join(', ')})\n  on conflict (slug) do update set name = excluded.name, image_path = excluded.image_path;`

const traitId = (trait) =>
  trait
    ? `(select id from sp_traits where kind = ${text(trait.kind)} and slug = ${text(trait.slug)})`
    : 'null'

const values = (rows) => rows.map((row) => `    (${row.join(', ')})`).join(',\n')

function characterSql(character, order) {
  const slug = character.slug
  const parts = [`-- ${character.name}`]
  const { attribute, combat_style: combatStyle, identity, faction } = character.traits

  parts.push(
    `insert into sp_characters
  (slug, name, title, weapon, rarity, accent_color, attribute_id, combat_style_id, identity_id, faction_id,
   image_path, banner_path, sort_order, sources)
values (${[
      text(slug),
      text(character.name),
      text(character.title),
      text(character.weapon),
      number(character.rarity),
      text(character.accent_color),
      traitId(attribute),
      traitId(combatStyle),
      traitId(identity),
      traitId(faction),
      text(character.image_path),
      text(character.banner_path),
      number(order),
      json([SOURCE]),
    ].join(', ')})
on conflict (slug) do update set
  name = excluded.name, title = excluded.title, weapon = excluded.weapon, rarity = excluded.rarity,
  accent_color = excluded.accent_color, attribute_id = excluded.attribute_id,
  combat_style_id = excluded.combat_style_id, identity_id = excluded.identity_id,
  faction_id = excluded.faction_id, image_path = excluded.image_path, banner_path = excluded.banner_path,
  sort_order = excluded.sort_order, sources = excluded.sources;`,
  )

  // Child rows are replaced wholesale so a refreshed scrape never leaves stale rows behind.
  const wipe = [
    'sp_character_stats',
    'sp_character_gifts',
    'sp_character_trust_levels',
    'sp_character_skills',
    'sp_character_psyches',
  ]
  parts.push(
    wipe
      .map(
        (table) =>
          `delete from ${table} where character_id = (select id from sp_characters where slug = ${text(slug)});`,
      )
      .join('\n'),
  )

  if (character.stats.length) {
    parts.push(
      `insert into sp_character_stats (character_id, level, hp, atk, def)
select c.id, v.level, v.hp, v.atk, v.def
from sp_characters c, (values\n${values(
        character.stats.map((s) => [number(s.level), number(s.hp), number(s.atk), number(s.def)]),
      )}\n) as v(level, hp, atk, def)
where c.slug = ${text(slug)};`,
    )
  }

  if (character.trust.gifts.length) {
    parts.push(
      `insert into sp_character_gifts (character_id, gift_id, position)
select c.id, g.id, v.position
from sp_characters c, (values\n${values(
        character.trust.gifts.map((g) => [text(g.slug), number(g.position)]),
      )}\n) as v(gift_slug, position) join sp_gifts g on g.slug = v.gift_slug
where c.slug = ${text(slug)};`,
    )
  }

  if (character.trust.levels.length) {
    parts.push(
      `insert into sp_character_trust_levels (character_id, level, exp, running_total, gifts_required, rewards)
select c.id, v.level, v.exp, v.running_total, v.gifts_required, v.rewards
from sp_characters c, (values\n${values(
        character.trust.levels.map((l) => [
          number(l.level),
          `${number(l.exp)}::integer`,
          number(l.running_total),
          number(l.gifts),
          json(l.rewards),
        ]),
      )}\n) as v(level, exp, running_total, gifts_required, rewards)
where c.slug = ${text(slug)};`,
    )
  }

  if (character.skills.length) {
    parts.push(
      `insert into sp_character_skills (character_id, position, code, name, kind, image_path, description)
select c.id, v.position, v.code, v.name, v.kind, v.image_path, v.description
from sp_characters c, (values\n${values(
        character.skills.map((s) => [
          number(s.position),
          text(s.code),
          text(s.name),
          text(s.kind),
          text(s.image_path),
          json(s.body),
        ]),
      )}\n) as v(position, code, name, kind, image_path, description)
where c.slug = ${text(slug)};`,
    )

    const scaling = character.skills.flatMap((skill) =>
      skill.levels.flatMap((level) =>
        level.values.map((value, index) => {
          const { num, unit } = splitValue(value)
          return [
            number(skill.position),
            number(level.level),
            number(index + 1),
            text(skill.columns[index]),
            text(value),
            `${number(num)}::numeric`,
            `${text(unit)}::text`,
          ]
        }),
      ),
    )
    if (scaling.length) {
      parts.push(
        `insert into sp_skill_scaling (skill_id, level, position, label, value, value_num, unit)
select s.id, v.level, v.position, v.label, v.value, v.value_num, v.unit
from sp_characters c
join sp_character_skills s on s.character_id = c.id
join (values\n${values(scaling)}\n) as v(skill_position, level, position, label, value, value_num, unit)
  on v.skill_position = s.position
where c.slug = ${text(slug)};`,
      )
    }
  }

  if (character.psyches.length) {
    parts.push(
      `insert into sp_character_psyches (character_id, position, badge, name, description, image_path)
select c.id, v.position, v.badge, v.name, v.description, v.image_path
from sp_characters c, (values\n${values(
        character.psyches.map((p) => [
          number(p.position),
          text(p.badge),
          text(p.name),
          text(p.description),
          text(p.image_path),
        ]),
      )}\n) as v(position, badge, name, description, image_path)
where c.slug = ${text(slug)};`,
    )
  }

  return `${parts.join('\n\n')}\n`
}

{
  const files = (await readdir(charactersDir)).filter((file) => file.endsWith('.json')).sort()
  const characters = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(new URL(file, charactersDir), 'utf8'))),
  )
  // Rarity first, then name, so sort_order matches how the archive lists them.
  characters.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
  for (const character of characters) {
    for (const gift of character.trust.gifts) gift.slug = slugOf(gift.name)
  }

  await mkdir(seedDir, { recursive: true })
  for (let index = 0; index * PER_FILE < characters.length; index += 1) {
    const chunk = characters.slice(index * PER_FILE, (index + 1) * PER_FILE)
    const traits = new Map()
    const gifts = new Map()
    for (const character of chunk) {
      for (const trait of Object.values(character.traits))
        traits.set(`${trait.kind}/${trait.slug}`, trait)
      for (const gift of character.trust.gifts) gifts.set(gift.slug, gift)
    }
    const sql = [
      `-- Silver Palace characters: ${chunk.map((c) => c.name).join(', ')}`,
      '-- Run db/silver-palace-schema.sql first. Safe to re-run.',
      '',
      '-- Shared lookups',
      [...traits.values()].map(traitSql).join('\n'),
      [...gifts.values()].map(giftSql).join('\n'),
      '',
      ...chunk.map((character, i) => characterSql(character, index * PER_FILE + i + 1)),
    ].join('\n')
    const name = `sp-${String(index + 1).padStart(2, '0')}.sql`
    await writeFile(new URL(name, seedDir), sql)
    console.log(`${name}: ${chunk.map((c) => c.name).join(', ')}`)
  }
}
