// Collects the Silver Palace team compositions from hideoutgacha.com into src/data/sp-teams.json.
// Only text is kept: characters and gear are matched to the database by slug/name at runtime,
// so no images are downloaded.
// Usage: node scripts/sp-scrape-teams.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { SITE, getText } from './sp-lib.mjs'

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

const html = (await getText(`${SITE}/games/silver-palace/team-compositions`))
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<svg[\s\S]*?<\/svg>/g, '')
  .replace(/\s+(class|style)="[^"]*"/g, '')

const names = (fragment) =>
  [...fragment.matchAll(/<span[^>]*>([^<]+)<\/span><\/button>/g)].map((m) => text(m[1]))

function member(chunk) {
  const [, seat, role, name] =
    /<small>(\d+)<!-- --> \u00B7 <!-- -->([^<]*)<\/small><b>([^<]*)<\/b>/.exec(chunk)
  const gear = Object.fromEntries(
    [
      ...chunk.matchAll(
        /<p[^>]*>(Motive|Implements|Epiphany|Catalysts)<\/p><ul[^>]*>([\s\S]*?)<\/ul>/g,
      ),
    ].map((m) => [m[1].toLowerCase(), names(m[2])]),
  )
  const keyStats = /<p[^>]*>Key Stats<\/p><ul[^>]*>([\s\S]*?)<\/ul>/.exec(chunk)?.[1]
  return {
    seat: Number(seat),
    name: text(name),
    slug: /character-information\/([a-z0-9-]+)"/.exec(chunk)?.[1],
    role: text(role),
    attribute: text(/attributes\/[a-z]+\.webp"[^>]*\/>([^<]+)</.exec(chunk)?.[1]),
    combat_style: text(/combat-styles\/[a-z-]+\.webp"[^>]*\/>([^<]+)</.exec(chunk)?.[1]),
    summary: text(/<\/span><\/span><p[^>]*>([\s\S]*?)<\/p>/.exec(chunk)?.[1]),
    has_build: !chunk.includes('No build published yet'),
    key_stats: keyStats
      ? [...keyStats.matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map((m) => text(m[1]))
      : [],
    motives: gear.motive ?? [],
    implements: gear.implements ?? [],
    epiphanies: gear.epiphany ?? [],
    addendum: text(/Addendum:<!-- --> <b>([^<]*)<\/b>/.exec(chunk)?.[1]) || undefined,
    catalysts: gear.catalysts ?? [],
  }
}

const teams = []
for (const section of html.matchAll(
  /<section id="([a-z0-9-]+)" aria-labelledby="team-[^"]*"[^>]*>[\s\S]*?(?=<section id="|<!--\$-->)/g,
)) {
  const body = section[0]
  const aside = /<aside aria-live="polite">([\s\S]*?)<\/aside>/.exec(body)?.[1] ?? ''
  const starts = [...aside.matchAll(/<small>\d+<!-- --> \u00B7 <!-- -->/g)].map((m) => m.index)
  const members = starts.map((start, i) =>
    member(aside.slice(start, starts[i + 1] ?? aside.length)),
  )

  const footer =
    /<\/aside><div[^>]*><p[^>]*>([\s\S]*?)<\/p><ul[^>]*>([\s\S]*?)<\/ul><p[^>]*>([\s\S]*?)<\/p>/.exec(
      body,
    )
  const [tag, tagNote] = text(footer?.[1]).split(' \u00B7 ')
  teams.push({
    id: section[1],
    name: text(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(body)?.[1]),
    tag,
    tag_note: tagNote,
    tags: [...(footer?.[2] ?? '').matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map((m) => text(m[1])),
    summary: text(footer?.[3]),
    members,
  })
}
if (!teams.length || teams.some((team) => !team.members.length)) throw new Error('Teams not found')

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/data/sp-teams.json', import.meta.url),
  `${JSON.stringify(teams, null, 2)}\n`,
)
console.log(`${teams.length} teams, ${teams.reduce((n, t) => n + t.members.length, 0)} members`)
