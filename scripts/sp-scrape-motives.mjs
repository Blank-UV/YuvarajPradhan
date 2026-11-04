// Collects every Silver Palace Motive from hideoutgacha.com into sp-data/motives/<slug>.json and
// downloads the icons into sp-data/images/motives/ (the Storage path is saved as image_path).
// Usage: node scripts/sp-scrape-motives.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, decodeFlight, download, findObject, getText, root, slugify } from './sp-lib.mjs'

const URL_MOTIVES = `${SITE}/games/silver-palace/database/motives`
const number = (value) =>
  Number(
    String(value)
      .replace(/,/g, '')
      .match(/-?\d+(\.\d+)?/)?.[0],
  )

const html = await getText(URL_MOTIVES)
const page = findObject(
  decodeFlight(html),
  (node) => node.categoryKey === 'motives' && node.entries,
)
if (!page) throw new Error('Motives list not found in the page data')

// Some motives share a name (for example two "The Lucidity Mystery"), so those get the game id
// appended to keep slugs unique.
const names = new Map()
for (const entry of page.entries) names.set(entry.name, (names.get(entry.name) ?? 0) + 1)

await mkdir(new URL('motives/', root), { recursive: true })
const slugs = new Set()
for (const entry of page.entries) {
  const stat = Object.fromEntries(entry.stats.map((item) => [item.label, item.value]))
  const known = new Set(['Identity', 'Motive Skill', 'Base HP', 'Base ATK'])
  // Each motive adds at most one extra bonus line (Crit Rate, ATK, Max HP, ...).
  const bonus = entry.stats.find((item) => !known.has(item.label)) ?? null
  const slug =
    names.get(entry.name) > 1 ? `${slugify(entry.name)}-${entry.id}` : slugify(entry.name)
  if (slugs.has(slug)) throw new Error(`Duplicate slug ${slug}`)
  slugs.add(slug)

  const imagePath = `motives/${entry.icon}.webp`
  await download(`/images/silver-palace/database/motives/${entry.icon}.webp`, imagePath)

  const motive = {
    slug,
    source_id: entry.id,
    name: entry.name,
    rarity: entry.rarity,
    identity: stat.Identity ? { name: stat.Identity, slug: slugify(stat.Identity) } : null,
    skill_name: stat['Motive Skill'] ?? null,
    base_hp: number(stat['Base HP']),
    base_atk: number(stat['Base ATK']),
    bonus_stat: bonus?.label ?? null,
    bonus_value: bonus?.value ?? null,
    description: entry.desc,
    lore: entry.lore || null,
    image_path: imagePath,
    ranks: entry.variants.map((variant) => ({
      rank: number(variant.label),
      description: variant.desc,
    })),
  }
  await writeFile(new URL(`motives/${slug}.json`, root), `${JSON.stringify(motive, null, 2)}\n`)
}
console.log(`${page.entries.length} motives written`)
