#!/usr/bin/env node
/**
 * 版本一致性检查
 *
 * 规则（保留现有“各脚本独立版本号”的做法，不强行统一）：
 * 1. 所有 @version 与 manifest.version 都必须是 x.y.z；
 * 2. 合并脚本 smos.user.js 的版本 >= 任一平台脚本的版本（它包含所有平台代码）；
 * 3. manifest.version 不能低于最新的 v* tag；
 * 4. --tag vX.Y.Z：发布时 tag 必须等于 manifest.version；
 *    --require-bump：manifest.version 必须严格大于最新的 v* tag（发布前用）。
 * 第 3 条在 tag 不可用（浅克隆）时跳过。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(root, p), 'utf8')
const SEMVER = /^\d+\.\d+\.\d+$/
const cmp = (a, b) => {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}
const errors = []
const userVersion = p => (read(p).match(/^\/\/ @version\s+(\S+)$/m) || [])[1]

const platforms = ['bilibili', 'douyin', 'zhihu', 'xiaohongshu'].map(k => `smos-${k}/smos-${k}.user.js`)
const merged = userVersion('smos.user.js')
const manifest = JSON.parse(read('extension/manifest.json')).version

for (const [name, v] of [['smos.user.js', merged], ['manifest.json', manifest], ...platforms.map(p => [p, userVersion(p)])]) {
  if (!v || !SEMVER.test(v)) errors.push(`${name}: version "${v}" is not x.y.z`)
}
for (const p of platforms) {
  const v = userVersion(p)
  if (merged && v && SEMVER.test(v) && SEMVER.test(merged) && cmp(merged, v) < 0) {
    errors.push(`smos.user.js @version ${merged} is lower than ${p} @version ${v}; bump the merged script`)
  }
}

const args = process.argv.slice(2)
const tagArg = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : null
if (tagArg && tagArg !== `v${manifest}`) {
  errors.push(`release tag ${tagArg} does not match manifest version v${manifest}`)
}

let latest = null
try {
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { cwd: root, encoding: 'utf8' })
    .split('\n').map(t => t.trim().slice(1)).filter(t => SEMVER.test(t))
  if (tagArg) tags.splice(tags.indexOf(tagArg.slice(1)) >>> 0, 1) // ignore the tag being released
  latest = tags.sort(cmp).pop() || null
} catch {
  latest = null
}
if (latest && SEMVER.test(manifest)) {
  if (cmp(manifest, latest) < 0) errors.push(`manifest version ${manifest} is lower than latest tag v${latest}`)
  if (args.includes('--require-bump') && cmp(manifest, latest) <= 0) {
    errors.push(`manifest version ${manifest} was not bumped past latest tag v${latest}`)
  }
}

if (errors.length) {
  console.error('Version check failed:')
  for (const e of errors) console.error(`- ${e}`)
  process.exitCode = 1
} else {
  console.log(`Version check passed: manifest ${manifest}, smos.user.js ${merged}${latest ? `, latest tag v${latest}` : ''}.`)
}
