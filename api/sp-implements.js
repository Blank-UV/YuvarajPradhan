const SLUG = /^[a-z0-9-]+$/

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createSilverPalaceImplementsHandler({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  imageBase = process.env.SP_IMAGE_BASE,
  fetchImpl = fetch,
} = {}) {
  const configured = Boolean(supabaseUrl && anonKey)
  let warned = false
  const apiUrl = configured ? supabaseUrl.replace(/\/$/, '') : ''
  const base = imageBase ?? `${apiUrl}/storage/v1/object/public/SilverPalace/`
  const imageUrl = (path) => (path ? `${base}${path}` : null)

  async function query(path) {
    const headers = { apikey: anonKey }
    // New-style publishable keys are not JWTs and must not be sent as a bearer token.
    if (anonKey.startsWith('eyJ')) headers.Authorization = ['Bearer', anonKey].join(' ')
    const response = await fetchImpl(`${apiUrl}/rest/v1/${path}`, { headers })
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}`)
    return response.json()
  }

  const shape = (row, pieces = []) => ({
    slug: row.slug,
    name: row.name,
    rarity: row.rarity,
    type: row.type,
    description: row.description,
    lore: row.lore,
    max_stack: row.max_stack,
    image_url: imageUrl(row.image_path),
    pieces,
  })

  // Pieces with their stats grouped as [{ label, values: [{ level, value }] }] in stat order.
  async function loadPieces(implementId) {
    const pieces = await query(
      `sp_implement_pieces?select=id,position,name,image_path&implement_id=eq.${implementId}&order=position.asc`,
    )
    if (!pieces.length) return []
    const ids = pieces.map((piece) => piece.id).join(',')
    const stats = await query(
      `sp_implement_stats?select=piece_id,position,level,label,value&piece_id=in.(${ids})&order=position.asc,level.asc&limit=5000`,
    )
    return pieces.map((piece) => {
      const byPosition = new Map()
      for (const row of stats) {
        if (row.piece_id !== piece.id) continue
        if (!byPosition.has(row.position))
          byPosition.set(row.position, { label: row.label, values: [] })
        byPosition.get(row.position).values.push({ level: row.level, value: row.value })
      }
      return {
        position: piece.position,
        name: piece.name,
        image_url: imageUrl(piece.image_path),
        stats: [...byPosition.values()],
      }
    })
  }

  return async function silverPalaceImplementsHandler(req, res) {
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
      send(res, 400, { error: 'Invalid implement' })
      return
    }

    try {
      const cache = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'
      if (!slug) {
        const rows = await query('sp_implements?select=*&order=source_id.asc&limit=1000')
        send(
          res,
          200,
          rows.map((row) => ({ ...shape(row), lore: undefined, pieces: undefined })),
          cache,
        )
        return
      }
      const [implement] = await query(`sp_implements?select=*&slug=eq.${slug}&limit=1`)
      if (!implement) {
        send(res, 404, { error: 'Implement not found' })
        return
      }
      send(res, 200, shape(implement, await loadPieces(implement.id)), cache)
    } catch (error) {
      console.error('Silver Palace implement load failed:', error)
      send(res, 502, { error: 'Could not load implement data. Please try again shortly.' })
    }
  }
}

export default createSilverPalaceImplementsHandler()
