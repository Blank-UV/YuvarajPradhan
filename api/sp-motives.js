const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS =
  'slug,name,rarity,skill_name,base_hp,base_atk,bonus_stat,bonus_value,description,image_path,identity_id,source_id'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createSilverPalaceMotivesHandler({
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

  const url = (path) => (path ? `${base}${path}` : null)

  async function loadIdentities() {
    const rows = await query('sp_traits?select=id,slug,name,image_path&kind=eq.identity&limit=100')
    return new Map(rows.map((row) => [row.id, row]))
  }

  const summary = (row, identities) => {
    const identity = identities.get(row.identity_id)
    return {
      slug: row.slug,
      name: row.name,
      rarity: row.rarity,
      skill_name: row.skill_name,
      base_hp: row.base_hp,
      base_atk: row.base_atk,
      bonus_stat: row.bonus_stat,
      bonus_value: row.bonus_value,
      description: row.description,
      image_url: url(row.image_path),
      identity: identity
        ? { slug: identity.slug, name: identity.name, image_url: url(identity.image_path) }
        : null,
    }
  }

  return async function silverPalaceMotivesHandler(req, res) {
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
      send(res, 400, { error: 'Invalid motive' })
      return
    }

    try {
      const cache = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      if (!slug) {
        const [rows, identities] = await Promise.all([
          query(`sp_motives?select=${LIST_FIELDS}&order=rarity.desc,source_id.asc&limit=1000`),
          loadIdentities(),
        ])
        send(
          res,
          200,
          rows.map((row) => summary(row, identities)),
          cache,
        )
        return
      }
      const [motive] = await query(`sp_motives?select=*&slug=eq.${slug}&limit=1`)
      if (!motive) {
        send(res, 404, { error: 'Motive not found' })
        return
      }
      const [identities, ranks] = await Promise.all([
        loadIdentities(),
        query(`sp_motive_ranks?select=rank,description&motive_id=eq.${motive.id}&order=rank.asc`),
      ])
      send(res, 200, { ...summary(motive, identities), lore: motive.lore, ranks }, cache)
    } catch (error) {
      console.error('Silver Palace motive load failed:', error)
      send(res, 502, { error: 'Could not load motive data. Please try again shortly.' })
    }
  }
}

export default createSilverPalaceMotivesHandler()
