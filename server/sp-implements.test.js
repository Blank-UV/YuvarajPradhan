import assert from 'node:assert/strict'
import test from 'node:test'
import { createSilverPalaceImplementsHandler } from '../api/sp-implements.js'

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

const implement = {
  id: 'i1',
  slug: 'hey-jack',
  source_id: 1,
  name: 'Hey, Jack',
  rarity: 5,
  type: 'Implement',
  description: 'Set of 4: ...',
  lore: 'Jack, oh Jack',
  max_stack: 1,
  image_path: 'implements/set.webp',
}

function database() {
  const requests = []
  const handler = createSilverPalaceImplementsHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_key',
    async fetchImpl(url) {
      requests.push(url)
      const table = /rest\/v1\/([a-z_]+)\?/.exec(url)[1]
      const rows = {
        sp_implements: url.includes('slug=eq.missing') ? [] : [implement],
        sp_implement_pieces: [
          { id: 'p1', position: 1, name: 'The Blind Man', image_path: 'implements/p1.webp' },
          { id: 'p2', position: 2, name: 'The Wisher', image_path: null },
        ],
        sp_implement_stats: [
          { piece_id: 'p1', position: 1, level: 20, label: 'DEF', value: '34' },
          { piece_id: 'p1', position: 1, level: 40, label: 'DEF', value: '62' },
          { piece_id: 'p1', position: 2, level: 20, label: 'HP', value: '698' },
          { piece_id: 'p2', position: 1, level: 20, label: 'ATK', value: '10' },
        ],
      }[table]
      return { ok: true, json: async () => rows }
    },
  })
  return { handler, requests }
}

test('lists implements with bucket image URLs and no pieces', async () => {
  const { handler } = database()
  const list = await call(handler, '/')
  assert.equal(list.status, 200)
  assert.equal(
    list.body[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/SilverPalace/implements/set.webp',
  )
  assert.equal(list.body[0].pieces, undefined)
  assert.equal(list.body[0].id, undefined)
})

test('loads one implement with pieces and stats grouped by stat and level', async () => {
  const { handler, requests } = database()
  const { status, body } = await call(handler, '/?slug=hey-jack')
  assert.equal(status, 200)
  assert.equal(body.lore, 'Jack, oh Jack')
  assert.equal(body.pieces.length, 2)
  assert.deepEqual(body.pieces[0].stats, [
    {
      label: 'DEF',
      values: [
        { level: 20, value: '34' },
        { level: 40, value: '62' },
      ],
    },
    { label: 'HP', values: [{ level: 20, value: '698' }] },
  ])
  assert.deepEqual(body.pieces[1].stats[0].values, [{ level: 20, value: '10' }])
  assert.equal(body.pieces[1].image_url, null)
  assert.match(requests[1], /implement_id=eq\.i1/)
})

test('validates the slug, the method and missing implements', async () => {
  const { handler } = database()
  assert.equal((await call(handler, '/?slug=../secret')).status, 400)
  assert.equal((await call(handler, '/?slug=missing')).status, 404)
  assert.equal((await call(handler, '/', 'POST')).status, 405)
})

test('reports missing configuration and database failures', async () => {
  const originalError = console.error
  console.error = () => {}
  try {
    const unconfigured = createSilverPalaceImplementsHandler({ supabaseUrl: '', anonKey: '' })
    assert.equal((await call(unconfigured, '/')).status, 503)
    const failing = createSilverPalaceImplementsHandler({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'key',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    })
    assert.equal((await call(failing, '/')).status, 502)
  } finally {
    console.error = originalError
  }
})
