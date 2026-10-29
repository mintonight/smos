#!/usr/bin/env node
/**
 * SMOS 静态自检脚本
 *
 * 用法：node tools/verify-userscripts.mjs
 *
 * 检查内容：
 * 1. 每个脚本的 UserScript 元数据是否完整；
 * 2. 去掉元数据后的脚本主体是否语法合法；
 * 3. smos.user.js 中四个平台的代码段是否与各自独立脚本完全一致（避免双份维护漂移）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => readFileSync(join(root, path), 'utf8')
const normalize = text => text.replace(/\r/g, '').trim()

const platforms = [
  {
    key: 'bilibili',
    file: 'smos-bilibili/smos-bilibili.user.js',
    marker: '/* SMOS Bilibili */',
    nextMarker: '/* SMOS Douyin */',
    requiredMatches: ['*://www.bilibili.com/'],
  },
  {
    key: 'douyin',
    file: 'smos-douyin/smos-douyin.user.js',
    marker: '/* SMOS Douyin */',
    nextMarker: '/* SMOS Zhihu */',
    requiredMatches: ['*://www.douyin.com/*'],
  },
  {
    key: 'zhihu',
    file: 'smos-zhihu/smos-zhihu.user.js',
    marker: '/* SMOS Zhihu */',
    nextMarker: '/* SMOS Xiaohongshu */',
    requiredMatches: ['*://www.zhihu.com/*'],
  },
  {
    key: 'xiaohongshu',
    file: 'smos-xiaohongshu/smos-xiaohongshu.user.js',
    marker: '/* SMOS Xiaohongshu */',
    nextMarker: null,
    requiredMatches: ['*://www.xiaohongshu.com/*'],
  },
]

let failures = 0

const fail = message => {
  failures += 1
  console.error('  FAIL ' + message)
}

const pass = message => console.log('  ok   ' + message)

const metadataValue = (text, key) => {
  const match = text.match(new RegExp('^// @' + key + '\\s+(.+)$', 'm'))
  return match ? match[1].trim() : null
}

const extractBody = text => {
  const marker = '// ==/UserScript=='
  const index = text.indexOf(marker)
  return index < 0 ? null : text.slice(index + marker.length)
}

const unified = read('smos.user.js')
const unifiedBody = extractBody(unified)

console.log('smos.user.js')
if (!unifiedBody) {
  fail('缺少 UserScript 元数据结束标记')
} else {
  try {
    new vm.Script(unifiedBody, { filename: 'smos.user.js' })
    pass('脚本主体语法合法')
  } catch (error) {
    fail('脚本主体语法错误: ' + error.message)
  }
}

for (const platform of platforms) {
  console.log('\n' + platform.file)
  let text
  try {
    text = read(platform.file)
  } catch {
    fail('文件不存在')
    continue
  }

  const name = metadataValue(text, 'name')
  const version = metadataValue(text, 'version')
  const runAt = metadataValue(text, 'run-at')
  const matches = [...text.matchAll(/^\/\/ @match\s+(.+)$/gm)].map(match => match[1].trim())

  if (!name) fail('缺少 @name')
  else pass('@name = ' + name)
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) fail('@version 格式不正确: ' + version)
  else pass('@version = ' + version)
  if (runAt !== 'document-start') fail('@run-at 应为 document-start，实际为 ' + runAt)
  for (const expected of platform.requiredMatches) {
    if (!matches.includes(expected)) fail('缺少 @match ' + expected)
  }

  const body = extractBody(text)
  if (!body) {
    fail('缺少 UserScript 元数据结束标记')
    continue
  }
  try {
    new vm.Script(body, { filename: platform.file })
    pass('脚本主体语法合法')
  } catch (error) {
    fail('脚本主体语法错误: ' + error.message)
  }

  const start = unified.indexOf(platform.marker)
  const end = platform.nextMarker ? unified.indexOf(platform.nextMarker) : unified.length
  if (start < 0 || end < 0 || end <= start) {
    fail('smos.user.js 中找不到对应平台代码段')
    continue
  }
  const section = normalize(unified.slice(start + platform.marker.length, end))
  if (section === normalize(body)) {
    pass('与 smos.user.js 中对应代码段一致')
  } else {
    fail('与 smos.user.js 中对应代码段不一致（请同步两份代码）')
  }
}

console.log('')
if (failures > 0) {
  console.error('检查失败：' + failures + ' 项')
  process.exitCode = 1
} else {
  console.log('全部检查通过')
}
