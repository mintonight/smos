#!/usr/bin/env node
// Regenerates the platform sections of smos.user.js from the standalone userscripts.
// Usage: node tools/sync-userscripts.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const UNIFIED = 'smos.user.js'
const META_END = '// ==/UserScript=='

export const SECTIONS = [
  { marker: '/* SMOS Bilibili */', file: 'smos-bilibili/smos-bilibili.user.js' },
  { marker: '/* SMOS Douyin */', file: 'smos-douyin/smos-douyin.user.js' },
  { marker: '/* SMOS Zhihu */', file: 'smos-zhihu/smos-zhihu.user.js' },
  { marker: '/* SMOS Xiaohongshu */', file: 'smos-xiaohongshu/smos-xiaohongshu.user.js' },
]

const read = path => readFileSync(join(root, path), 'utf8').replace(/\r/g, '')

const bodyOf = (file, text) => {
  const index = text.indexOf(META_END)
  if (index < 0) {
    throw new Error(`${file}: missing ${META_END}`)
  }
  return text.slice(index + META_END.length).trim()
}

export const renderUnified = () => {
  const current = read(UNIFIED)
  const headerEnd = current.indexOf(META_END)
  if (headerEnd < 0) {
    throw new Error(`${UNIFIED}: missing ${META_END}`)
  }
  const header = current.slice(0, headerEnd + META_END.length)
  const sections = SECTIONS.map(({ marker, file }) => `${marker}\n${bodyOf(file, read(file))}\n`)
  return { current, next: `${header}\n${sections.join('\n')}` }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { current, next } = renderUnified()
  if (process.argv.includes('--check')) {
    if (current !== next) {
      console.error(`${UNIFIED} is out of date; run node tools/sync-userscripts.mjs`)
      process.exit(1)
    }
    console.log(`${UNIFIED} is in sync with the standalone userscripts.`)
  } else {
    writeFileSync(join(root, UNIFIED), next)
    console.log(`Synced ${SECTIONS.length} sections into ${UNIFIED}.`)
  }
}
