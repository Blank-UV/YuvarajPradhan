const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS =
  'slug,name,rarity,type,level,main_stat_label,main_stat_value,description,image_path,source_id'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createSilverPalaceEpiphaniesHandler({
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

  const summary = (row) => ({
    slug: row.slug,
    name: row.name,
    rarity: row.rarity,
    type: row.type,
    level: row.level,
    main_stat: row.main_stat_label
      ? { label: row.main_stat_label, value: row.main_stat_value }
      : null,
    description: row.description,
    image_url: row.image_path ? `${base}${row.image_path}` : null,
  })

  return async function silverPalaceEpiphaniesHandler(req, res) {
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
      send(res, 400, { error: 'Invalid epiphany' })
      return
    }

    try {
      const cache = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      if (!slug) {
        const rows = await query(
          `sp_epiphanies?select=${LIST_FIELDS}&order=source_id.asc&limit=1000`,
        )
        send(res, 200, rows.map(summary), cache)
        return
      }
      const [epiphany] = await query(`sp_epiphanies?select=*&slug=eq.${slug}&limit=1`)
      if (!epiphany) {
        send(res, 404, { error: 'Epiphany not found' })
        return
      }
      const [substats, addendums] = await Promise.all([
        query(
          `sp_epiphany_substats?select=position,label,value&epiphany_id=eq.${epiphany.id}&order=position.asc`,
        ),
        query('sp_epiphany_addendums?select=position,label,value&order=position.asc'),
      ])
      send(res, 200, { ...summary(epiphany), lore: epiphany.lore, substats, addendums }, cache)
    } catch (error) {
      console.error('Silver Palace epiphany load failed:', error)
      send(res, 502, { error: 'Could not load epiphany data. Please try again shortly.' })
    }
  }
}

export default createSilverPalaceEpiphaniesHandler()
