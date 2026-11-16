import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadPure } from './helpers/userscript.mjs'

const resolveSearchTarget = loadPure('bilibili', 'resolveSearchTarget')
const search = keyword => `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`

test('real BV ids open the video, normalising the prefix', () => {
  assert.equal(resolveSearchTarget('BV1xx411c7mD'), 'https://www.bilibili.com/video/BV1xx411c7mD/')
  assert.equal(resolveSearchTarget('  bv1GJ411x7h7 '), 'https://www.bilibili.com/video/BV1GJ411x7h7/')
})

test('explicit av ids open the video', () => {
  assert.equal(resolveSearchTarget('av170001'), 'https://www.bilibili.com/video/av170001/')
  assert.equal(resolveSearchTarget('AV2'), 'https://www.bilibili.com/video/av2/')
})

test('words that merely start with BV are searched', () => {
  for (const keyword of ['BVLGARI', 'bvb', 'BV', 'BV1xx411c7mDextra', 'BV0xx411c7mD', 'BV1xx411c7mI']) {
    assert.equal(resolveSearchTarget(keyword), search(keyword), keyword)
  }
})

test('plain numbers are searched, not treated as av ids', () => {
  for (const keyword of ['1984', '2024', '12306', '170001']) {
    assert.equal(resolveSearchTarget(keyword), search(keyword), keyword)
  }
})

test('bilibili video links pass through and empty input opens search home', () => {
  assert.equal(resolveSearchTarget('https://www.bilibili.com/video/BV1xx411c7mD'), 'https://www.bilibili.com/video/BV1xx411c7mD')
  assert.equal(resolveSearchTarget('   '), 'https://search.bilibili.com/')
})

test('property: anything that is not a BV/av id or video link goes to search', () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 原神宝格丽'
  let seed = 42
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
  for (let n = 0; n < 2000; n += 1) {
    const length = 1 + Math.floor(random() * 14)
    let keyword = ''
    for (let i = 0; i < length; i += 1) keyword += alphabet[Math.floor(random() * alphabet.length)]
    const q = keyword.trim()
    if (!q || /^[Bb][Vv]1[1-9A-HJ-NP-Za-km-z]{9}$/.test(q) || /^av\d+$/i.test(q)) continue
    assert.equal(resolveSearchTarget(keyword), search(q), JSON.stringify(keyword))
  }
})
