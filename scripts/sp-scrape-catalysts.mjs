// Collects every Silver Palace Catalyst from hideoutgacha.com into sp-data/catalysts/<slug>.json and
// downloads the icons into sp-data/images/catalysts/ (several catalysts share one icon).
// Usage: node scripts/sp-scrape-catalysts.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, decodeFlight, download, findObject, getText, root, slugify } from './sp-lib.mjs'

const html = await getText(`${SITE}/games/silver-palace/database/catalysts`)
const page = findObject(
  decodeFlight(html),
  (node) => node.categoryKey === 'catalysts' && node.entries,
)
if (!page) throw new Error('Catalysts list not found in the page data')

await mkdir(new URL('catalysts/', root), { recursive: true })
const slugs = new Set()
for (const entry of page.entries) {
  const slug = slugify(entry.name)
  if (slugs.has(slug)) throw new Error(`Duplicate slug ${slug}`)
  slugs.add(slug)

  const imagePath = `catalysts/${entry.icon}.webp`
  await download(`/images/silver-palace/database/catalysts/${entry.icon}.webp`, imagePath)

  const catalyst = {
    slug,
    source_id: entry.id,
    name: entry.name,
    rarity: entry.rarity,
    type: entry.type,
    description: entry.desc,
    max_stack: entry.maxStack ?? null,
    // "Powerful Adversary, Boutique" lists where the catalyst comes from.
    obtain: (entry.source ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    image_path: imagePath,
  }
  await writeFile(new URL(`catalysts/${slug}.json`, root), `${JSON.stringify(catalyst, null, 2)}\n`)
}
console.log(`${page.entries.length} catalysts written`)
