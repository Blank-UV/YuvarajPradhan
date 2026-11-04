const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS = 'slug,name,rarity,element,weapon_type,image_path,is_new'
const DETAIL_FIELDS =
  '*,skills:wuwa_character_skills(*),sequences:wuwa_character_sequences(*),materials:wuwa_character_materials(*)'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createWuwaCharactersHandler({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  imageBase = process.env.WUWA_IMAGE_BASE,
  fetchImpl = fetch,
} = {}) {
  const configured = Boolean(supabaseUrl && anonKey)
  const apiUrl = configured ? supabaseUrl.replace(/\/$/, '') : ''
  const base = imageBase ?? `${apiUrl}/storage/v1/object/public/WutheringWaves/`

  async function query(path) {
    const headers = { apikey: anonKey }
    // New-style publishable keys are not JWTs and must not be sent as a bearer token.
    if (anonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${anonKey}`
    const response = await fetchImpl(`${apiUrl}/rest/v1/${path}`, { headers })
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}`)
    return response.json()
  }

  const withImage = (character) => ({
    ...character,
    image_url: character.image_path ? `${base}${character.image_path}` : null,
  })

  return async function wuwaCharactersHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(res, 405, { error: 'Method not allowed' })
      return
    }
    if (!configured) {
      send(res, 503, {
        error:
          'Character data is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the server.',
      })
      return
    }
    const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
    if (slug !== null && !SLUG.test(slug)) {
      send(res, 400, { error: 'Invalid character' })
      return
    }

    try {
      const cache = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'
      if (!slug) {
        const characters = await query(`wuwa_characters?select=${LIST_FIELDS}&order=name.asc`)
        send(res, 200, characters.map(withImage), cache)
        return
      }
      const [character] = await query(
        `wuwa_characters?select=${DETAIL_FIELDS}&slug=eq.${slug}&limit=1`,
      )
      if (!character) {
        send(res, 404, { error: 'Character not found' })
        return
      }
      send(
        res,
        200,
        {
          ...withImage(character),
          skills: [...character.skills].sort((a, b) => a.sort_order - b.sort_order),
          sequences: [...character.sequences].sort((a, b) => a.node - b.node),
          materials: [...character.materials].sort((a, b) => a.sort_order - b.sort_order),
        },
        cache,
      )
    } catch (error) {
      console.error('Wuthering Waves character load failed:', error)
      send(res, 502, { error: 'Could not load character data. Please try again shortly.' })
    }
  }
}

export default createWuwaCharactersHandler()
