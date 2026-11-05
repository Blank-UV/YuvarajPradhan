const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS =
  'slug,name,rarity,weapon_type,image_path,atk,sub_stat,sub_value,skill_name,max_level'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createWuwaWeaponsHandler({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  imageBase = process.env.WUWA_IMAGE_BASE,
  fetchImpl = fetch,
} = {}) {
  const configured = Boolean(supabaseUrl && anonKey)
  let warned = false
  const apiUrl = configured ? supabaseUrl.replace(/\/$/, '') : ''
  const base = imageBase ?? `${apiUrl}/storage/v1/object/public/WutheringWaves/`

  async function query(path) {
    const headers = { apikey: anonKey }
    // New-style publishable keys are not JWTs and must not be sent as a bearer token.
    if (anonKey.startsWith('eyJ')) headers.Authorization = ['Bearer', anonKey].join(' ')
    const response = await fetchImpl(`${apiUrl}/rest/v1/${path}`, { headers })
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}`)
    return response.json()
  }

  const withImage = (weapon) => ({
    ...weapon,
    image_url: weapon.image_path ? `${base}${weapon.image_path}` : null,
  })

  return async function wuwaWeaponsHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(res, 405, { error: 'Method not allowed' })
      return
    }
    if (!configured) {
      if (!warned) {
        warned = true
        console.error('Wuthering Waves: set SUPABASE_URL and SUPABASE_ANON_KEY on the server.')
      }
      send(res, 503, { error: 'WEAPONS CURRENTLY BEING FORGED' })
      return
    }
    const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
    if (slug !== null && !SLUG.test(slug)) {
      send(res, 400, { error: 'Invalid weapon' })
      return
    }

    try {
      const cache = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      if (!slug) {
        const weapons = await query(
          `wuwa_weapons?select=${LIST_FIELDS}&order=rarity.desc,name.asc&limit=1000`,
        )
        send(res, 200, weapons.map(withImage), cache)
        return
      }
      const [weapon] = await query(`wuwa_weapons?select=*&slug=eq.${slug}&limit=1`)
      if (!weapon) {
        send(res, 404, { error: 'Weapon not found' })
        return
      }
      send(res, 200, withImage(weapon), cache)
    } catch (error) {
      console.error('Wuthering Waves weapon load failed:', error)
      send(res, 502, { error: 'Could not load weapon data. Please try again shortly.' })
    }
  }
}

export default createWuwaWeaponsHandler()
