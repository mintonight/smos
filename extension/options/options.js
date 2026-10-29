const PLATFORM_KEYS = [
  'smos.enabled.bilibili',
  'smos.enabled.douyin',
  'smos.enabled.zhihu',
  'smos.enabled.xiaohongshu',
]

const BILI_DEFAULTS = {
  'searchOnlyHome.playerMode': 'wide',
  'searchOnlyHome.hideRelated': true,
  'searchOnlyHome.applyOnPlay': false,
}

const DEFAULTS = {
  ...Object.fromEntries(PLATFORM_KEYS.map(key => [key, true])),
  ...BILI_DEFAULTS,
}

const statusEl = document.getElementById('status')
let statusTimer = 0

function setStatus(text) {
  statusEl.textContent = text
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusEl.textContent = ''
  }, 2600)
}

async function init() {
  const version = chrome.runtime.getManifest().version
  document.getElementById('version').textContent = `v${version}`
  document.getElementById('about-version').textContent = version

  const stored = await chrome.storage.local.get(DEFAULTS)
  for (const input of document.querySelectorAll('input[data-key]')) {
    input.checked = stored[input.dataset.key] !== false
  }
  document.getElementById('player-mode').value = stored['searchOnlyHome.playerMode'] || 'wide'
  document.getElementById('hide-related').checked = stored['searchOnlyHome.hideRelated'] !== false
  document.getElementById('apply-on-play').checked = Boolean(stored['searchOnlyHome.applyOnPlay'])
}

async function save(key, value, message) {
  try {
    await chrome.storage.local.set({ [key]: value })
    setStatus(message)
  } catch (error) {
    console.error('[SMOS] Failed to save setting', error)
    setStatus('保存失败，请重试')
  }
}

for (const input of document.querySelectorAll('input[data-key]')) {
  input.addEventListener('change', () => {
    save(input.dataset.key, input.checked, input.checked ? '已开启，页面会自动刷新' : '已关闭，页面会自动刷新')
  })
}

document.getElementById('player-mode').addEventListener('change', event => {
  save('searchOnlyHome.playerMode', event.target.value, '播放器模式已保存')
})

document.getElementById('hide-related').addEventListener('change', event => {
  save('searchOnlyHome.hideRelated', event.target.checked, '已保存')
})

document.getElementById('apply-on-play').addEventListener('change', event => {
  save('searchOnlyHome.applyOnPlay', event.target.checked, '已保存')
})

document.getElementById('reset').addEventListener('click', async () => {
  if (!window.confirm('恢复默认设置？平台开关和 Bilibili 播放器设置都会重置。')) {
    return
  }
  const stored = await chrome.storage.local.get(null)
  const keys = Object.keys(stored).filter(key =>
    key.startsWith('smos.') || key.startsWith('searchOnlyHome.') || key.startsWith('douyinstudy.'),
  )
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys)
  }
  await init()
  setStatus('已恢复默认设置')
})

init().catch(error => {
  console.error('[SMOS] Failed to initialize options', error)
  setStatus('读取设置失败')
})
