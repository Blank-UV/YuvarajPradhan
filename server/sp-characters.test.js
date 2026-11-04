import assert from 'node:assert/strict'
import test from 'node:test'
import { createSilverPalaceCharactersHandler } from '../api/sp-characters.js'

function call(handler, url, method = 'GET') {
  return new Promise((resolve) => {
    const response = {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value
      },
    }
    response.writeHead = (status, headers) => {
      response.status = status
      Object.assign(response.headers, headers)
    }
    response.end = (body) =>
      resolve({ status: response.status, headers: response.headers, body: JSON.parse(body) })
    handler({ method, url }, response)
  })
}

const traits = [
  {
    id: 't1',
    kind: 'attribute',
    slug: 'ignis',
    name: 'Ignis',
    image_path: 'traits/attributes/ignis.webp',
  },
  { id: 't2', kind: 'faction', slug: 'fableborne', name: 'Fableborne', image_path: null },
]
const character = {
  id: 'c1',
  slug: 'cinderella',
  name: 'Cinderella',
  title: 'Cinderella',
  rarity: 5,
  weapon: 'Flame Sword + Machine Gun',
  accent_color: '#f97316',
  image_path: 'characters/cinderella/icon.webp',
  banner_path: 'characters/cinderella/banner.webp',
  attribute_id: 't1',
  combat_style_id: null,
  identity_id: null,
  faction_id: 't2',
}

function database() {
  const requests = []
  const handler = createSilverPalaceCharactersHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url, options) {
      requests.push({ url, options })
      const table = /rest\/v1\/([a-z_]+)\?/.exec(url)[1]
      const rows = {
        sp_traits: traits,
        sp_characters: url.includes('slug=eq.missing') ? [] : [character],
        sp_character_stats: [{ level: 1, hp: 739, atk: 95, def: 22 }],
        sp_character_gifts: [
          {
            position: 1,
            gift: { slug: 'bouquet', name: 'Preserved Bouquet', image_path: 'gifts/a.webp' },
          },
        ],
        sp_character_trust_levels: [
          { level: 1, exp: 100, running_total: 100, gifts_required: 1, rewards: [] },
        ],
        sp_character_skills: [
          {
            id: 's1',
            position: 1,
            code: 'ATK',
            name: 'Blade',
            kind: 'Basic Attack',
            image_path: 'x.webp',
            description: [],
          },
        ],
        sp_character_psyches: [
          {
            position: 1,
            badge: 'P1',
            name: 'Heart',
            description: 'Text',
            image_path: 'psyches/p1.webp',
          },
        ],
        // Deliberately unordered: the handler must sort levels and columns.
        sp_skill_scaling: [
          { skill_id: 's1', level: 20, position: 2, label: 'Two', value: '20%' },
          { skill_id: 's1', level: 1, position: 2, label: 'Two', value: '2%' },
          { skill_id: 's1', level: 20, position: 1, label: 'One', value: '10%' },
          { skill_id: 's1', level: 1, position: 1, label: 'One', value: '1%' },
        ],
      }[table]
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists characters with joined traits and bucket image URLs', async () => {
  const { handler, requests } = database()
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.match(
    requests[0].url,
    /^https:\/\/example\.supabase\.co\/rest\/v1\/sp_characters\?select=id,slug,name/,
  )
  assert.equal(requests[0].options.headers.Authorization, undefined)
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/SilverPalace/characters/cinderella/icon.webp',
  )
  assert.equal(list.body[0].attribute.name, 'Ignis')
  assert.equal(list.body[0].faction.image_url, null)
  assert.equal(list.body[0].identity, null)
  assert.equal(list.body[0].id, undefined)
})

test('loads one character with stats, trust, skills, psyches and folded skill scaling', async () => {
  const { handler } = database()
  const { status, body } = await call(handler, '/?slug=cinderella')
  assert.equal(status, 200)
  assert.equal(body.banner_url.endsWith('/characters/cinderella/banner.webp'), true)
  assert.deepEqual(body.stats, [{ level: 1, hp: 739, atk: 95, def: 22 }])
  assert.deepEqual(
    body.gifts.map((gift) => gift.name),
    ['Preserved Bouquet'],
  )
  assert.equal(body.trust[0].exp, 100)
  assert.deepEqual(body.skills[0].columns, ['One', 'Two'])
  assert.deepEqual(body.skills[0].levels, [
    { level: 1, values: ['1%', '2%'] },
    { level: 20, values: ['10%', '20%'] },
  ])
  assert.equal(body.psyches[0].badge, 'P1')
  assert.equal(body.psyches[0].image_url.endsWith('/psyches/p1.webp'), true)
})

test('validates the slug, the method and missing characters', async () => {
  const { handler } = database()
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createSilverPalaceCharactersHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createSilverPalaceCharactersHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
