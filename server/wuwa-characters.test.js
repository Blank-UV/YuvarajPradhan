import assert from 'node:assert/strict'
import test from 'node:test'
import { createWuwaCharactersHandler } from '../api/wuwa-characters.js'

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

const sample = {
  slug: 'sample',
  name: 'Sample',
  rarity: 4,
  element: 'Aero',
  weapon_type: 'Pistols',
  image_path: 'characters/sample.webp',
  skills: [
    { tab: 'passive', name: 'B', sort_order: 1 },
    { tab: 'active', name: 'A', sort_order: 0 },
  ],
  sequences: [{ node: 2 }, { node: 1 }],
  materials: [
    { name: 'Y', sort_order: 1 },
    { name: 'X', sort_order: 0 },
  ],
}

function database(rows) {
  const requests = []
  const handler = createWuwaCharactersHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url, options) {
      requests.push({ url, options })
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists characters from Supabase with bucket image URLs', async () => {
  const { handler, requests } = database([sample])

  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.match(
    requests[0].url,
    /^https:\/\/example\.supabase\.co\/rest\/v1\/wuwa_characters\?select=slug,name/,
  )
  assert.equal(requests[0].options.headers.apikey, 'sb_publishable_key')
  assert.equal(requests[0].options.headers.Authorization, undefined)
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/WutheringWaves/characters/sample.webp',
  )
})

test('loads one character with its related rows sorted', async () => {
  const { handler, requests } = database([sample])

  const detail = await call(handler, '/?slug=sample')
  assert.equal(detail.status, 200)
  assert.match(requests[0].url, /slug=eq\.sample&limit=1$/)
  assert.deepEqual(
    detail.body.skills.map((skill) => skill.name),
    ['A', 'B'],
  )
  assert.deepEqual(
    detail.body.sequences.map((sequence) => sequence.node),
    [1, 2],
  )
  assert.deepEqual(
    detail.body.materials.map((material) => material.name),
    ['X', 'Y'],
  )
})

test('sends a bearer token only for JWT-style keys', async () => {
  const requests = []
  const handler = createWuwaCharactersHandler({
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'eyJhbGciOi.payload.signature',
    async fetchImpl(url, options) {
      requests.push(options)
      return { ok: true, json: async () => [] }
    },
  })
  await call(handler, '/')
  assert.equal(requests[0].headers.Authorization, 'Bearer eyJhbGciOi.payload.signature')
})

test('rejects bad requests and unknown characters', async () => {
  const { handler } = database([])
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration instead of serving local data', async () => {
  const handler = createWuwaCharactersHandler({ supabaseUrl: '', anonKey: '' })
  assert.equal((await call(handler, '/')).status, 503)
})

test('reports database failures as a gateway error', async () => {
  const handler = createWuwaCharactersHandler({
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'key',
    fetchImpl: async () => ({ ok: false, status: 500 }),
  })
  const originalError = console.error
  console.error = () => {}
  try {
    assert.equal((await call(handler, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
