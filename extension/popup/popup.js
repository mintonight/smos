const PLATFORM_KEYS = [
  'smos.enabled.bilibili',
  'smos.enabled.douyin',
  'smos.enabled.zhihu',
  'smos.enabled.xiaohongshu',
]

const DEFAULTS = Object.fromEntries(PLATFORM_KEYS.map(key => [key, true]))
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
  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`
  const stored = await chrome.storage.local.get(DEFAULTS)
  for (const input of document.querySelectorAll('input[data-key]')) {
    input.checked = stored[input.dataset.key] !== false
  }
}

for (const input of document.querySelectorAll('input[data-key]')) {
  input.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ [input.dataset.key]: input.checked })
      setStatus(input.checked ? '已开启，页面会自动刷新' : '已关闭，页面会自动刷新')
    } catch (error) {
      input.checked = !input.checked
      setStatus('保存失败，请重试')
      console.error('[SMOS] Failed to save toggle', error)
    }
  })
}

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

init().catch(error => {
  console.error('[SMOS] Failed to initialize popup', error)
  setStatus('读取设置失败')
})
