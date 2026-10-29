// ==UserScript==
// @name         SMOS · Xiaohongshu
// @namespace    https://github.com/mintonight/smos
// @version      1.1.3
// @description  SMOS Xiaohongshu：小红书首页和发现页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @match        *://www.xiaohongshu.com/*
// @icon         https://www.xiaohongshu.com/favicon.ico
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

;(() => {
  'use strict'

  const PLATFORM_KEY = 'smos.enabled.xiaohongshu'
  const PLATFORM_TAG = 'xiaohongshu'
  const isPlatformEnabled = () => {
    try {
      return typeof GM_getValue === 'function' ? GM_getValue(PLATFORM_KEY, true) !== false : true
    } catch {
      return true
    }
  }
  const setPlatformEnabled = enabled => {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(PLATFORM_KEY, enabled)
      }
    } catch {
      // ignore
    }
  }
  const togglePlatform = () => {
    const next = !isPlatformEnabled()
    if (!next && !window.confirm('关闭 SMOS · 小红书 后，搜索界面会消失。确定关闭吗？')) {
      return
    }
    setPlatformEnabled(next)
    setTimeout(() => location.reload(), 50)
  }
  const registerPlatformToggle = () => {
    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand(
          isPlatformEnabled() ? 'SMOS · 小红书：已开启（点击关闭）' : 'SMOS · 小红书：已关闭（点击开启）',
          togglePlatform,
        )
      }
    } catch {
      // ignore
    }
  }

  const schedulePlatformToggle = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', registerPlatformToggle, { once: true })
    } else {
      registerPlatformToggle()
    }
  }

  schedulePlatformToggle()

  if (!isPlatformEnabled()) {
    return
  }

  const isTargetPage = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/'
    return (
      location.hostname === 'www.xiaohongshu.com' && (path === '/' || path === '/explore')
    )
  }

  let styleEl = null

  const addStyle = css => {
    const create = parent => {
      styleEl = document.createElement('style')
      styleEl.textContent = css
      styleEl.disabled = !isTargetPage()
      parent.appendChild(styleEl)
    }
    const parent = document.head || document.documentElement
    if (parent) {
      create(parent)
      return
    }
    const observer = new MutationObserver(() => {
      const nextParent = document.head || document.documentElement
      if (!nextParent) {
        return
      }
      create(nextParent)
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  }

  addStyle(`
html,
body {
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  background: #fff !important;
}

#exploreFeeds,
#feeds-replace-loading {
  display: none !important;
}

#smos-root {
  position: fixed;
  inset: var(--smos-top, 178px) 0 0 var(--smos-left, 164px);
  z-index: 5;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 24px;
  background: #fff;
}

#smos-form {
  display: flex;
  width: min(680px, 92vw);
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

#smos-form:focus-within {
  border-color: #ff2442;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(255, 36, 66, 0.12);
}

#smos-input {
  flex: 1;
  min-width: 0;
  padding: 13px 15px;
  border: 0;
  outline: 0;
  color: #222;
  background: transparent;
  font: 16px/1.4 system-ui, sans-serif;
}

#smos-submit {
  padding: 0 25px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: #ff2442;
  font-size: 15px;
  cursor: pointer;
}

#smos-submit:hover {
  background: #e31e39;
}

@media (max-width: 600px) {
  #smos-root {
    left: 0;
  }
}
`)

  const updateFrame = () => {
    const searchArea = document.querySelector('.search-area')
    const sideBar = document.querySelector('.side-bar')
    const searchRect = searchArea?.getBoundingClientRect()
    const sideRect = sideBar?.getBoundingClientRect()
    const top = searchRect && searchRect.height > 0 ? Math.ceil(searchRect.bottom) : 178
    const left = sideRect && sideRect.width > 0 ? Math.ceil(sideRect.right) : 0
    document.documentElement.style.setProperty('--smos-top', `${Math.max(0, top)}px`)
    document.documentElement.style.setProperty('--smos-left', `${Math.max(0, left)}px`)
  }

  let resizeBound = false

  const mount = () => {
    if (!document.body || document.getElementById('smos-root')) {
      return Boolean(document.body)
    }
    if (!resizeBound) {
      resizeBound = true
      window.addEventListener('resize', updateFrame)
    }
    updateFrame()

    const root = document.createElement('main')
    root.id = 'smos-root'
    window.__smosMountedPlatform = PLATFORM_TAG
    root.innerHTML = `
      <form id="smos-form" role="search">
        <input id="smos-input" type="search" required autocomplete="off" aria-label="搜索小红书" placeholder="搜索小红书">
        <button id="smos-submit" type="submit">搜索</button>
      </form>
    `

    const form = root.querySelector('form')
    const input = root.querySelector('input')
    form.addEventListener('submit', event => {
      event.preventDefault()
      location.href = `https://www.xiaohongshu.com/search_result/?keyword=${encodeURIComponent(input.value.trim())}`
    })

    document.body.appendChild(root)
    input.focus({ preventScroll: true })
  }

  const deactivate = () => {
    if (window.__smosMountedPlatform === PLATFORM_TAG) {
      document.getElementById('smos-root')?.remove()
      window.__smosMountedPlatform = null
    }
    if (styleEl) {
      styleEl.disabled = true
    }
  }

  const sync = () => {
    if (isTargetPage()) {
      if (styleEl) {
        styleEl.disabled = false
      }
      mount()
    } else {
      deactivate()
    }
  }

  const start = () => {
    sync()
    if (document.documentElement) {
      new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true })
    }
    const wrapHistory = method => {
      const original = history[method]
      history[method] = function (...args) {
        const result = original.apply(this, args)
        sync()
        return result
      }
    }
    wrapHistory('pushState')
    wrapHistory('replaceState')
    window.addEventListener('popstate', sync)
    setInterval(sync, 1200)
  }

  if (document.body) {
    start()
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  }
})()
