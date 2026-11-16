import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const read = path => readFileSync(join(root, path), 'utf8')

export const userscriptPath = platform => `smos-${platform}/smos-${platform}.user.js`

// Pulls `const <name> = (...) => { ... }` out of a userscript IIFE so it can be tested in isolation.
export const extractArrow = (source, name) => {
  const start = source.indexOf(`const ${name} = `)
  if (start < 0) {
    throw new Error(`const ${name} not found`)
  }
  const open = source.indexOf('{', source.indexOf('=>', start))
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') depth -= 1
    if (depth === 0) {
      return source.slice(start + `const ${name} = `.length, i + 1)
    }
  }
  throw new Error(`unbalanced braces in ${name}`)
}

// Evaluates an extracted arrow function with `location` bound to the given URL.
export const loadWithLocation = (platform, name) => {
  const code = extractArrow(read(userscriptPath(platform)), name)
  const factory = new Function('location', `return (${code})`)
  return url => factory(new URL(url))()
}

export const loadPure = (platform, name) =>
  new Function(`return (${extractArrow(read(userscriptPath(platform)), name)})`)()

export const metadataList = (source, key) =>
  [...source.matchAll(new RegExp(`^// @${key}\\s+(.+)$`, 'gm'))].map(match => match[1].trim())
