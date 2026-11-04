import assert from 'node:assert/strict'
import test from 'node:test'
import { createSilverPalaceMotivesHandler } from '../api/sp-motives.js'

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
    response.end = (body) => resolve({ status: response.status, body: JSON.parse(body) })
    handler({ method, url }, response)
  })
}

const identity = { id: 'i1', slug: 'hero', name: 'Hero', image_path: 'traits/identities/hero.webp' }
const motive = {
  id: 'm1',
  slug: 'the-doppelganger-mystery',
  source_id: 12051001,
  name: 'The Doppelganger Mystery',
  rarity: 5,
  identity_id: 'i1',
  skill_name: 'Doppelganger',
  base_hp: 21600,
  base_atk: 2640,
  bonus_stat: 'Crit Rate',
  bonus_value: '+0.5%',
  description: 'R1 text',
  lore: 'Lore text',
  image_path: 'motives/t_icon_characterweapon_12051001.webp',
}

function database() {
  const requests = []
  const handler = createSilverPalaceMotivesHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url) {
      requests.push(url)
      const table = /rest\/v1\/([a-z_]+)\?/.exec(url)[1]
      const rows = {
        sp_traits: [identity],
        sp_motives: url.includes('slug=eq.missing') ? [] : [motive],
        sp_motive_ranks: [
          { rank: 1, description: 'R1 text' },
          { rank: 2, description: 'R2 text' },
        ],
      }[table]
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists motives with identity and bucket image URLs', async () => {
  const { handler, requests } = database()
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.match(requests[0], /sp_motives\?select=slug,name,rarity/)
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/SilverPalace/motives/t_icon_characterweapon_12051001.webp',
  )
  assert.equal(list.body[0].identity.name, 'Hero')
  assert.equal(list.body[0].lore, undefined)
})

test('loads one motive with lore and ranks', async () => {
  const { handler } = database()
  const { status, body } = await call(handler, '/?slug=the-doppelganger-mystery')
  assert.equal(status, 200)
  assert.equal(body.lore, 'Lore text')
  assert.deepEqual(
    body.ranks.map((rank) => rank.rank),
    [1, 2],
  )
})

test('validates the slug, the method and missing motives', async () => {
  const { handler } = database()
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createSilverPalaceMotivesHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createSilverPalaceMotivesHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
