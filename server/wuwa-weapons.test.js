import assert from 'node:assert/strict'
import test from 'node:test'
import { createWuwaWeaponsHandler } from '../api/wuwa-weapons.js'

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

const sample = { slug: 'sample', name: 'Sample', rarity: 5, image_path: 'weapons/sample.png' }

function database(rows) {
  const requests = []
  const handler = createWuwaWeaponsHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url, options) {
      requests.push({ url, options })
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists weapons with bucket image URLs', async () => {
  const { handler, requests } = database([sample])
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.match(
    requests[0].url,
    /^https:\/\/example\.supabase\.co\/rest\/v1\/wuwa_weapons\?select=slug,name/,
  )
  assert.equal(requests[0].options.headers.Authorization, undefined)
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/WutheringWaves/weapons/sample.png',
  )
})

test('loads one weapon and validates the slug', async () => {
  const { handler, requests } = database([sample])
  assert.equal((await call(handler, '/?slug=sample')).status, 200)
  assert.match(requests[0].url, /slug=eq\.sample&limit=1$/)
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(database([]).handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createWuwaWeaponsHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createWuwaWeaponsHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
