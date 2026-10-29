#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionDir = path.join(root, 'extension')
const errors = []

async function exists(relativePath) {
  try {
    await access(path.join(extensionDir, relativePath), constants.R_OK)
    return true
  } catch {
    return false
  }
}

function check(condition, message) {
  if (!condition) {
    errors.push(message)
  }
}

function checkSyntax(relativePath) {
  return readFile(path.join(extensionDir, relativePath), 'utf8').then(code => {
    try {
      new vm.Script(code, { filename: relativePath })
    } catch (error) {
      errors.push(`Syntax error in ${relativePath}: ${error.message}`)
    }
  })
}

const buildScript = path.join(root, 'tools', 'build-extension.mjs')
try {
  execFileSync(process.execPath, [buildScript, '--check'], { stdio: 'pipe' })
} catch (error) {
  errors.push('Generated content scripts are out of date; run node tools/build-extension.mjs')
}

const manifest = JSON.parse(await readFile(path.join(extensionDir, 'manifest.json'), 'utf8'))
check(manifest.manifest_version === 3, 'manifest_version must be 3')
check(Array.isArray(manifest.permissions) && manifest.permissions.includes('storage'), 'manifest must request storage permission')
check(manifest.action && manifest.action.default_popup, 'manifest action.default_popup is missing')
check(manifest.options_ui && manifest.options_ui.page, 'manifest options_ui.page is missing')

const requiredFiles = new Set(['manifest.json', 'content/00-core.js'])
for (const [size, icon] of Object.entries(manifest.icons || {})) {
  requiredFiles.add(icon)
}
for (const script of manifest.content_scripts || []) {
  for (const file of script.js || []) {
    requiredFiles.add(file)
  }
}
for (const file of requiredFiles) {
  check(await exists(file), `Missing extension file: ${file}`)
}

for (const script of manifest.content_scripts || []) {
  check(script.run_at === 'document_start', `Content script should run at document_start: ${script.js?.join(', ')}`)
  if (script.world === 'MAIN') {
    check(script.js?.length === 1 && script.js[0] === 'content/05-route-hook.js', `MAIN-world entry should only load content/05-route-hook.js: ${script.js?.join(', ')}`)
  } else {
    check(script.js?.[0] === 'content/00-core.js', `Content script must load 00-core.js first: ${script.js?.join(', ')}`)
  }
  for (const file of script.js || []) {
    if (await exists(file)) {
      await checkSyntax(file)
    }
  }
}

for (const file of ['popup/popup.js', 'options/options.js']) {
  check(await exists(file), `Missing extension file: ${file}`)
  if (await exists(file)) {
    await checkSyntax(file)
  }
}

for (const page of ['popup/popup.html', 'options/options.html']) {
  const html = await readFile(path.join(extensionDir, page), 'utf8')
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const target = match[1]
    if (!target.startsWith('http') && !target.startsWith('#')) {
      const relative = path.posix.join(path.posix.dirname(page), target)
      check(await exists(relative), `${page} references missing file: ${target}`)
    }
  }
}

{
  const isolatedMatches = new Set((manifest.content_scripts || []).filter(s => s.world !== 'MAIN').flatMap(s => s.matches || []))
  const hook = (manifest.content_scripts || []).find(s => s.world === 'MAIN')
  check(Boolean(hook), 'manifest is missing the MAIN-world route hook (content/05-route-hook.js)')
  if (hook) {
    for (const match of isolatedMatches) {
      check(hook.matches.includes(match), `route hook does not cover ${match}`)
    }
  }
}

const core = await readFile(path.join(extensionDir, 'content/00-core.js'), 'utf8')
for (const symbol of ['GM_getValue', 'GM_setValue', 'GM_addStyle', 'GM_registerMenuCommand', '__SMOS_EXT__']) {
  check(core.includes(symbol), `00-core.js does not provide ${symbol}`)
}

const popup = await readFile(path.join(extensionDir, 'popup/popup.html'), 'utf8')
for (const key of ['bilibili', 'douyin', 'zhihu', 'xiaohongshu']) {
  check(popup.includes(`smos.enabled.${key}`), `Popup is missing toggle for ${key}`)
}

if (errors.length > 0) {
  console.error('Extension verification failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
} else {
  console.log(`Extension verification passed: ${manifest.content_scripts.length} content scripts, ${Object.keys(manifest.icons || {}).length} icons.`)
}
