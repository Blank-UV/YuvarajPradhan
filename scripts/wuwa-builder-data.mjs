// Read the source site's static data modules without executing downloaded JavaScript.
export function parseDataModule(source) {
  let position = 0
  const bindings = new Map()
  const skip = () => {
    while (/\s/.test(source[position] ?? '') && position < source.length) position += 1
  }
  const take = (token) => {
    skip()
    if (!source.startsWith(token, position)) {
      throw new Error(`Expected ${token} at ${position}`)
    }
    position += token.length
  }
  const identifier = () => {
    skip()
    const match = source.slice(position).match(/^[A-Za-z_$][\w$]*/)
    if (!match) throw new Error(`Expected identifier at ${position}`)
    position += match[0].length
    return match[0]
  }
  const string = () => {
    const quote = source[position++]
    let result = ''
    while (position < source.length) {
      const char = source[position++]
      if (char === quote) return result
      if (quote === '`' && char === '$' && source[position] === '{') {
        throw new Error('Template interpolation is not data')
      }
      if (char !== '\\') {
        result += char
        continue
      }
      const escaped = source[position++]
      const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' }
      if (escaped === 'u' || escaped === 'x') {
        const length = escaped === 'u' ? 4 : 2
        const hex = source.slice(position, position + length)
        if (!new RegExp(`^[0-9a-f]{${length}}$`, 'i').test(hex)) {
          throw new Error('Invalid character escape')
        }
        result += String.fromCharCode(parseInt(hex, 16))
        position += length
      } else {
        result += escapes[escaped] ?? escaped
      }
    }
    throw new Error('Unterminated string')
  }
  const value = () => {
    skip()
    const char = source[position]
    if (['"', "'", '`'].includes(char)) return string()
    if (char === '[') {
      take('[')
      const items = []
      skip()
      while (source[position] !== ']') {
        items.push(value())
        skip()
        if (source[position] !== ',') break
        take(',')
      }
      take(']')
      return items
    }
    if (char === '{') {
      take('{')
      const object = Object.create(null)
      skip()
      while (source[position] !== '}') {
        const key = ['"', "'"].includes(source[position]) ? string() : identifier()
        skip()
        if (source[position] === ':') {
          take(':')
          object[key] = value()
        } else {
          if (!bindings.has(key)) throw new Error(`Unknown shorthand ${key}`)
          object[key] = bindings.get(key)
        }
        skip()
        if (source[position] !== ',') break
        take(',')
      }
      take('}')
      return object
    }
    if (char === '!') {
      take('!')
      const number = value()
      if (number !== 0 && number !== 1) throw new Error('Unsupported boolean expression')
      return !number
    }
    const number = source.slice(position).match(/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i)
    if (number) {
      position += number[0].length
      return Number(number[0])
    }
    const name = identifier()
    if (name === 'JSON') {
      take('.parse(')
      const text = value()
      if (typeof text !== 'string') throw new Error('JSON.parse requires literal text')
      take(')')
      return JSON.parse(text)
    }
    if (name === 'null') return null
    if (name === 'true') return true
    if (name === 'false') return false
    if (!bindings.has(name)) throw new Error(`Unsupported expression ${name}`)
    return bindings.get(name)
  }
  take('const ')
  do {
    const name = identifier()
    take('=')
    bindings.set(name, value())
    skip()
    if (source[position] !== ',') break
    take(',')
  } while (position < source.length)
  take(';')
  take('export{')
  const exports = Object.create(null)
  do {
    const local = identifier()
    skip()
    let name = local
    if (source.startsWith('as ', position)) {
      take('as ')
      name = identifier()
    }
    if (!bindings.has(local)) throw new Error(`Unknown export ${local}`)
    exports[name] = bindings.get(local)
    skip()
    if (source[position] !== ',') break
    take(',')
  } while (position < source.length)
  take('};')
  skip()
  if (position !== source.length) throw new Error('Unexpected code after data exports')
  return exports.default
}

export function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function characterLevels(stats, growth) {
  if (!stats || ![stats.Life, stats.Atk, stats.Def].some((value) => value > 0)) return []
  const scale = (base, ratio) =>
    Number.isFinite(base) && base > 0 ? Math.floor((base * ratio) / 10000) : null
  return growth.map((row) => ({
    level: row.Level,
    ascension: row.BreachLevel,
    hp: scale(stats.Life, row.LifeMaxRatio),
    atk: scale(stats.Atk, row.AtkRatio),
    def: scale(stats.Def, row.DefRatio),
  }))
}

export function weaponLevels(weapon, growth) {
  const primary = growth.filter((row) => row.CurveId === weapon.FirstCurve)
  const secondary = growth.filter((row) => row.CurveId === weapon.SecondCurve)
  if (!primary.length || !secondary.length) throw new Error('Missing weapon growth curve')
  // One-/two-star weapons cap at level 60; all others at level 90.
  const maxLevel = weapon.QualityId <= 2 ? 60 : 90
  return primary
    .filter((row) => row.Level <= maxLevel && row.BreachLevel <= (maxLevel === 60 ? 3 : 6))
    .map((row) => {
      const sub = secondary.find(
        (other) => other.Level === row.Level && other.BreachLevel === row.BreachLevel,
      )
      if (!sub) throw new Error(`Missing secondary curve for level ${row.Level}`)
      const primaryValue = (weapon.FirstPropId.Value * row.CurveValue) / 10000
      const secondaryValue = (weapon.SecondPropId.Value * sub.CurveValue) / 10000
      return {
        level: row.Level,
        ascension: row.BreachLevel,
        atk: Math.floor(primaryValue),
        sub_value: weapon.SecondPropId.IsRatio
          ? Math.round(secondaryValue * 1000) / 10
          : weapon.SecondPropId.IsPercent
            ? Math.round(secondaryValue / 10) / 10
            : Math.floor(secondaryValue),
      }
    })
}

export function echoMainStatPresets(properties, growth) {
  const idsByCost = {
    1: [2017, 2018, 2019, 50002],
    3: [2013, 2014, 2015, 5007, 5008, 5009, 5010, 5011, 5012, 5016, 50001],
    4: [2003, 2004, 2005, 5001, 5002, 5006, 50001],
  }
  const presets = []
  for (const [costText, ids] of Object.entries(idsByCost)) {
    const cost = Number(costText)
    for (const rarity of [2, 3, 4, 5]) {
      for (let level = 0; level <= rarity * 5; level += 1) {
        presets.push({
          cost,
          rarity,
          level,
          stats: ids.map((id) => {
            const prop = properties.find((row) => row.Id === id)
            if (!prop) throw new Error(`Missing source main property ${id}`)
            const curve = growth.find(
              (row) => row.GrowthId === prop.GrowthId && row.Level === level,
            )
            const index = rarity - 2 + (id === 50001 && cost === 4 ? 4 : 0)
            const initial = prop.Values[index]
            if (!curve || !Number.isFinite(initial)) throw new Error('Missing echo growth data')
            const unit = prop.AddType === 2 || prop.Prop.IsPercent ? 'percent' : 'flat'
            const scaled = initial * curve.Value
            return {
              stat: prop.Prop.Name.replace('Crit.', 'Crit') + (prop.AddType === 2 ? '%' : ''),
              value:
                unit === 'percent' ? Math.floor(scaled / 100000) / 10 : Math.floor(scaled / 10000),
              unit,
              fixed: id === 50001 || id === 50002,
            }
          }),
        })
      }
    }
  }
  return presets
}

export function sqlText(value) {
  if (value == null) return 'null'
  const text = String(value)
  let delimiter = '$builder$'
  while (text.includes(delimiter)) delimiter = delimiter.replace('$builder', '$builder_')
  return `${delimiter}${text}${delimiter}`
}

export const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`
