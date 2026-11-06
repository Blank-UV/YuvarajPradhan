// Collects Silver Palace guides from hideoutgacha.com into src/data/sp-guide-<slug>.json and
// downloads the images they use into images/sp/guides/.
// Usage: node scripts/sp-scrape-guide.mjs [gacha] [gear-guide]   (no arguments scrapes all)
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, curl, getText } from './sp-lib.mjs'

const GUIDES = ['general-info', 'gacha', 'gear-guide']
// Videos and cross links only make sense on the source site.
const SKIP_SECTIONS = new Set(['watch', 'in-depth-video', 'where-to-go-next'])
const VOID = new Set(['img', 'br', 'hr', 'input', 'source', 'meta', 'link'])
const CARD = /<em[^>]*>[\s\S]*?<\/em><b[^>]*>[\s\S]*?<\/b><span[^>]*>/
const entities = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
}

const text = (fragment = '') =>
  fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#x27|#39);/g, (match) => entities[match])
    .replace(/\s+/g, ' ')
    .trim()

// Splits markup into its top-level elements, tracking depth so nested divs stay together.
function children(html) {
  const out = []
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?>/g
  let depth = 0
  let start = -1
  let open = ''
  let name = ''
  for (const match of html.matchAll(tag)) {
    const closing = match[1] === '/'
    const void_ = VOID.has(match[2].toLowerCase()) || match[0].endsWith('/>')
    if (!closing && depth === 0) {
      start = match.index
      open = match[0]
      name = match[2].toLowerCase()
      if (void_) {
        out.push({ tag: name, open, html: match[0], inner: '' })
        continue
      }
    }
    if (void_) continue
    depth += closing ? -1 : 1
    if (depth === 0 && start >= 0) {
      const end = match.index + match[0].length
      out.push({
        tag: name,
        open,
        html: html.slice(start, end),
        inner: html.slice(start + open.length, match.index),
      })
      start = -1
    }
  }
  return out
}

const images = new Map()
async function icon(src) {
  const parts = src.split('/')
  const file = `${parts.at(-2)}-${parts.at(-1)}`
  if (!images.has(file)) images.set(file, await curl(`${SITE}${src}`))
  return file
}
const attr = (html, name) => new RegExp(`${name}="([^"]*)"`).exec(html)?.[1]
const imageOf = async (html) => {
  const src = attr(/<img[^>]*>/.exec(html)?.[0] ?? '', 'src')
  return src ? icon(src) : null
}

async function blocks(html) {
  const out = []
  for (const el of children(html)) {
    if (el.tag === 'p') {
      const value = text(el.html)
      if (value) out.push({ type: 'text', text: value })
    } else if (el.tag === 'h3') {
      out.push({ type: 'heading', text: text(el.html) })
    } else if (el.tag === 'img') {
      out.push({ type: 'image', image: await imageOf(el.html), alt: attr(el.html, 'alt') ?? '' })
    } else if (el.tag === 'table') {
      const rows = [...el.html.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((row) =>
        [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) => text(cell[1])),
      )
      out.push({ type: 'table', head: rows[0], rows: rows.slice(1) })
    } else if (el.tag === 'aside') {
      const [, title, body] =
        /<b[^>]*>([\s\S]*?)<\/b><div[^>]*>([\s\S]*?)<\/div>/.exec(el.inner) ?? []
      out.push({ type: 'note', title: text(title), text: text(body) })
    } else if (el.tag === 'ol') {
      out.push({
        type: 'steps',
        items: [...el.inner.matchAll(/<b[^>]*>([\s\S]*?)<\/b><div[^>]*>([\s\S]*?)<\/div>/g)].map(
          (m) => ({ title: text(m[1]), text: text(m[2]) }),
        ),
      })
    } else if (el.tag === 'div') {
      out.push(...(await divBlocks(el)))
    }
  }
  return out
}

async function divBlocks(el) {
  if (/data-eq="true"/.test(el.open)) return [{ type: 'equation', text: text(el.html) }]
  if (el.html.includes('<iframe')) return []
  const kids = children(el.inner)
  if (!kids.length) return []
  const divs = kids.every((kid) => kid.tag === 'div')

  if (divs && kids.every((kid) => /data-key="/.test(kid.open))) {
    return [
      {
        type: 'stats',
        items: kids.map((kid) => {
          const [, value, label] =
            /<b[^>]*>([\s\S]*?)<\/b><span[^>]*>([\s\S]*?)<\/span>/.exec(kid.inner) ?? []
          return { value: text(value), label: text(label) }
        }),
      },
    ]
  }
  if (divs && kids.every((kid) => CARD.test(kid.inner))) {
    const items = []
    for (const kid of kids) {
      const [, label, name, body] =
        /<em[^>]*>([\s\S]*?)<\/em><b[^>]*>([\s\S]*?)<\/b><span[^>]*>([\s\S]*?)<\/span>/.exec(
          kid.inner,
        ) ?? []
      items.push({
        label: text(label),
        name: text(name),
        text: text(body),
        image: await imageOf(kid.html),
      })
    }
    return [{ type: 'cards', items }]
  }
  if (divs && kids.every((kid) => kid.inner.includes('<b'))) {
    const items = []
    for (const kid of kids) {
      items.push({
        name: text(/<b[^>]*>([\s\S]*?)<\/b>/.exec(kid.inner)?.[1]),
        note: text(/<em[^>]*>([\s\S]*?)<\/em>/.exec(kid.inner)?.[1]) || undefined,
        image: await imageOf(kid.html),
      })
    }
    return [{ type: 'chips', items }]
  }
  return blocks(el.inner)
}

async function scrape(slug) {
  const page = `${SITE}/games/silver-palace/${slug}`
  const html = await getText(page)
  const title = text(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1])
  const updated = /"dateModified":"([^"]+)"/.exec(html)?.[1] ?? null

  const lead = /<div[^>]*data-lead="true"[^>]*>([\s\S]*?)<section id=/.exec(html)?.[1] ?? ''
  const leadBody = children(lead.replace(/<\/div>\s*$/, ''))[1]
  const intro = { blocks: leadBody ? await blocks(leadBody.inner) : [] }

  const sections = []
  for (const match of html.matchAll(
    /<section id="([^"]+)" data-ch="true" data-title="([^"]*)"[\s\S]*?<\/section>/g,
  )) {
    if (SKIP_SECTIONS.has(match[1])) continue
    const body = match[0].slice(match[0].indexOf('data-ch-body'))
    const inner = body.slice(body.indexOf('>') + 1)
    sections.push({ id: match[1], title: text(match[2]), blocks: await blocks(inner) })
  }

  const guide = { title, updated, intro, sections }
  await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
  await writeFile(
    new URL(`../src/data/sp-guide-${slug}.json`, import.meta.url),
    `${JSON.stringify(guide, null, 2)}\n`,
  )
  console.log(`${slug}: ${sections.length} sections`)
}

const wanted = process.argv.slice(2)
for (const slug of wanted.length ? wanted : GUIDES) await scrape(slug)

await mkdir(new URL('../images/sp/guides/', import.meta.url), { recursive: true })
for (const [file, bytes] of images) {
  await writeFile(new URL(`../images/sp/guides/${file}`, import.meta.url), bytes)
}
console.log(`${images.size} images written`)
