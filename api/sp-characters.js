const SLUG = /^[a-z0-9-]+$/
const LIST_FIELDS =
  'id,slug,name,title,rarity,weapon,accent_color,image_path,attribute_id,combat_style_id,identity_id,faction_id'

function send(res, status, body, cache = 'no-store') {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': cache })
  res.end(JSON.stringify(body))
}

export function createSilverPalaceCharactersHandler({
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
  const trait = (row) =>
    row ? { slug: row.slug, name: row.name, image_url: url(row.image_path) } : null

  // Traits are a handful of rows, so they are loaded whole and joined here instead of embedded.
  async function loadTraits() {
    const rows = await query('sp_traits?select=id,kind,slug,name,image_path&limit=500')
    return new Map(rows.map((row) => [row.id, row]))
  }

  const summary = (row, traits) => ({
    slug: row.slug,
    name: row.name,
    title: row.title,
    rarity: row.rarity,
    weapon: row.weapon,
    accent_color: row.accent_color,
    image_url: url(row.image_path),
    attribute: trait(traits.get(row.attribute_id)),
    combat_style: trait(traits.get(row.combat_style_id)),
    identity: trait(traits.get(row.identity_id)),
    faction: trait(traits.get(row.faction_id)),
  })

  // Skill numbers are stored one value per row; fold them back into one table per skill:
  // columns in display order and, for each level, the values aligned to those columns.
  function foldScaling(rows) {
    const columns = []
    const levels = new Map()
    for (const row of [...rows].sort((a, b) => a.level - b.level || a.position - b.position)) {
      if (!columns[row.position - 1]) columns[row.position - 1] = row.label
      if (!levels.has(row.level)) levels.set(row.level, [])
      levels.get(row.level)[row.position - 1] = row.value
    }
    return {
      columns,
      levels: [...levels].map(([level, values]) => ({ level, values })),
    }
  }

  async function loadCharacter(slug) {
    const [character] = await query(`sp_characters?select=*&slug=eq.${slug}&limit=1`)
    if (!character) return null
    const id = character.id
    const [traits, stats, gifts, trust, skills, psyches] = await Promise.all([
      loadTraits(),
      query(`sp_character_stats?select=level,hp,atk,def&character_id=eq.${id}&order=level.asc`),
      query(
        `sp_character_gifts?select=position,gift:sp_gifts(slug,name,image_path)&character_id=eq.${id}&order=position.asc`,
      ),
      query(
        `sp_character_trust_levels?select=level,exp,running_total,gifts_required,rewards&character_id=eq.${id}&order=level.asc`,
      ),
      query(
        `sp_character_skills?select=id,position,code,name,kind,image_path,description&character_id=eq.${id}&order=position.asc`,
      ),
      query(
        `sp_character_psyches?select=position,badge,name,description,image_path&character_id=eq.${id}&order=position.asc`,
      ),
    ])

    const skillIds = skills.map((skill) => skill.id)
    const scaling = skillIds.length
      ? await query(
          `sp_skill_scaling?select=skill_id,level,position,label,value&skill_id=in.(${skillIds.join(',')})&limit=5000`,
        )
      : []

    return {
      ...summary(character, traits),
      banner_url: url(character.banner_path),
      stats,
      gifts: gifts
        .filter((row) => row.gift)
        .map((row) => ({ name: row.gift.name, image_url: url(row.gift.image_path) })),
      trust,
      skills: skills.map((skill) => ({
        position: skill.position,
        code: skill.code,
        name: skill.name,
        kind: skill.kind,
        image_url: url(skill.image_path),
        description: skill.description,
        ...foldScaling(scaling.filter((row) => row.skill_id === skill.id)),
      })),
      psyches: psyches.map((psyche) => ({
        position: psyche.position,
        badge: psyche.badge,
        name: psyche.name,
        description: psyche.description,
        image_url: url(psyche.image_path),
      })),
    }
  }

  return async function silverPalaceCharactersHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(res, 405, { error: 'Method not allowed' })
      return
    }
    const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
    if (slug !== null && !SLUG.test(slug)) {
      send(res, 400, { error: 'Invalid character' })
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

    try {
      const cache = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'
      if (!slug) {
        const [rows, traits] = await Promise.all([
          query(`sp_characters?select=${LIST_FIELDS}&order=sort_order.asc,name.asc&limit=1000`),
          loadTraits(),
        ])
        send(
          res,
          200,
          rows.map((row) => summary(row, traits)),
          cache,
        )
        return
      }
      const character = await loadCharacter(slug)
      if (!character) {
        send(res, 404, { error: 'Character not found' })
        return
      }
      send(res, 200, character, cache)
    } catch (error) {
      console.error('Silver Palace character load failed:', error)
      send(res, 502, { error: 'Could not load character data. Please try again shortly.' })
    }
  }
}

export default createSilverPalaceCharactersHandler()
