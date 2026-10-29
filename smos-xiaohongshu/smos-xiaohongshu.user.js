// ==UserScript==
// @name         SMOS · Xiaohongshu
// @namespace    https://github.com/mintonight/smos
// @version      1.2.1
// @description  SMOS Xiaohongshu：小红书首页和发现页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @match        *://www.xiaohongshu.com/*
// @icon         https://raw.githubusercontent.com/mintonight/smos/main/extension/icons/icon48.png
// @icon64       https://raw.githubusercontent.com/mintonight/smos/main/extension/icons/icon128.png
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

;(() => {
  'use strict'

  // ---------------------------------------------------------------------------
  // 路由 / DOM 监听（SPA）
  // 扩展：content/05-route-hook.js 在 MAIN world 钩住 history 并派发 SMOS_ROUTE_EVENT。
  // 油猴：通过 unsafeWindow 钩住页面自己的 history（沙箱里的 history 包装对页面无效）。
  // ---------------------------------------------------------------------------
  const SMOS_ROUTE_EVENT = 'smos:locationchange'

  const hookPageHistory = () => {
    try {
      const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : null
      if (!pageWindow || pageWindow.__smosRouteHooked) {
        return
      }
      pageWindow.__smosRouteHooked = true
      const notify = () => pageWindow.dispatchEvent(new pageWindow.CustomEvent(SMOS_ROUTE_EVENT))
      for (const method of ['pushState', 'replaceState']) {
        const original = pageWindow.history[method]
        pageWindow.history[method] = function (...args) {
          const result = original.apply(this, args)
          notify()
          return result
        }
      }
    } catch {
      // 拿不到页面 history 时依赖 navigation / popstate / 低频轮询
    }
  }

  const watchRoute = callback => {
    let lastUrl = location.href
    const check = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        callback()
      }
    }
    hookPageHistory()
    window.addEventListener(SMOS_ROUTE_EVENT, check)
    window.addEventListener('popstate', check)
    window.addEventListener('hashchange', check)
    try {
      if (window.navigation && typeof window.navigation.addEventListener === 'function') {
        window.navigation.addEventListener('navigatesuccess', check)
      }
    } catch {
      // ignore
    }
    // 兜底：只比较 URL 字符串，开销可忽略
    setInterval(check, 3000)
  }

  const createDomWatcher = callback => {
    let observer = null
    let frame = 0
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          callback()
        })
      }
    }
    return {
      start() {
        if (!observer && document.documentElement) {
          observer = new MutationObserver(schedule)
          observer.observe(document.documentElement, { childList: true, subtree: true })
        }
      },
      stop() {
        if (observer) {
          observer.disconnect()
          observer = null
        }
        if (frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      },
    }
  }

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
:root {
  --smos-page-bg: #fafafa;
  --smos-surface: #ffffff;
  --smos-border: #e5e5e5;
  --smos-text: #222222;
  --smos-muted: #888888;
  --smos-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --smos-page-bg: #141418;
    --smos-surface: #1f1f24;
    --smos-border: #33333a;
    --smos-text: #eeeeee;
    --smos-muted: #999999;
    --smos-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }
}

[data-smos-theme="dark"] {
  --smos-page-bg: #141418;
  --smos-surface: #1f1f24;
  --smos-border: #33333a;
  --smos-text: #eeeeee;
  --smos-muted: #999999;
  --smos-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

[data-smos-theme="light"] {
  --smos-page-bg: #fafafa;
  --smos-surface: #ffffff;
  --smos-border: #e5e5e5;
  --smos-text: #222222;
  --smos-muted: #888888;
  --smos-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

html,
body {
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
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
  background: var(--smos-page-bg);
}

#smos-form {
  display: flex;
  width: min(680px, 92vw);
  padding: 8px;
  border: 1px solid var(--smos-border);
  border-radius: 14px;
  background: var(--smos-surface);
  box-shadow: var(--smos-shadow);
}

#smos-form:focus-within {
  border-color: #ff2442;
  box-shadow: var(--smos-shadow), 0 0 0 3px rgba(255, 36, 66, 0.12);
}

#smos-input {
  flex: 1;
  min-width: 0;
  padding: 13px 15px;
  border: 0;
  outline: 0;
  color: var(--smos-text);
  background: transparent;
  font: 16px/1.4 system-ui, sans-serif;
}

#smos-input::placeholder {
  color: var(--smos-muted);
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

  const applyTheme = () => {
    const root = document.documentElement
    if (!root || !document.body) {
      return
    }
    const readBackground = () => {
      for (const el of [document.body, document.documentElement]) {
        if (!el) {
          continue
        }
        const color = getComputedStyle(el).backgroundColor
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          return color
        }
      }
      return ''
    }
    const color = readBackground()
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    const dark = match
      ? 0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3]) < 128
      : matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.smosTheme = dark ? 'dark' : 'light'
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
    if (typeof applyTheme === 'function') {
      applyTheme()
    }
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
    const domWatcher = createDomWatcher(() => refresh())
    const refresh = () => {
      sync()
      if (isTargetPage()) {
        domWatcher.start()
      } else {
        domWatcher.stop()
      }
    }
    refresh()
    watchRoute(refresh)
  }

  if (document.body) {
    start()
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  }
})()
