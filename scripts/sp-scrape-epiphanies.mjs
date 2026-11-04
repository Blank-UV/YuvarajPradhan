// Collects every Silver Palace Epiphany from hideoutgacha.com into sp-data/epiphanies/<slug>.json and
// downloads the icons into sp-data/images/epiphanies/ (the Storage path is saved as image_path).
// Usage: node scripts/sp-scrape-epiphanies.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, decodeFlight, download, findObject, getText, root, slugify } from './sp-lib.mjs'

const URL_EPIPHANIES = `${SITE}/games/silver-palace/database/epiphanies`

// "DMG Bonus +15%" -> { label: 'DMG Bonus', value: '+15%', num: 15, unit: '%' };
// "Break Exploit +100" -> { label: 'Break Exploit', value: '+100', num: 100, unit: null }.
export function splitStat(text) {
  const match = /^(.*?)\s*([+-][\d.,]+)(%?)$/.exec(String(text).trim())
  if (!match) return { label: String(text).trim(), value: null, num: null, unit: null }
  return {
    label: match[1],
    value: `${match[2]}${match[3]}`,
    num: Number(match[2].replace(/,/g, '')),
    unit: match[3] || null,
  }
}

const html = await getText(URL_EPIPHANIES)
const page = findObject(
  decodeFlight(html),
  (node) => node.categoryKey === 'epiphanies' && node.entries,
)
if (!page) throw new Error('Epiphanies list not found in the page data')

// "Possible Addendums · Any-character Ink" is the same list for every epiphany. The site keeps it
// in its page script (not in the page data), so it is read from there: a JS array literal of
// {label, value} objects that starts with the CRIT DMG entry.
async function readAddendums() {
  const chunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(
    (match) => match[1],
  )
  for (const chunk of [...new Set(chunks)]) {
    const js = await getText(`${SITE}${chunk}`)
    const start = js.indexOf('[{label:"CRIT DMG"')
    if (start < 0) continue
    const end = js.indexOf('}]', start) + 2
    // The literal is plain data (labels and values), so evaluating it is safe here.
    const rows = new Function(`return ${js.slice(start, end)}`)()
    return rows.map((row, index) => ({
      position: index + 1,
      ...splitStat(`${row.label} ${row.value}`),
    }))
  }
  throw new Error('Addendum list not found in the page scripts')
}

await mkdir(new URL('epiphanies/', root), { recursive: true })
const addendums = await readAddendums()
await writeFile(new URL('epiphany-addendums.json', root), `${JSON.stringify(addendums, null, 2)}\n`)
console.log(`${addendums.length} addendums written`)
const slugs = new Set()
for (const entry of page.entries) {
  const slug = slugify(entry.name)
  if (slugs.has(slug)) throw new Error(`Duplicate slug ${slug}`)
  slugs.add(slug)

  const main = entry.stats.find((item) => item.label === 'Main Stat')
  const level = entry.stats.find((item) => item.label === 'Level')
  const imagePath = `epiphanies/${entry.icon}.webp`
  await download(`/images/silver-palace/database/epiphanies/${entry.icon}.webp`, imagePath)

  const epiphany = {
    slug,
    source_id: entry.id,
    name: entry.name,
    rarity: entry.rarity,
    type: entry.type,
    level: level ? Number(level.value.replace(/\D/g, '')) : null,
    main_stat: main ? splitStat(main.value) : null,
    substats: entry.stats
      .filter((item) => item.label === 'Substat')
      .map((item, index) => ({ position: index + 1, ...splitStat(item.value) })),
    description: entry.desc,
    lore: entry.lore || null,
    image_path: imagePath,
  }
  await writeFile(
    new URL(`epiphanies/${slug}.json`, root),
    `${JSON.stringify(epiphany, null, 2)}\n`,
  )
}
console.log(`${page.entries.length} epiphanies written`)
