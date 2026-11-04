// Builds wuwa-data/seed/weapons-NN.sql from wuwa-data/weapons/*.json (run scraper/parse-weapons.mjs first).
// Usage: node scripts/wuwa-build-weapon-seed.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../wuwa-data/', import.meta.url)
const weaponsDir = new URL('weapons/', root)
const seedDir = new URL('seed/', root)
const PER_FILE = 30

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
const text = (value) => {
  if (value == null || value === '') return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
const number = (value) => (value == null || Number.isNaN(value) ? 'null' : String(Number(value)))
const json = (value) => `${text(JSON.stringify(value ?? []))}::jsonb`

function weaponSql(weapon) {
  return [
    `-- ${weapon.name}`,
    'insert into wuwa_weapons',
    '  (slug, name, rarity, weapon_type, image_path, atk, sub_stat, sub_value, skill_name, skill_text, max_level,',
    '   syntony, levels, lore, recommended, obtain, sources)',
    `values (${[
      text(weapon.slug),
      text(weapon.name),
      number(weapon.rarity),
      text(weapon.weapon_type),
      text(`weapons/${weapon.slug}.png`),
      number(weapon.atk),
      text(weapon.sub_stat),
      text(weapon.sub_value),
      text(weapon.skill_name),
      text(weapon.skill_text),
      number(weapon.max_level ?? 90),
      json(weapon.syntony),
      json(weapon.levels),
      text(weapon.lore),
      json(weapon.recommended),
      text(weapon.obtain),
      json(weapon.sources),
    ].join(', ')})`,
    'on conflict (slug) do update set',
    '  name = excluded.name, rarity = excluded.rarity, weapon_type = excluded.weapon_type,',
    '  image_path = excluded.image_path, atk = excluded.atk, sub_stat = excluded.sub_stat,',
    '  sub_value = excluded.sub_value, skill_name = excluded.skill_name, skill_text = excluded.skill_text,',
    '  max_level = excluded.max_level,',
    '  syntony = excluded.syntony, levels = excluded.levels, lore = excluded.lore,',
    '  recommended = excluded.recommended, obtain = excluded.obtain, sources = excluded.sources;',
    '',
  ].join('\n')
}

const files = (await readdir(weaponsDir)).filter((file) => file.endsWith('.json')).sort()
const weapons = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(file, weaponsDir), 'utf8'))),
)
await mkdir(seedDir, { recursive: true })
for (let index = 0; index * PER_FILE < weapons.length; index += 1) {
  const chunk = weapons.slice(index * PER_FILE, (index + 1) * PER_FILE)
  const name = `weapons-${String(index + 1).padStart(2, '0')}.sql`
  await writeFile(new URL(name, seedDir), chunk.map(weaponSql).join('\n'))
  console.log(`${name}: ${chunk.length} weapons`)
}
