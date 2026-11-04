function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control':
      status === 200 ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=300' : 'no-store',
  })
  res.end(JSON.stringify(body))
}

export function createWuwaBuilderHandler({
  supabaseUrl = process.env.SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY,
  imageBase = process.env.WUWA_IMAGE_BASE,
  fetchImpl = fetch,
} = {}) {
  const configured = Boolean(supabaseUrl && anonKey)
  const origin = supabaseUrl?.replace(/\/$/, '')
  const base = `${(imageBase || `${origin}/storage/v1/object/public/WutheringWaves`).replace(/\/$/, '')}/`
  let warned = false
  async function query(path) {
    const headers = { apikey: anonKey }
    if (anonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${anonKey}`
    const response = await fetchImpl(`${origin}/rest/v1/${path}`, { headers })
    if (!response.ok) throw new Error(`Database returned HTTP ${response.status}`)
    const rows = await response.json()
    if (!Array.isArray(rows)) throw new Error('Database returned invalid reference data')
    return rows
  }
  const withImage = (row) => ({
    ...row,
    image_url: row.image_path ? `${base}${row.image_path}` : null,
  })
  return async function builderHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(res, 405, { error: 'Method not allowed' })
      return
    }
    const params = new URL(req.url, 'http://localhost').searchParams
    const character = params.get('character')
    const weapon = params.get('weapon')
    if (
      (character !== null && !/^[a-z0-9-]+$/.test(character)) ||
      (weapon !== null && !/^[a-z0-9-]+$/.test(weapon)) ||
      (character !== null && weapon !== null)
    ) {
      send(res, 400, { error: 'Select one valid character or weapon' })
      return
    }
    if (!configured) {
      if (!warned) {
        warned = true
        console.error('Wuthering Waves builder: set SUPABASE_URL and SUPABASE_ANON_KEY.')
      }
      send(res, 503, { error: 'BUILD/SHOW REFERENCE DATA CURRENTLY UNAVAILABLE' })
      return
    }
    try {
      if (character) {
        const variants = await query(
          `wuwa_builder_characters?select=*&character_slug=eq.${character}&order=game_id.asc&limit=10`,
        )
        send(
          res,
          variants.length ? 200 : 404,
          variants.length
            ? { variants }
            : {
                error: 'Builder reference data is not available for this character yet.',
              },
        )
        return
      }
      if (weapon) {
        const [reference] = await query(
          `wuwa_builder_weapons?select=*&weapon_slug=eq.${weapon}&limit=1`,
        )
        send(
          res,
          reference ? 200 : 404,
          reference || {
            error: 'Builder reference data is not available for this weapon yet.',
          },
        )
        return
      }
      const [characters, weapons, echoes, sonatas, rules] = await Promise.all([
        query(
          'wuwa_characters?select=slug,name,rarity,element,weapon_type,image_path,minor_fortes&order=name.asc&limit=1000',
        ),
        query(
          'wuwa_weapons?select=slug,name,rarity,weapon_type,image_path,max_level,syntony&order=rarity.desc,name.asc&limit=1000',
        ),
        query(
          'wuwa_echoes?select=slug,name,cost,class,image_path,sonata_effects&order=cost.desc,name.asc&limit=1000',
        ),
        query('wuwa_sonata_effects?select=slug,name,image_path&order=name.asc&limit=1000'),
        query('wuwa_builder_rules?select=key,data&limit=10'),
      ])
      const referenceRules = Object.fromEntries(rules.map((row) => [row.key, row.data]))
      if (
        !characters.length ||
        !weapons.length ||
        !echoes.length ||
        !sonatas.length ||
        !referenceRules.echo_main_stats?.length ||
        !referenceRules.echo_substats?.length ||
        !referenceRules.stat_definitions?.length
      ) {
        throw new Error('Builder reference tables are empty or incomplete')
      }
      send(res, 200, {
        characters: characters.map(withImage),
        weapons: weapons.map(withImage),
        echoes: echoes.map(withImage),
        sonatas: sonatas.map(withImage),
        rules: referenceRules,
        image_base: base,
      })
    } catch (error) {
      console.error('Wuthering Waves builder load failed:', error)
      send(res, 502, {
        error: 'Could not load builder data. Check the builder tables and try again.',
      })
    }
  }
}

export default createWuwaBuilderHandler()
