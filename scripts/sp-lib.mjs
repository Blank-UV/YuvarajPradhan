// Shared helpers for the Silver Palace scrapers (scripts/sp-scrape*.mjs): fetching with curl,
// decoding the Next.js page payload, walking the decoded tree and downloading images into sp-data/.
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
export const SITE = 'https://www.hideoutgacha.com'
export const root = new URL('../sp-data/', import.meta.url)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

export async function curl(url, ...extra) {
  const { stdout } = await run('curl.exe', ['-sSL', '--retry', '3', '-A', UA, ...extra, url], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  })
  return stdout
}
export const getText = async (url) => (await curl(url)).toString('utf8')

// Next.js streams page data as `self.__next_f.push([1,"..."])` chunks; join them, split into
// `id:json` rows, then resolve `$L<id>` references so the whole tree can be walked.
export function decodeFlight(html) {
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

export function* walk(node) {
  yield node
  if (Array.isArray(node)) for (const item of node) yield* walk(item)
  else if (node && typeof node === 'object')
    for (const value of Object.values(node)) yield* walk(value)
}
export const findObject = (tree, test) => {
  for (const node of walk(tree))
    if (node && typeof node === 'object' && !Array.isArray(node) && test(node)) return node
  return null
}

export const slugify = (value) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Saves a site image under sp-data/images/<path> (the path is its Storage path in the bucket).
export async function download(source, path) {
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
