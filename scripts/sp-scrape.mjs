// Collects Silver Palace character data from hideoutgacha.com into sp-data/ (gitignored).
//   sp-data/characters/<slug>.json   structured data, shaped like the database tables
//   sp-data/images/...               every image the data points to, keyed by the Storage path
// Usage: node scripts/sp-scrape.mjs [slug ...]   (no slugs = every character)
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const SITE = 'https://www.hideoutgacha.com'
const LIST_URL = `${SITE}/games/silver-palace/character-information`
const root = new URL('../sp-data/', import.meta.url)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

async function curl(url, ...extra) {
  const { stdout } = await run('curl.exe', ['-sSL', '--retry', '3', '-A', UA, ...extra, url], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  })
  return stdout
}
const getText = async (url) => (await curl(url)).toString('utf8')

// Next.js streams page data as `self.__next_f.push([1,"..."])` chunks; join them, split into
// `id:json` rows, then resolve `$L<id>` references so the whole tree can be walked.
function decodeFlight(html) {
  const chunks = []
  for (const match of html.matchAll(/self\.__next_f\.push\((\[1,".*?"\])\)<\/script>/gs)) {
    chunks.push(JSON.parse(match[1])[1])
  }
  const rows = new Map()
  // Text rows ("id:T<hex length>,<text>") are length-prefixed in bytes and are not followed by a
  // newline, so rows have to be read sequentially instead of split by line.
  const data = Buffer.from(chunks.join(''), 'utf8')
  let pos = 0
  while (pos < data.length) {
    const head = /^([0-9a-f]+):(T([0-9a-f]+),)?/.exec(data.toString('utf8', pos, pos + 24))
    if (!head) {
      pos = data.indexOf(0x0a, pos) + 1 || data.length
      continue
    }
    pos += Buffer.byteLength(head[0])
    if (head[2]) {
      pos += parseInt(head[3], 16)
      continue
    }
    let end = data.indexOf(0x0a, pos)
    if (end < 0) end = data.length
    try {
      rows.set(head[1], JSON.parse(data.toString('utf8', pos, end)))
    } catch {
      // Rows that are not JSON trees (module references, hints) are not needed.
    }
    pos = end + 1
  }
  const resolve = (node, depth = 0) => {
    if (typeof node === 'string') {
      const ref = /^\$L([0-9a-f]+)$/.exec(node)
      return ref && rows.has(ref[1]) && depth < 8 ? resolve(rows.get(ref[1]), depth + 1) : node
    }
    if (Array.isArray(node)) return node.map((item) => resolve(item, depth))
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolve(v, depth)]))
    }
    return node
  }
  return [...rows.values()].map((row) => resolve(row))
}

function* walk(node) {
  yield node
  if (Array.isArray(node)) for (const item of node) yield* walk(item)
  else if (node && typeof node === 'object')
    for (const value of Object.values(node)) yield* walk(value)
}
const findObject = (tree, test) => {
  for (const node of walk(tree))
    if (node && typeof node === 'object' && !Array.isArray(node) && test(node)) return node
  return null
}

const slugify = (value) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const decode = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

const elementText = (element) => {
  for (const node of walk(element)) {
    if (node && typeof node === 'object' && !Array.isArray(node) && typeof node.text === 'string')
      return node.text
  }
  return ''
}

// Skill/psyche descriptions arrive as React elements: headings, paragraphs, small notes.
function toBlocks(elements) {
  const blocks = []
  for (const node of walk(elements)) {
    if (!Array.isArray(node) || node[0] !== '$' || node[1] !== 'p') continue
    const props = node[3] ?? {}
    const text = (
      typeof props.children === 'string' ? props.children : elementText(props.children)
    ).trim()
    if (!text) continue
    const cls = props.className ?? ''
    const type = cls.includes('text-v2-micro')
      ? 'heading'
      : cls.includes('text-[12px]')
        ? 'note'
        : 'text'
    blocks.push({ type, text })
  }
  return blocks
}

const number = (value) =>
  Number(
    String(value)
      .replace(/,/g, '')
      .match(/-?\d+(\.\d+)?/)?.[0],
  )

function parseTrust(html) {
  const table =
    /<table[^>]*>.*?<\/table>/s.exec(html.slice(html.indexOf('Trust Level') - 600))?.[0] ?? ''
  const levels = []
  for (const row of table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const cells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((c) =>
      decode(c[1].replace(/<[^>]+>/g, '')),
    )
    if (cells.length < 5) continue
    // "Lv. 5 | Max" has no EXP requirement; later levels repeat the running total.
    const rewards = cells[4]
      .split(' \u00B7 ')
      .map((part) => {
        const item = /^(.*?)\s*\u00D7\s*([\d,]+)$/.exec(part.trim())
        return item
          ? { name: item[1], quantity: number(item[2]) }
          : { name: part.trim(), quantity: 1 }
      })
      .filter((reward) => reward.name)
    levels.push({
      level: number(cells[0]),
      exp: /^\d/.test(cells[1]) ? number(cells[1]) : null,
      running_total: number(cells[2]),
      gifts: number(cells[3]),
      rewards,
    })
  }
  return levels
}

function parseGifts(html) {
  const start = html.indexOf('Preferred Gifts')
  const end = html.indexOf('Trust Level', start)
  const section = start >= 0 ? html.slice(start, end > start ? end : undefined) : ''
  return [
    ...section.matchAll(
      /<img[^>]*src="([^"]*gifts-small\/[^"]+)"[^>]*\/?>.*?<span[^>]*>([^<]+)<\/span>/gs,
    ),
  ].map((m, index) => ({ position: index + 1, name: decode(m[2]), source: m[1] }))
}

const imageDir = {
  attribute: 'attributes',
  combat_style: 'combat-styles',
  identity: 'identities',
}

function parseCharacter(slug, html) {
  const tree = decodeFlight(html)
  const showcase = findObject(tree, (n) => n.showcase)?.showcase
  if (!showcase) throw new Error(`${slug}: header data not found`)
  const about = Object.fromEntries(
    showcase.about.map((item) => [item.label.toLowerCase(), item.body]),
  )

  const traits = {}
  for (const chip of showcase.chips) {
    const kind = Object.entries(imageDir).find(([, dir]) => chip.icon.includes(`/${dir}/`))?.[0]
    if (kind)
      traits[kind] = { kind, name: chip.label, slug: slugify(chip.label), source: chip.icon }
  }
  if (about.faction)
    traits.faction = {
      kind: 'faction',
      name: about.faction,
      slug: slugify(about.faction),
      source: null,
    }

  const stats =
    findObject(tree, (n) => Array.isArray(n.stats) && n.stats[0]?.lv !== undefined)?.stats ?? []
  const skillGroup =
    findObject(tree, (n) => Array.isArray(n.skills) && n.skills[0]?.key)?.skills ?? []
  const psyches = findObject(tree, (n) => Array.isArray(n.items) && n.items[0]?.badge)?.items ?? []

  const skills = skillGroup.map((skill, index) => {
    const scaling = findObject(skill.extras ?? [], (n) => n.columns && n.levels)
    return {
      position: index + 1,
      code: skill.key,
      name: skill.name,
      kind: skill.meta?.map((m) => m.text).join(' \u00B7 ') || null,
      source: skill.icon,
      body: toBlocks(skill.levels),
      columns: scaling?.columns ?? [],
      levels: (scaling?.levels ?? []).map((level) => ({ level: level.lv, values: level.values })),
    }
  })

  return {
    slug,
    name: showcase.name,
    title: about.title ?? null,
    weapon: about.weapon ?? null,
    rarity: showcase.ranks.find((rank) => rank.stars)?.stars ?? null,
    accent_color: showcase.accent ?? null,
    traits,
    art: { icon: `/images/silver-palace/icons/${slug}.webp`, banner: showcase.art.src },
    stats: stats.map((s) => ({ level: s.lv, hp: s.hp, atk: s.atk, def: s.def })),
    trust: { gifts: parseGifts(html), levels: parseTrust(html) },
    skills,
    psyches: psyches.map((item, index) => ({
      position: index + 1,
      badge: item.badge,
      name: item.title,
      description: elementText(item.body),
      source: item.icon,
    })),
  }
}

async function download(source, path) {
  const target = new URL(`images/${path}`, root)
  try {
    await access(target)
    return
  } catch {
    // not downloaded yet
  }
  await mkdir(dirname(target.pathname.replace(/^\/([A-Za-z]:)/, '$1')), { recursive: true })
  const data = await curl(`${SITE}${source}`)
  if (data.length < 200) throw new Error(`Image download failed: ${source}`)
  await writeFile(target, data)
}

// Storage paths (relative to the SilverPalace bucket) are assigned here, so the seed script and
// the API never have to guess where an image lives.
async function attachImages(character) {
  const jobs = []
  const place = (item, path) => {
    jobs.push(download(item.source, path))
    item.image_path = path
  }
  const ext = (source) => source.match(/\.\w+$/)?.[0] ?? '.webp'
  const base = `characters/${character.slug}`
  character.image_path = `${base}/icon${ext(character.art.icon)}`
  character.banner_path = `${base}/banner${ext(character.art.banner)}`
  jobs.push(
    download(character.art.icon, character.image_path),
    download(character.art.banner, character.banner_path),
  )
  for (const trait of Object.values(character.traits)) {
    if (trait.source)
      place(trait, `traits/${imageDir[trait.kind]}/${trait.slug}${ext(trait.source)}`)
  }
  for (const gift of character.trust.gifts) place(gift, `gifts/${gift.source.split('/').pop()}`)
  for (const skill of character.skills)
    place(skill, `${base}/skills/${skill.source.split('/').pop()}`)
  for (const psyche of character.psyches) place(psyche, `psyches/${psyche.source.split('/').pop()}`)
  await Promise.all(jobs)
}

async function main() {
  const requested = process.argv.slice(2)
  const listHtml = await getText(LIST_URL)
  const slugs = [
    ...new Set(
      [
        ...listHtml.matchAll(/href="\/games\/silver-palace\/character-information\/([a-z0-9-]+)"/g),
      ].map((m) => m[1]),
    ),
  ]
  const chosen = requested.length ? requested : slugs
  console.log(`${slugs.length} characters listed; collecting ${chosen.length}`)
  await mkdir(new URL('characters/', root), { recursive: true })

  for (const slug of chosen) {
    const html = await getText(`${LIST_URL}/${slug}`)
    const character = parseCharacter(slug, html)
    await attachImages(character)
    await writeFile(
      new URL(`characters/${slug}.json`, root),
      `${JSON.stringify(character, null, 2)}\n`,
    )
    console.log(
      `${slug}: ${character.stats.length} stat levels, ${character.trust.levels.length} trust levels, ` +
        `${character.skills.length} skills, ${character.psyches.length} psyches`,
    )
  }
}

await main()
