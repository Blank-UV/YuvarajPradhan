// Collects every Silver Palace Implement (a 4-piece equipment set) from hideoutgacha.com into
// sp-data/implements/<slug>.json and downloads the set and piece icons into sp-data/images/implements/.
// Usage: node scripts/sp-scrape-implements.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, decodeFlight, download, findObject, getText, root, slugify } from './sp-lib.mjs'

const html = await getText(`${SITE}/games/silver-palace/database/implements`)
const page = findObject(
  decodeFlight(html),
  (node) => node.categoryKey === 'implements' && node.entries,
)
if (!page) throw new Error('Implements list not found in the page data')

// "3.16%" -> { value: '3.16%', num: 3.16, unit: '%' }; "698" -> { value: '698', num: 698, unit: null }
function splitValue(text) {
  const match = /^([+-]?[\d,]*\.?\d+)\s*(.*)$/.exec(String(text).trim())
  return {
    value: String(text).trim(),
    num: match ? Number(match[1].replace(/,/g, '')) : null,
    unit: match?.[2] || null,
  }
}

const imageFor = async (icon) => {
  const path = `implements/${icon}.webp`
  await download(`/images/silver-palace/database/implements/${icon}.webp`, path)
  return path
}

await mkdir(new URL('implements/', root), { recursive: true })
const slugs = new Set()
for (const entry of page.entries) {
  const slug = slugify(entry.name)
  if (slugs.has(slug)) throw new Error(`Duplicate slug ${slug}`)
  slugs.add(slug)

  const levels = entry.pieceLevels ?? []
  const pieces = []
  for (const [index, piece] of (entry.pieceStats ?? []).entries()) {
    pieces.push({
      position: index + 1,
      name: piece.name,
      image_path: piece.icon ? await imageFor(piece.icon) : null,
      stats: piece.stats.map((stat, statIndex) => ({
        position: statIndex + 1,
        label: stat.label,
        // One value per level, in the same order as the implement's levels.
        levels: stat.vals.map((value, levelIndex) => ({
          level: levels[levelIndex],
          ...splitValue(value),
        })),
      })),
    })
  }

  const implement = {
    slug,
    source_id: entry.id,
    name: entry.name,
    rarity: entry.rarity,
    type: entry.type,
    max_stack: entry.maxStack ?? null,
    description: entry.desc,
    lore: entry.lore || null,
    image_path: await imageFor(entry.icon),
    levels,
    pieces,
  }
  await writeFile(
    new URL(`implements/${slug}.json`, root),
    `${JSON.stringify(implement, null, 2)}\n`,
  )
}
console.log(`${page.entries.length} implements written`)
