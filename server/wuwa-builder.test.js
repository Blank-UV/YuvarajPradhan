import assert from 'node:assert/strict'
import test from 'node:test'
import { createWuwaBuilderHandler } from '../api/wuwa-builder.js'
import {
  buildIssues,
  critValue,
  emptyBuild,
  emptyEcho,
  selectedPreset,
  sonataCounts,
  statValue,
  calculateBuildStats,
  resolvedBuildStats,
  echoCost,
  levelKey,
} from '../src/wuwa-build.js'
import { filterEchoes } from '../src/wuwa-catalog.js'

async function call(handler, url = '/', method = 'GET') {
  let result
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    writeHead(status, headers) {
      this.status = status
      Object.assign(this.headers, headers)
    },
    end(body) {
      result = { status: this.status, headers: this.headers, body: JSON.parse(body) }
    },
  }
  await handler({ url, method }, response)
  return result
}
const tables = {
  wuwa_characters: [{ slug: 'sanhua', name: 'Sanhua', image_path: 'characters/sanhua.png' }],
  wuwa_weapons: [{ slug: 'sword', name: 'Sword', image_path: 'weapons/sword.png' }],
  wuwa_echoes: [{ slug: 'echo', cost: 1 }],
  wuwa_sonata_effects: [{ slug: 'set' }],
  wuwa_builder_rules: ['stat_definitions', 'echo_main_stats', 'echo_substats'].map((key) => ({
    key,
    data: [{ stat: 'example' }],
  })),
  wuwa_builder_characters: [
    { character_slug: 'sanhua', game_id: 1 },
    { character_slug: 'sanhua', game_id: 2 },
  ],
  wuwa_builder_weapons: [{ weapon_slug: 'sword' }],
}
function database(overrides = {}, extra = {}) {
  const requests = []
  const handler = createWuwaBuilderHandler({
    supabaseUrl: 'https://example.supabase.co/',
    anonKey: 'sb_publishable_test',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      const table = new URL(url).pathname.split('/').at(-1)
      return { ok: true, json: async () => ({ ...tables, ...overrides })[table] }
    },
    ...extra,
  })
  return { handler, requests }
}
test('builder catalog loads public reference data and bucket URLs without sending a publishable bearer', async () => {
  const { handler, requests } = database()
  const result = await call(handler)
  assert.equal(result.status, 200)
  assert.equal(requests.length, 5)
  assert.ok(requests.every((request) => request.options.headers.Authorization === undefined))
  assert.equal(
    result.body.characters[0].image_url,
    'https://example.supabase.co/storage/v1/object/public/WutheringWaves/characters/sanhua.png',
  )
  assert.equal(result.body.echoes[0].image_url, null)
  assert.ok(result.body.rules.echo_main_stats)
  assert.match(result.headers['Cache-Control'], /s-maxage=300/)
})
test('builder detail preserves character variants, queries one weapon, and supports custom image base/JWT', async () => {
  const { handler, requests } = database(
    {},
    { anonKey: 'eyJ.test', imageBase: 'https://assets.example.test/' },
  )
  const character = await call(handler, '/?character=sanhua')
  assert.equal(character.body.variants.length, 2)
  assert.match(requests[0].url, /character_slug=eq.sanhua/)
  assert.equal(requests[0].options.headers.Authorization, 'Bearer eyJ.test')
  const weapon = await call(handler, '/?weapon=sword')
  assert.equal(weapon.body.weapon_slug, 'sword')
  assert.equal((await call(handler)).body.image_base, 'https://assets.example.test/')
})
test('builder rejects invalid selectors/methods and reports absent references', async () => {
  const { handler, requests } = database()
  for (const url of [
    '/?character=',
    '/?weapon=../secret',
    '/?character=sanhua&weapon=sword',
    '/?character=x%26select=*',
  ]) {
    assert.equal((await call(handler, url)).status, 400)
  }
  assert.equal(requests.length, 0)
  const method = await call(handler, '/', 'POST')
  assert.equal(method.status, 405)
  assert.equal(method.headers.Allow, 'GET')
  const missing = database({ wuwa_builder_characters: [], wuwa_builder_weapons: [] }).handler
  assert.equal((await call(missing, '/?character=missing')).status, 404)
  assert.equal((await call(missing, '/?weapon=missing')).status, 404)
})
test('builder reports configuration, incomplete imports, and upstream errors without caching errors', async () => {
  const log = console.error
  console.error = () => {}
  try {
    assert.equal(
      (await call(createWuwaBuilderHandler({ supabaseUrl: '', anonKey: '' }))).status,
      503,
    )
    assert.equal((await call(database({ wuwa_builder_rules: [] }).handler)).status, 502)
    const failure = await call(
      database({}, { fetchImpl: async () => ({ ok: false, status: 401 }) }).handler,
    )
    assert.equal(failure.status, 502)
    assert.equal(failure.headers['Cache-Control'], 'no-store')
    assert.equal((await call(database({ wuwa_echoes: { error: 'invalid' } }).handler)).status, 502)
  } finally {
    console.error = log
  }
})

const catalog = {
  echoes: [
    { slug: 'echo', cost: 4, sonata_effects: [{ slug: 'set' }] },
    { slug: 'other', cost: 1, sonata_effects: [{ slug: 'set' }] },
  ],
  rules: {
    echo_main_stats: [
      {
        cost: 4,
        rarity: 5,
        level: 25,
        stats: [{ stat: 'Crit. Rate', value: 22, unit: 'percent', fixed: false }],
      },
      {
        cost: 4,
        rarity: 5,
        level: 20,
        stats: [{ stat: 'Crit. Rate', value: 18, unit: 'percent', fixed: false }],
      },
      {
        cost: 1,
        rarity: 5,
        level: 25,
        stats: [{ stat: 'ATK%', value: 18, unit: 'percent', fixed: false }],
      },
    ],
  },
}
function equipped() {
  return { ...emptyEcho(), slug: 'echo', sonata: 'set', main: 'Crit. Rate' }
}
test('main stats select by cost, rarity and exact level; blank stats are not zero', () => {
  const slot = equipped()
  assert.equal(selectedPreset(catalog, slot).stats[0].value, 22)
  assert.equal(selectedPreset(catalog, { ...slot, level: 20 }).stats[0].value, 18)
  assert.equal(selectedPreset(catalog, { ...slot, rarity: 4 }), undefined)
  assert.equal(statValue(''), '\u2014')
  assert.equal(statValue(0, true), '0%')
})
test('echo CV uses tuned crit rolls only and ignores other stat rolls', () => {
  const slot = equipped()
  slot.substats = [
    { id: '8', value: '10.5' },
    { id: '9', value: '21' },
    { id: '10007', value: '11.6' },
  ]
  assert.equal(critValue([slot]), 42)
  assert.equal(critValue([emptyEcho()]), 0)
})
test('duplicate echoes may be equipped but only count once for sonata pieces', () => {
  const slot = equipped()
  assert.deepEqual(
    sonataCounts([slot, slot, { ...emptyEcho(), slug: 'other', sonata: 'set' }], catalog.echoes),
    [{ slug: 'set', count: 2 }],
  )
  assert.deepEqual(sonataCounts([{ ...slot, sonata: 'invalid' }], catalog.echoes), [])
  const build = emptyBuild()
  build.echoes[0] = slot
  build.echoes[1] = equipped()
  assert.deepEqual(buildIssues(build, catalog), [])
})
test('builder validates exact 12-cost boundary, duplicate types, tuning unlocks, and incomplete equipment', () => {
  const build = emptyBuild()
  build.echoes = [equipped(), equipped(), equipped(), emptyEcho(), emptyEcho()]
  assert.deepEqual(buildIssues(build, catalog), [])
  build.echoes[3] = { ...equipped(), slug: 'other', main: 'ATK%' }
  assert.match(buildIssues(build, catalog).join(), /13\/12/)
  build.echoes = [equipped(), emptyEcho(), emptyEcho(), emptyEcho(), emptyEcho()]
  build.echoes[0].substats = [
    { id: '8', value: '12' },
    { id: '8', value: '' },
  ]
  assert.match(buildIssues(build, catalog).join(), /duplicate substat/)
  assert.match(buildIssues(build, catalog).join(), /valid values/)
  build.echoes[0] = {
    ...equipped(),
    level: 20,
    substats: Array.from({ length: 5 }, (_, id) => ({ id: String(id), value: '1' })),
  }
  assert.match(buildIssues(build, catalog).join(), /more substats/)
  build.echoes[0] = { ...equipped(), main: '', sonata: '' }
  assert.match(buildIssues(build, catalog).join(), /valid main stat/)
  assert.match(buildIssues(build, catalog).join(), /valid sonata/)
  const a = emptyBuild()
  a.echoes[0].substats[0].value = '99'
  assert.equal(a.echoes[1].substats[0].value, '')
})

const calculationCatalog = {
  echoes: [{ slug: 'test-echo', cost: 4 }],
  rules: {
    echo_main_stats: [
      {
        cost: 4,
        rarity: 5,
        level: 25,
        stats: [
          { stat: 'ATK%', value: 33, unit: 'percent', fixed: false },
          { stat: 'Crit Rate', value: 22, unit: 'percent', fixed: false },
          { stat: 'Havoc DMG Bonus', value: 30, unit: 'percent', fixed: false },
          { stat: 'ATK', value: 150, unit: 'flat', fixed: true },
        ],
      },
      {
        cost: 4,
        rarity: 5,
        level: 0,
        stats: [
          { stat: 'ATK%', value: 4, unit: 'percent', fixed: false },
          { stat: 'ATK', value: 10, unit: 'flat', fixed: true },
        ],
      },
    ],
    echo_substats: [
      { property_id: 7, stat: 'ATK', unit: 'flat' },
      { property_id: 10007, stat: 'ATK', unit: 'percent' },
      { property_id: 2, stat: 'HP', unit: 'flat' },
      { property_id: 10002, stat: 'HP', unit: 'percent' },
      { property_id: 10, stat: 'DEF', unit: 'flat' },
      { property_id: 10010, stat: 'DEF', unit: 'percent' },
      { property_id: 8, stat: 'Crit. Rate', unit: 'percent' },
      { property_id: 9, stat: 'Crit. DMG', unit: 'percent' },
      { property_id: 11, stat: 'Energy Regen', unit: 'percent' },
      { property_id: 14, stat: 'Resonance Skill DMG Bonus', unit: 'percent' },
      { property_id: 19, stat: 'Resonance Liberation DMG Bonus', unit: 'percent' },
    ],
  },
}
function calculationFixture() {
  const build = emptyBuild()
  build.characterLevel = '90:6'
  build.weaponLevel = '90:6'
  const reference = {
    base_stats: { Crit: 500, CritDamage: 15000, EnergyEfficiency: 10000 },
    level_stats: [
      { level: 90, ascension: 6, hp: 10000, atk: 300, def: 1000 },
      { level: 1, ascension: 0, hp: 1000, atk: 30, def: 100 },
    ],
  }
  const weaponReference = {
    sub_stat: 'ATK',
    sub_is_percent: true,
    level_stats: [{ level: 90, ascension: 6, atk: 500, sub_value: 30 }],
  }
  const character = {
    element: 'Havoc',
    minor_fortes: [
      { stat: 'CRIT Rate', value: 8 },
      { stat: 'ATK%', value: 12 },
      { stat: 'Havoc DMG', value: 12 },
    ],
  }
  return { build, reference, weaponReference, character, catalog: calculationCatalog }
}
test('automatic totals combine character and weapon bases with echo main/fixed and flat/percent rolls', () => {
  const fixture = calculationFixture()
  fixture.build.echoes[0] = {
    ...emptyEcho(),
    slug: 'test-echo',
    main: 'ATK%',
    substats: [
      { id: '7', value: '50' },
      { id: '10007', value: '10' },
      { id: '2', value: '500' },
      { id: '10002', value: '10' },
      { id: '8', value: '10.5' },
    ],
  }
  const { stats, warnings } = calculateBuildStats(fixture)
  assert.equal(stats.atk, 1584)
  assert.equal(stats.hp, 11500)
  assert.equal(stats.def, 1000)
  assert.equal(stats.critRate, 15.5)
  assert.equal(stats.critDmg, 150)
  assert.equal(stats.energy, 100)
  assert.deepEqual(warnings, [])
  assert.equal(echoCost(fixture.build.echoes, fixture.catalog.echoes), 4)
})
test('automatic totals preserve percent weapon units, exact levels, and optional minor fortes', () => {
  const fixture = calculationFixture()
  fixture.build.minorFortes = [0, 1, 2]
  fixture.build.echoes[0] = { ...emptyEcho(), slug: 'test-echo', main: 'Crit Rate' }
  const result = calculateBuildStats(fixture).stats
  assert.equal(result.critRate, 35)
  assert.equal(result.atk, 1286)
  assert.equal(result.element, 12)
  fixture.build.echoes[0].main = 'Havoc DMG Bonus'
  assert.equal(calculateBuildStats(fixture).stats.element, 42)
  fixture.build.minorFortes = []
  fixture.build.characterLevel = '1:0'
  fixture.build.echoes[0] = { ...emptyEcho(), slug: 'test-echo', main: 'ATK%', level: 0 }
  assert.equal(calculateBuildStats(fixture).stats.atk, 720)
  assert.equal(levelKey(fixture.reference.level_stats[0]), '90:6')
})
test('all displayed percent substats add correctly and missing or incomplete rolls do not add', () => {
  const fixture = calculationFixture()
  fixture.weaponReference.sub_stat = 'Crit. DMG'
  fixture.weaponReference.level_stats[0].sub_value = 72
  fixture.build.echoes[0] = {
    ...emptyEcho(),
    slug: 'test-echo',
    substats: [
      { id: '9', value: '21' },
      { id: '11', value: '12' },
      { id: '14', value: '10' },
      { id: '19', value: '8.6' },
      { id: '8', value: '' },
    ],
  }
  const result = calculateBuildStats(fixture).stats
  assert.equal(result.critDmg, 243)
  assert.equal(result.energy, 112)
  assert.equal(result.skill, 10)
  assert.equal(result.liberation, 8.6)
  assert.equal(result.critRate, 5)
  fixture.build.echoes[0].substats = [
    { id: '10010', value: '14.7' },
    { id: '10', value: '60' },
  ]
  assert.equal(calculateBuildStats(fixture).stats.def, 1207)
})
test('missing base stats stay unknown and overrides replace totals without double counting', () => {
  const fixture = calculationFixture()
  fixture.reference.level_stats[0].def = null
  fixture.reference.base_stats.Crit = null
  fixture.build.echoes[0] = { ...emptyEcho(), slug: 'test-echo', main: 'Crit Rate' }
  const result = calculateBuildStats(fixture)
  assert.equal(result.stats.def, null)
  assert.equal(result.stats.critRate, null)
  assert.match(result.warnings.join(' '), /DEF.*missing/)
  fixture.build.stats.atk = '2400'
  fixture.build.stats.def = '1200'
  fixture.build.stats.skill = '0'
  assert.equal(resolvedBuildStats(fixture.build, result.stats).atk, 2400)
  assert.equal(resolvedBuildStats(fixture.build, result.stats).def, 1200)
  assert.equal(resolvedBuildStats(fixture.build, result.stats).skill, 0)
  fixture.build.stats.atk = ''
  assert.equal(resolvedBuildStats(fixture.build, result.stats).atk, result.stats.atk)
  fixture.build.characterLevel = ''
  assert.ok(Object.values(calculateBuildStats(fixture).stats).every((value) => value === null))
})
test('unknown stat labels are surfaced rather than silently applied as a guessed buff', () => {
  const fixture = calculationFixture()
  fixture.weaponReference.sub_stat = 'Conditional Damage'
  assert.deepEqual(calculateBuildStats(fixture).warnings, ['Not calculated: Conditional Damage.'])
})
test('archive and builder echo picker use the same search/cost/class/sonata intersection', () => {
  const rows = [
    {
      slug: 'a',
      name: 'Nightmare: Heron',
      cost: 3,
      class: 'Elite',
      sonata_effects: [{ name: 'Moonlit Clouds' }],
    },
    {
      slug: 'b',
      name: 'Heron',
      cost: 4,
      class: 'Overlord',
      sonata_effects: [{ name: 'Moonlit Clouds' }],
    },
    {
      slug: 'c',
      name: 'Glacio Heron',
      cost: 3,
      class: 'Elite',
      sonata_effects: [{ name: 'Freezing Frost' }],
    },
  ]
  assert.equal(filterEchoes(rows, {}).length, 3)
  assert.deepEqual(
    filterEchoes(rows, {
      search: '  HERON ',
      costs: [3],
      classes: ['Elite'],
      sonata: 'Moonlit Clouds',
    }).map((row) => row.slug),
    ['a'],
  )
  assert.equal(filterEchoes(rows, { costs: [1] }).length, 0)
  assert.deepEqual(
    filterEchoes(rows, { costs: [3, 4], classes: ['Overlord'] }).map((row) => row.slug),
    ['b'],
  )
})
