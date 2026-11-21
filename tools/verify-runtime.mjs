#!/usr/bin/env node
// Runs every SMOS artifact (standalone userscript, smos.user.js, extension content scripts)
// in jsdom against the feature map below and checks what each one does on each page.
// Usage: node tools/verify-runtime.mjs [--verbose]
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, VirtualConsole } from 'jsdom'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => readFileSync(join(root, path), 'utf8')

export const PLATFORMS = {
  bilibili: { label: 'Bilibili', userscript: 'smos-bilibili/smos-bilibili.user.js', content: 'extension/content/10-bilibili.js' },
  douyin: { label: '抖音', userscript: 'smos-douyin/smos-douyin.user.js', content: 'extension/content/20-douyin.js' },
  zhihu: { label: '知乎', userscript: 'smos-zhihu/smos-zhihu.user.js', content: 'extension/content/30-zhihu.js' },
  xiaohongshu: { label: '小红书', userscript: 'smos-xiaohongshu/smos-xiaohongshu.user.js', content: 'extension/content/40-xiaohongshu.js' },
  x: { label: 'X', userscript: 'smos-x/smos-x.user.js', content: 'extension/content/50-x.js' },
  youtube: { label: 'YouTube', userscript: 'smos-youtube/smos-youtube.user.js', content: 'extension/content/60-youtube.js' },
}

// Feature map: what a user should see on each page. root = injected search UI id (null = page untouched).
export const FEATURES = [
  { platform: 'bilibili', url: 'https://www.bilibili.com/', root: 'soh-root' },
  { platform: 'bilibili', url: 'https://www.bilibili.com/video/BV1xx411c7mD/', root: null, muted: false },
  { platform: 'douyin', url: 'https://www.douyin.com/jingxuan', root: 'dys-root', muted: true },
  { platform: 'douyin', url: 'https://www.douyin.com/?recommend=1', root: 'dys-root', muted: true },
  { platform: 'douyin', url: 'https://www.douyin.com/search/test', root: null, muted: false },
  { platform: 'douyin', url: 'https://www.douyin.com/user/self', root: null, muted: false },
  { platform: 'zhihu', url: 'https://www.zhihu.com/', root: 'smos-root' },
  { platform: 'zhihu', url: 'https://www.zhihu.com/explore', root: 'smos-root' },
  { platform: 'zhihu', url: 'https://www.zhihu.com/hot', root: 'smos-root' },
  { platform: 'zhihu', url: 'https://www.zhihu.com/search?type=content&q=test', root: null, muted: false },
  { platform: 'xiaohongshu', url: 'https://www.xiaohongshu.com/', root: 'smos-root' },
  { platform: 'xiaohongshu', url: 'https://www.xiaohongshu.com/explore', root: 'smos-root' },
  { platform: 'xiaohongshu', url: 'https://www.xiaohongshu.com/search_result/?keyword=test', root: null, muted: false },
  { platform: 'x', url: 'https://x.com/home', root: 'smos-root' },
  { platform: 'x', url: 'https://x.com/', root: 'smos-root' },
  { platform: 'x', url: 'https://x.com/search?q=test&src=typed_query', root: null, muted: false },
  { platform: 'x', url: 'https://x.com/explore', root: null, muted: false },
  { platform: 'youtube', url: 'https://www.youtube.com/', root: 'smos-root' },
  { platform: 'youtube', url: 'https://www.youtube.com/results?search_query=test', root: null, muted: false },
  { platform: 'youtube', url: 'https://www.youtube.com/watch?v=abc', root: null, muted: false },
]

const ROOT_IDS = ['soh-root', 'dys-root', 'smos-root']
const PAGE_HTML = '<!doctype html><html><head></head><body><main role="main"></main><video autoplay></video></body></html>'

export async function run(url, scripts, { gm = true } = {}) {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', error => {
    if (!String(error.message).startsWith('Not implemented')) {
      throw error
    }
  })
  const dom = new JSDOM(PAGE_HTML, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole })
  const w = dom.window
  const menus = []
  const intervals = []
  if (gm) {
    const store = Object.create(null)
    w.GM_getValue = (key, fallback) => (key in store ? store[key] : fallback)
    w.GM_setValue = (key, value) => {
      store[key] = value
    }
    w.GM_registerMenuCommand = name => menus.push(name)
    w.GM_addStyle = css => {
      const style = w.document.createElement('style')
      style.textContent = css
      w.document.head.appendChild(style)
      return style
    }
    w.unsafeWindow = w
  }
  w.matchMedia = media => ({ media, matches: false, addEventListener() {}, removeEventListener() {} })
  const nativeSetInterval = w.setInterval.bind(w)
  w.setInterval = (fn, ms, ...args) => {
    intervals.push(ms)
    return nativeSetInterval(fn, ms, ...args)
  }
  for (const script of scripts) {
    w.eval(script)
  }
  if (w.__SMOS_EXT__) {
    await w.__SMOS_EXT__.ready
  }
  await new Promise(resolve => setTimeout(resolve, 50))
  const result = {
    menus,
    intervals: intervals.length,
    roots: ROOT_IDS.filter(id => w.document.getElementById(id)),
    muted: w.document.querySelector('video').muted,
  }
  // Windows are left open: jsdom crashes on close() while rAF callbacks are pending; the process exits at the end.
  return result
}

const variants = feature => {
  const platform = PLATFORMS[feature.platform]
  return {
    standalone: { scripts: [read(platform.userscript)] },
    unified: { scripts: [read('smos.user.js')] },
    extension: {
      scripts: [read('extension/content/05-route-hook.js'), read('extension/content/00-core.js'), read(platform.content)],
      gm: false,
    },
  }
}

export async function verify({ verbose = false } = {}) {
  const failures = []
  const fail = (feature, variant, message) => failures.push(`${feature.url} [${variant}] ${message}`)
  for (const feature of FEATURES) {
    const results = {}
    for (const [name, { scripts, gm = true }] of Object.entries(variants(feature))) {
      results[name] = await run(feature.url, scripts, { gm })
      const result = results[name]
      if (verbose) {
        console.log(feature.url, name, JSON.stringify(result))
      }
      const expectedRoots = feature.root ? [feature.root] : []
      if (JSON.stringify(result.roots) !== JSON.stringify(expectedRoots)) {
        fail(feature, name, `expected search UI ${JSON.stringify(expectedRoots)}, got ${JSON.stringify(result.roots)}`)
      }
      if (feature.muted !== undefined && result.muted !== feature.muted) {
        fail(feature, name, `expected page video muted=${feature.muted}, got ${result.muted}`)
      }
      const foreign = Object.entries(PLATFORMS)
        .filter(([key]) => key !== feature.platform)
        .map(([, { label }]) => label)
      for (const menu of result.menus) {
        if (foreign.some(label => menu.includes(label))) {
          fail(feature, name, `registers another platform's menu item: ${menu}`)
        }
      }
    }
    const { standalone, unified } = results
    if (JSON.stringify(unified.menus) !== JSON.stringify(standalone.menus)) {
      fail(feature, 'unified', `menus differ from the standalone script: ${JSON.stringify(unified.menus)} vs ${JSON.stringify(standalone.menus)}`)
    }
    if (unified.intervals !== standalone.intervals) {
      fail(feature, 'unified', `starts ${unified.intervals} intervals, standalone starts ${standalone.intervals}`)
    }
  }
  return failures
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const failures = await verify({ verbose: process.argv.includes('--verbose') })
  if (failures.length > 0) {
    console.error(`Runtime verification failed (${failures.length}):`)
    for (const failure of failures) {
      console.error(`  FAIL ${failure}`)
    }
    process.exit(1)
  }
  console.log(`Runtime verification passed: ${FEATURES.length} pages x 3 artifacts.`)
  process.exit(0)
}
