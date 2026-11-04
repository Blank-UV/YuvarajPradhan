import assert from 'node:assert/strict'
import test from 'node:test'
import { createSilverPalaceEpiphaniesHandler } from '../api/sp-epiphanies.js'

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

const epiphany = {
  id: 'e1',
  slug: 'the-destined-death',
  source_id: 72205015,
  name: 'The Destined Death',
  rarity: 5,
  type: 'Epiphany',
  level: 20,
  main_stat_label: 'DMG Bonus',
  main_stat_value: '+15%',
  description: 'Effect text',
  lore: 'Lore text',
  image_path: 'epiphanies/icon_equipment_72205015.webp',
}

function database() {
  const requests = []
  const handler = createSilverPalaceEpiphaniesHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url) {
      requests.push(url)
      const table = /rest\/v1\/([a-z_]+)\?/.exec(url)[1]
      const rows = {
        sp_epiphanies: url.includes('slug=eq.missing') ? [] : [epiphany],
        sp_epiphany_substats: [
          { position: 1, label: 'ATK', value: '+8%' },
          { position: 2, label: 'CRIT Rate', value: '+10%' },
        ],
        sp_epiphany_addendums: [{ position: 1, label: 'CRIT DMG', value: '+43.75%' }],
      }[table]
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists epiphanies with the main stat and bucket image URLs', async () => {
  const { handler, requests } = database()
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.match(requests[0], /sp_epiphanies\?select=slug,name,rarity/)
  assert.deepEqual(list.body[0].main_stat, { label: 'DMG Bonus', value: '+15%' })
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/SilverPalace/epiphanies/icon_equipment_72205015.webp',
  )
  assert.equal(list.body[0].lore, undefined)
})

test('loads one epiphany with lore and substats', async () => {
  const { handler } = database()
  const { status, body } = await call(handler, '/?slug=the-destined-death')
  assert.equal(status, 200)
  assert.equal(body.lore, 'Lore text')
  assert.deepEqual(
    body.substats.map((sub) => sub.label),
    ['ATK', 'CRIT Rate'],
  )
  assert.equal(body.addendums[0].label, 'CRIT DMG')
})

test('validates the slug, the method and missing epiphanies', async () => {
  const { handler } = database()
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createSilverPalaceEpiphaniesHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createSilverPalaceEpiphaniesHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
