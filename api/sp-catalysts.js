const SLUG = /^[a-z0-9-]+$/

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createSilverPalaceCatalystsHandler({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  imageBase = process.env.SP_IMAGE_BASE,
  fetchImpl = fetch,
} = {}) {
  const configured = Boolean(supabaseUrl && anonKey)
  let warned = false
  const apiUrl = configured ? supabaseUrl.replace(/\/$/, '') : ''
  const base = imageBase ?? `${apiUrl}/storage/v1/object/public/SilverPalace/`

  async function query(path) {
    const headers = { apikey: anonKey }
    // New-style publishable keys are not JWTs and must not be sent as a bearer token.
    if (anonKey.startsWith('eyJ')) headers.Authorization = ['Bearer', anonKey].join(' ')
    const response = await fetchImpl(`${apiUrl}/rest/v1/${path}`, { headers })
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}`)
    return response.json()
  }

  // Where each catalyst is obtained: a few short rows, so they are loaded together and grouped here.
  const loadSources = async (filter = '') => {
    const rows = await query(
      `sp_catalyst_sources?select=catalyst_id,position,name${filter}&order=position.asc&limit=5000`,
    )
    const byCatalyst = new Map()
    for (const row of rows) {
      if (!byCatalyst.has(row.catalyst_id)) byCatalyst.set(row.catalyst_id, [])
      byCatalyst.get(row.catalyst_id).push(row.name)
    }
    return byCatalyst
  }

  const shape = (row, sources) => ({
    slug: row.slug,
    name: row.name,
    rarity: row.rarity,
    type: row.type,
    description: row.description,
    max_stack: row.max_stack,
    image_url: row.image_path ? `${base}${row.image_path}` : null,
    obtain: sources.get(row.id) ?? [],
  })

  return async function silverPalaceCatalystsHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(res, 405, { error: 'Method not allowed' })
      return
    }
    if (!configured) {
      if (!warned) {
        warned = true
        console.error('Silver Palace: set SUPABASE_URL and SUPABASE_ANON_KEY on the server.')
      }
      send(res, 503, { error: 'THE ARCHIVES ARE CURRENTLY SEALED' })
      return
    }
    const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
    if (slug !== null && !SLUG.test(slug)) {
      send(res, 400, { error: 'Invalid catalyst' })
      return
    }

    try {
      const cache = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      if (!slug) {
        const [rows, sources] = await Promise.all([
          query('sp_catalysts?select=*&order=source_id.asc&limit=1000'),
          loadSources(),
        ])
        send(
          res,
          200,
          rows.map((row) => shape(row, sources)),
          cache,
        )
        return
      }
      const [catalyst] = await query(`sp_catalysts?select=*&slug=eq.${slug}&limit=1`)
      if (!catalyst) {
        send(res, 404, { error: 'Catalyst not found' })
        return
      }
      const sources = await loadSources(`&catalyst_id=eq.${catalyst.id}`)
      send(res, 200, shape(catalyst, sources), cache)
    } catch (error) {
      console.error('Silver Palace catalyst load failed:', error)
      send(res, 502, { error: 'Could not load catalyst data. Please try again shortly.' })
    }
  }
}

export default createSilverPalaceCatalystsHandler()
