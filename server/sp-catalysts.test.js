import assert from 'node:assert/strict'
import test from 'node:test'
import { createSilverPalaceCatalystsHandler } from '../api/sp-catalysts.js'

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

const catalyst = {
  id: 'c1',
  slug: 'asphaltnium',
  source_id: 21501001,
  name: 'Asphaltnium',
  rarity: 4,
  type: 'Catalysts',
  description: 'Gain +6% DMG.',
  max_stack: 1,
  image_path: 'catalysts/icon_gem_009.webp',
}

function database() {
  const requests = []
  const handler = createSilverPalaceCatalystsHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url) {
      requests.push(url)
      const table = /rest\/v1\/([a-z_]+)\?/.exec(url)[1]
      const rows = {
        sp_catalysts: url.includes('slug=eq.missing') ? [] : [catalyst],
        sp_catalyst_sources: [
          { catalyst_id: 'c1', position: 1, name: 'Powerful Adversary' },
          { catalyst_id: 'c1', position: 2, name: 'Boutique' },
          { catalyst_id: 'other', position: 1, name: 'Riverside' },
        ],
      }[table]
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists catalysts with where to get them and bucket image URLs', async () => {
  const { handler } = database()
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.deepEqual(list.body[0].obtain, ['Powerful Adversary', 'Boutique'])
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/SilverPalace/catalysts/icon_gem_009.webp',
  )
  assert.equal(list.body[0].id, undefined)
})

test('loads one catalyst and only its own sources', async () => {
  const { handler, requests } = database()
  const { status, body } = await call(handler, '/?slug=asphaltnium')
  assert.equal(status, 200)
  assert.equal(body.name, 'Asphaltnium')
  assert.match(requests[1], /catalyst_id=eq\.c1/)
})

test('validates the slug, the method and missing catalysts', async () => {
  const { handler } = database()
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createSilverPalaceCatalystsHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createSilverPalaceCatalystsHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
