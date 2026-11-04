// SQL literal helpers shared by the Silver Palace seed builders.

// Dollar quoting avoids apostrophe escaping, which some SQL editors mishandle when pasted.
export const text = (value) => {
  if (value == null || value === '') return 'null'
  const string = String(value)
  if (string.includes('$q$')) throw new Error(`Text contains the quote delimiter: ${string}`)
  return `$q$${string}$q$`
}
export const number = (value) =>
  value == null || Number.isNaN(value) ? 'null' : String(Number(value))
export const json = (value) => `${text(JSON.stringify(value ?? []))}::jsonb`
