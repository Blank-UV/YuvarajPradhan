// Touch browsers keep :hover stuck on whatever was last tapped. This wraps every rule that
// uses :hover in @media (hover: hover) so those styles only apply where hovering is real.
// Focus styles are untouched. Plain CSS only (no nested rules), which is all this site uses.

function findBlockEnd(css, openIndex) {
  let depth = 0
  for (let i = openIndex; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i
  }
  throw new Error('Unbalanced braces in CSS')
}

function splitSelectors(selectorText) {
  const parts = []
  let depth = 0
  let current = ''
  for (const character of selectorText) {
    if (character === '(' || character === '[') depth++
    if (character === ')' || character === ']') depth--
    if (character === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += character
    }
  }
  parts.push(current)
  return parts.map((part) => part.trim()).filter(Boolean)
}

function transformBlock(css, insideHoverMedia) {
  let output = ''
  let index = 0
  while (index < css.length) {
    const open = css.indexOf('{', index)
    if (open === -1) {
      output += css.slice(index)
      break
    }
    const header = css.slice(index, open)
    const close = findBlockEnd(css, open)
    const body = css.slice(open + 1, close)
    const prelude = header.replace(/\/\*[\s\S]*?\*\//g, '').trim()
    const leading = header.slice(0, header.length - header.trimStart().length)

    if (prelude.startsWith('@')) {
      const name = prelude.match(/^@([\w-]+)/)[1]
      if (name === 'media' || name === 'supports' || name === 'layer') {
        const inHover = insideHoverMedia || /hover\s*:\s*hover/.test(prelude)
        output += `${header}{${transformBlock(body, inHover)}}`
      } else {
        output += `${header}{${body}}`
      }
    } else if (insideHoverMedia || !prelude.includes(':hover')) {
      output += `${header}{${body}}`
    } else {
      const selectors = splitSelectors(prelude)
      const hovering = selectors.filter((selector) => selector.includes(':hover'))
      const rest = selectors.filter((selector) => !selector.includes(':hover'))
      if (rest.length > 0) output += `${leading}${rest.join(',\n')}{${body}}`
      output += `${leading}@media (hover: hover){${hovering.join(',\n')}{${body}}}`
    }
    index = close + 1
  }
  return output
}

export function hoverOnly(css) {
  return transformBlock(css, false)
}

export function hoverOnlyPlugin() {
  return {
    name: 'hover-only-css',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.css($|\?)/.test(id) || id.includes('node_modules')) return null
      return { code: hoverOnly(code), map: null }
    },
  }
}
