export function filterEchoes(echoes, { search = '', costs = [], classes = [], sonata = '' }) {
  const needle = search.trim().toLowerCase()
  return echoes.filter(
    (echo) =>
      (!needle || echo.name.toLowerCase().includes(needle)) &&
      (!costs.length || costs.includes(echo.cost)) &&
      (!classes.length || classes.includes(echo.class)) &&
      (!sonata || echo.sonata_effects.some((item) => item.name === sonata)),
  )
}
