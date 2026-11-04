// Builds wuwa-data/seed.sql from wuwa-data/characters/*.json.
// Usage: node scripts/wuwa-build-seed.mjs
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'

const root = new URL('../wuwa-data/', import.meta.url)
const charactersDir = new URL('characters/', root)

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
const text = (value) => {
  if (value == null) return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
const number = (value) => (value == null ? 'null' : String(Number(value)))
const json = (value) => `${text(JSON.stringify(value ?? []))}::jsonb`

function characterSql(character) {
  const slug = text(character.slug)
  const lines = [
    `-- ${character.name}`,
    'insert into wuwa_characters',
    '  (slug, name, rarity, element, weapon_type, image_path, is_new, release_version,',
    '   hp, atk, def, max_energy, crit_rate, crit_dmg, healing_bonus, element_dmg_bonus, minor_fortes)',
    `values (${[
      slug,
      text(character.name),
      number(character.rarity),
      text(character.element),
      text(character.weapon_type),
      text(character.image_path),
      character.is_new ? 'true' : 'false',
      text(character.release_version),
      number(character.hp),
      number(character.atk),
      number(character.def),
      number(character.max_energy),
      number(character.crit_rate),
      number(character.crit_dmg),
      number(character.healing_bonus),
      number(character.element_dmg_bonus),
      json(character.minor_fortes),
    ].join(', ')})`,
    'on conflict (slug) do update set',
    '  name = excluded.name, rarity = excluded.rarity, element = excluded.element,',
    '  weapon_type = excluded.weapon_type, image_path = excluded.image_path, is_new = excluded.is_new,',
    '  release_version = excluded.release_version, hp = excluded.hp, atk = excluded.atk,',
    '  def = excluded.def, max_energy = excluded.max_energy, crit_rate = excluded.crit_rate,',
    '  crit_dmg = excluded.crit_dmg, healing_bonus = excluded.healing_bonus,',
    '  element_dmg_bonus = excluded.element_dmg_bonus, minor_fortes = excluded.minor_fortes;',
    '',
    `delete from wuwa_character_skills where character_id = (select id from wuwa_characters where slug = ${slug});`,
    `delete from wuwa_character_sequences where character_id = (select id from wuwa_characters where slug = ${slug});`,
    `delete from wuwa_character_materials where character_id = (select id from wuwa_characters where slug = ${slug});`,
  ]

  ;(character.skills ?? []).forEach((skill, index) => {
    lines.push(
      'insert into wuwa_character_skills (character_id, tab, kind, name, description, entries, multipliers, body, sort_order)',
      `select id, ${text(skill.tab)}, ${text(skill.kind)}, ${text(skill.name)}, ${text(skill.description)}, ${json(skill.entries)}, ${skill.multipliers == null ? 'null' : json(skill.multipliers)}, ${skill.body == null ? 'null' : json(skill.body)}, ${index}`,
      `from wuwa_characters where slug = ${slug};`,
    )
  })
  ;(character.sequences ?? []).forEach((sequence) => {
    lines.push(
      'insert into wuwa_character_sequences (character_id, node, name, description, body)',
      `select id, ${number(sequence.node)}, ${text(sequence.name)}, ${text(sequence.description)}, ${sequence.body == null ? 'null' : json(sequence.body)}`,
      `from wuwa_characters where slug = ${slug};`,
    )
  })
  ;(character.materials ?? []).forEach((material, index) => {
    lines.push(
      'insert into wuwa_character_materials (character_id, category, name, quantity, sort_order)',
      `select id, ${text(material.category)}, ${text(material.name)}, ${number(material.quantity)}, ${index}`,
      `from wuwa_characters where slug = ${slug};`,
    )
  })
  lines.push('')
  return lines.join('\n')
}

const files = (await readdir(charactersDir)).filter((name) => name.endsWith('.json')).sort()
const PART_SIZE = 5
const seedDir = new URL('seed/', root)
await mkdir(seedDir, { recursive: true })
for (const stale of await readdir(seedDir)) await rm(new URL(stale, seedDir))

// Several small files keep each paste into the Supabase SQL editor manageable.
let parts = 0
for (let start = 0; start < files.length; start += PART_SIZE) {
  const statements = ['begin;', '']
  for (const file of files.slice(start, start + PART_SIZE)) {
    const character = JSON.parse(await readFile(new URL(file, charactersDir), 'utf8'))
    statements.push(characterSql(character))
  }
  statements.push('commit;', '')
  parts += 1
  await writeFile(
    new URL(`seed-${String(parts).padStart(2, '0')}.sql`, seedDir),
    statements.join('\n'),
  )
}
console.log(`Wrote ${parts} file(s) in wuwa-data/seed/ for ${files.length} character(s).`)
