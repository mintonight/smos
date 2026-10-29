;(() => {
  'use strict'
  if (window.__SMOS_EXT__) {
    return
  }

  const RELOAD_PREFIXES = ['smos.enabled.', 'searchOnlyHome.', 'douyinstudy.']
  let cache = Object.create(null)
  let storage = null
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      storage = chrome.storage.local
    }
  } catch {
    storage = null
  }

  const ready = (async () => {
    if (!storage) {
      return
    }
    try {
      const stored = await storage.get(null)
      if (stored && typeof stored === 'object') {
        cache = Object.assign(Object.create(null), stored)
      }
    } catch (error) {
      console.warn('[SMOS] Failed to read extension settings', error)
    }
  })()

  const shouldReload = key => RELOAD_PREFIXES.some(prefix => key.startsWith(prefix))
  let reloadTimer = 0
  const scheduleReload = () => {
    clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => location.reload(), 150)
  }

  const api = {
    ready,
    get(key, fallback) {
      return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : fallback
    },
    set(key, value) {
      cache[key] = value
      if (storage) {
        storage.set({ [key]: value }).catch(error => {
          console.warn('[SMOS] Failed to save extension setting', error)
        })
      }
      return value
    },
    addStyle(css) {
      const style = document.createElement('style')
      style.textContent = css
      style.dataset.smosStyle = '1'
      const parent = document.head || document.documentElement
      if (parent) {
        parent.appendChild(style)
      } else {
        const observer = new MutationObserver(() => {
          const nextParent = document.head || document.documentElement
          if (!nextParent) {
            return
          }
          nextParent.appendChild(style)
          observer.disconnect()
        })
        observer.observe(document, { childList: true, subtree: true })
      }
      return style
    },
  }

  window.__SMOS_EXT__ = api
  window.GM_getValue = (key, fallback) => api.get(key, fallback)
  window.GM_setValue = (key, value) => api.set(key, value)
  window.GM_addStyle = css => api.addStyle(css)
  window.GM_registerMenuCommand = () => {}

  if (storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') {
        return
      }
      let reload = false
      for (const [key, change] of Object.entries(changes)) {
        cache[key] = change.newValue
        if (shouldReload(key)) {
          reload = true
        }
      }
      if (reload) {
        scheduleReload()
      }
    })
  }
})()
