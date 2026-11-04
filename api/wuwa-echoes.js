const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS = 'slug,name,cost,class,image_path,sonata_effects'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createWuwaEchoesHandler({
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

  // `image_base` lets the page build sonata effect icon URLs from the same bucket.
  const withImage = (echo) => ({
    ...echo,
    image_url: echo.image_path ? `${base}${echo.image_path}` : null,
    image_base: base,
  })

  return async function wuwaEchoesHandler(req, res) {
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
      send(res, 503, { error: 'ECHOES CURRENTLY LOST IN THE STATIC' })
      return
    }
    const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
    if (slug !== null && !SLUG.test(slug)) {
      send(res, 400, { error: 'Invalid echo' })
      return
    }

    try {
      const cache = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'
      if (!slug) {
        const echoes = await query(
          `wuwa_echoes?select=${LIST_FIELDS}&order=cost.desc,name.asc&limit=1000`,
        )
        send(res, 200, echoes.map(withImage), cache)
        return
      }
      const [echo] = await query(`wuwa_echoes?select=*&slug=eq.${slug}&limit=1`)
      if (!echo) {
        send(res, 404, { error: 'Echo not found' })
        return
      }
      send(res, 200, withImage(echo), cache)
    } catch (error) {
      console.error('Wuthering Waves echo load failed:', error)
      send(res, 502, { error: 'Could not load echo data. Please try again shortly.' })
    }
  }
}

export default createWuwaEchoesHandler()
