import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  characterLevels,
  echoMainStatPresets,
  parseDataModule,
  slugify,
  sqlJson,
  sqlText,
  weaponLevels,
} from '../scripts/wuwa-builder-data.mjs'

test('reads public JSON modules as data without evaluating JavaScript', () => {
  assert.deepEqual(
    parseDataModule(
      'const e=JSON.parse(\'[{"Name":"Cantarella","HP":928}]\');export{e as default};',
    ),
    [{ Name: 'Cantarella', HP: 928 }],
  )
  const data = parseDataModule(
    'const e=[{Id:1,Value:1e4,Percent:!0}],o={rows:e};export{o as default,e as rows};',
  )
  assert.equal(data.rows[0].Value, 10000)
  assert.equal(data.rows[0].Percent, true)
  assert.throws(() => parseDataModule('const e=process.exit();export{e as default};'))
  assert.throws(() => parseDataModule('const e=`${process.exit()}`;export{e as default};'))
  assert.throws(() =>
    parseDataModule('const e=[];export{e as default};globalThis.sideEffect=true;'),
  )
})

test('preserves escaped JSON text and rejects truncated source modules', () => {
  const json = JSON.stringify([{ name: 'A "quote"', text: 'line\nnext' }])
  const literal = json.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
  assert.deepEqual(
    parseDataModule(`const e=JSON.parse(\`${literal}\`);export{e as default};`),
    JSON.parse(json),
  )
  assert.throws(() => parseDataModule('const e=JSON.parse(`incomplete'))
})

test('character growth preserves ascension boundaries and missing data', () => {
  const rows = characterLevels({ Life: 928, Atk: 32, Def: 90 }, [
    { Level: 20, BreachLevel: 0, LifeMaxRatio: 26011, AtkRatio: 26011, DefRatio: 25654 },
    { Level: 20, BreachLevel: 1, LifeMaxRatio: 32677, AtkRatio: 32677, DefRatio: 32123 },
    { Level: 90, BreachLevel: 6, LifeMaxRatio: 125000, AtkRatio: 125000, DefRatio: 122222 },
  ])
  assert.equal(rows[0].level, rows[1].level)
  assert.notEqual(rows[0].hp, rows[1].hp)
  assert.deepEqual(rows[2], { level: 90, ascension: 6, hp: 11600, atk: 400, def: 1099 })
  assert.deepEqual(characterLevels({}, []), [])
  assert.equal(
    characterLevels({ Life: 1230, Atk: 25, Def: 0 }, [
      { Level: 1, BreachLevel: 0, LifeMaxRatio: 10000, AtkRatio: 10000, DefRatio: 10000 },
    ])[0].def,
    null,
  )
})

test('weapon growth scales percentage units and respects starter level caps', () => {
  const weapon = {
    QualityId: 5,
    FirstCurve: 1,
    SecondCurve: 2,
    FirstPropId: { Value: 40 },
    SecondPropId: { Value: 1600, IsPercent: true },
  }
  const growth = [
    { CurveId: 1, Level: 60, BreachLevel: 3, CurveValue: 80000 },
    { CurveId: 2, Level: 60, BreachLevel: 3, CurveValue: 30000 },
    { CurveId: 1, Level: 60, BreachLevel: 4, CurveValue: 85000 },
    { CurveId: 2, Level: 60, BreachLevel: 4, CurveValue: 35000 },
    { CurveId: 1, Level: 90, BreachLevel: 6, CurveValue: 125000 },
    { CurveId: 2, Level: 90, BreachLevel: 6, CurveValue: 45000 },
  ]
  assert.deepEqual(weaponLevels(weapon, growth).at(-1), {
    level: 90,
    ascension: 6,
    atk: 500,
    sub_value: 72,
  })
  assert.equal(weaponLevels({ ...weapon, QualityId: 2 }, growth).length, 1)
  assert.equal(
    weaponLevels(
      { ...weapon, SecondPropId: { Value: 0.06750000268220901, IsRatio: true } },
      growth,
    ).at(-1).sub_value,
    30.4,
  )
  assert.throws(() => weaponLevels(weapon, growth.slice(0, 1)))
})

test('SQL quotes remain valid with apostrophes and embedded delimiters', () => {
  assert.equal(sqlText(null), 'null')
  assert.equal(sqlText("Shorekeeper's"), "$builder$Shorekeeper's$builder$")
  assert.equal(sqlText('$builder$'), '$builder_$$builder$$builder_$')
  assert.equal(sqlJson([{ name: 'Jué' }]), '$builder$[{"name":"Jué"}]$builder$::jsonb')
  assert.equal(slugify('Jué'), 'jue')
  assert.equal(slugify('Rover (Electro)'), 'rover-electro')
})

test('echo main stats distinguish cost, rarity, level, fixed stats and display rounding', () => {
  const ids = [
    2017, 2018, 2019, 50002, 2013, 2014, 2015, 5007, 5008, 5009, 5010, 5011, 5012, 5016, 50001,
    2003, 2004, 2005, 5001, 5002, 5006,
  ]
  const properties = ids.map((Id) => ({
    Id,
    AddType: 2,
    GrowthId: 1,
    Values: [225, 240, 270, 360],
    Prop: { Name: 'ATK', IsPercent: false },
  }))
  Object.assign(
    properties.find((row) => row.Id === 50001),
    {
      AddType: 1,
      Values: [12, 13, 15, 20, 18, 20, 22, 30],
    },
  )
  Object.assign(
    properties.find((row) => row.Id === 50002),
    {
      AddType: 1,
      Values: [114, 152, 228, 456],
      Prop: { Name: 'HP', IsPercent: false },
    },
  )
  Object.assign(
    properties.find((row) => row.Id === 5001),
    {
      AddType: 1,
      Values: [275, 293, 330, 440],
      Prop: { Name: 'Crit. Rate', IsPercent: true },
    },
  )
  Object.assign(
    properties.find((row) => row.Id === 2018),
    {
      Values: [285, 304, 342, 456],
      Prop: { Name: 'HP', IsPercent: false },
    },
  )
  const growth = Array.from({ length: 26 }, (_, Level) => ({
    GrowthId: 1,
    Level,
    Value: 10000 + Level * 1600,
  }))
  const presets = echoMainStatPresets(properties, growth)
  assert.equal(presets.length, 222)
  const stats = (cost, rarity, level) =>
    presets.find((row) => row.cost === cost && row.rarity === rarity && row.level === level).stats
  assert.equal(stats(4, 5, 25).find((row) => row.stat === 'Crit Rate').value, 22)
  assert.equal(stats(4, 5, 25).find((row) => row.fixed).value, 150)
  assert.equal(stats(3, 5, 25).find((row) => row.fixed).value, 100)
  assert.equal(stats(1, 5, 25).find((row) => row.fixed).value, 2280)
  assert.equal(stats(1, 5, 0).find((row) => row.stat === 'HP%').value, 4.5)
  assert.equal(stats(1, 2, 10).find((row) => row.fixed).value, 296)
  assert(!presets.some((row) => row.rarity === 2 && row.level > 10))
  assert.throws(() => echoMainStatPresets([], growth))
})
