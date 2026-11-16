import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadWithLocation, metadataList, read, userscriptPath } from './helpers/userscript.mjs'

const ROUTES = {
  zhihu: {
    fn: 'isTargetPage',
    yes: ['https://www.zhihu.com/', 'https://www.zhihu.com/explore', 'https://www.zhihu.com/hot', 'https://www.zhihu.com/hot/'],
    no: ['https://www.zhihu.com/search?q=x', 'https://www.zhihu.com/question/1', 'https://www.zhihu.com/follow', 'https://zhuanlan.zhihu.com/'],
  },
  xiaohongshu: {
    fn: 'isTargetPage',
    yes: ['https://www.xiaohongshu.com/', 'https://www.xiaohongshu.com/explore'],
    no: ['https://www.xiaohongshu.com/search_result/?keyword=x', 'https://www.xiaohongshu.com/explore/abc', 'https://www.xiaohongshu.com/user/profile/1'],
  },
  douyin: {
    fn: 'isTargetPage',
    yes: ['https://www.douyin.com/jingxuan', 'https://www.douyin.com/jingxuan/food', 'https://www.douyin.com/?recommend=1'],
    no: ['https://www.douyin.com/', 'https://www.douyin.com/search/x', 'https://www.douyin.com/user/self', 'https://www.douyin.com/video/1'],
  },
}

const BILIBILI = {
  isHomePage: {
    yes: ['https://www.bilibili.com/', 'https://www.bilibili.com/index.html'],
    no: ['https://www.bilibili.com/video/BV1xx411c7mD/', 'https://search.bilibili.com/all?keyword=x'],
  },
  isVideoPage: {
    yes: [
      'https://www.bilibili.com/video/BV1xx411c7mD/',
      'https://www.bilibili.com/bangumi/play/ep1',
      'https://www.bilibili.com/list/watchlater',
      'https://www.bilibili.com/medialist/play/1',
      'https://www.bilibili.com/cheese/play/ep1',
      'https://www.bilibili.com/festival/2024',
    ],
    no: ['https://www.bilibili.com/', 'https://space.bilibili.com/1', 'https://www.bilibili.com/anime/'],
  },
}

for (const [platform, { fn, yes, no }] of Object.entries(ROUTES)) {
  test(`${platform} ${fn}`, () => {
    const check = loadWithLocation(platform, fn)
    for (const url of yes) assert.equal(check(url), true, url)
    for (const url of no) assert.equal(check(url), false, url)
  })
}

for (const [fn, { yes, no }] of Object.entries(BILIBILI)) {
  test(`bilibili ${fn}`, () => {
    const check = loadWithLocation('bilibili', fn)
    for (const url of yes) assert.equal(check(url), true, url)
    for (const url of no) assert.equal(check(url), false, url)
  })
}

const CONTENT = { bilibili: 'content/10-bilibili.js', douyin: 'content/20-douyin.js', zhihu: 'content/30-zhihu.js', xiaohongshu: 'content/40-xiaohongshu.js' }
const manifest = JSON.parse(read('extension/manifest.json'))
const sorted = list => [...list].sort()

test('each userscript @match equals its extension content_scripts matches', () => {
  for (const [platform, file] of Object.entries(CONTENT)) {
    const entry = manifest.content_scripts.find(script => script.js.includes(file))
    assert.ok(entry, `manifest has no content script for ${file}`)
    assert.deepEqual(sorted(entry.matches), sorted(metadataList(read(userscriptPath(platform)), 'match')), platform)
  }
})

test('smos.user.js and the MAIN-world route hook cover exactly the union of platform matches', () => {
  const union = sorted(Object.keys(CONTENT).flatMap(platform => metadataList(read(userscriptPath(platform)), 'match')))
  assert.deepEqual(sorted(metadataList(read('smos.user.js'), 'match')), union)
  const hook = manifest.content_scripts.find(script => script.world === 'MAIN')
  assert.deepEqual(sorted(hook.matches), union)
})
