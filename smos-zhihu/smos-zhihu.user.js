// ==UserScript==
// @name         SMOS · Zhihu
// @namespace    https://github.com/mintonight/smos
// @version      1.2.1
// @description  SMOS Zhihu：知乎首页和发现页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-zhihu/smos-zhihu.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-zhihu/smos-zhihu.user.js
// @match        *://www.zhihu.com/*
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

  const PLATFORM_KEY = 'smos.enabled.zhihu'
  const PLATFORM_TAG = 'zhihu'
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
    if (!next && !window.confirm('关闭 SMOS · 知乎 后，搜索界面会消失。确定关闭吗？')) {
      return
    }
    setPlatformEnabled(next)
    setTimeout(() => location.reload(), 50)
  }
  const registerPlatformToggle = () => {
    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand(
          isPlatformEnabled() ? 'SMOS · 知乎：已开启（点击关闭）' : 'SMOS · 知乎：已关闭（点击开启）',
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
      location.hostname === 'www.zhihu.com' &&
      (path === '/' || path === '/explore' || path === '/hot')
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
  background: #f6f6f6 !important;
}

main[role="main"] {
  visibility: hidden !important;
  pointer-events: none !important;
}

#smos-root {
  position: fixed;
  inset: 64px 0 0;
  z-index: 2;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 24px;
  background: #f6f6f6;
}

#smos-form {
  display: flex;
  width: min(680px, 92vw);
  padding: 8px;
  border: 1px solid #e1e4e8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(26, 26, 26, 0.12);
}

#smos-form:focus-within {
  border-color: #056de8;
  box-shadow: 0 12px 40px rgba(26, 26, 26, 0.12), 0 0 0 3px rgba(5, 109, 232, 0.12);
}

#smos-input {
  flex: 1;
  min-width: 0;
  padding: 13px 15px;
  border: 0;
  outline: 0;
  color: #18191c;
  background: transparent;
  font: 16px/1.4 system-ui, sans-serif;
}

#smos-submit {
  padding: 0 25px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: #056de8;
  font-size: 15px;
  cursor: pointer;
}

#smos-submit:hover {
  background: #005cc8;
}

@media (max-width: 600px) {
  #smos-root {
    inset: 56px 0 0;
  }
}
`)

  const mount = () => {
    if (!document.body || document.getElementById('smos-root')) {
      return Boolean(document.body)
    }

    const root = document.createElement('main')
    root.id = 'smos-root'
    window.__smosMountedPlatform = PLATFORM_TAG
    root.innerHTML = `
      <form id="smos-form" role="search">
        <input id="smos-input" type="search" required autocomplete="off" aria-label="搜索知乎" placeholder="搜索知乎">
        <button id="smos-submit" type="submit">搜索</button>
      </form>
    `

    const form = root.querySelector('form')
    const input = root.querySelector('input')
    form.addEventListener('submit', event => {
      event.preventDefault()
      location.href = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(input.value.trim())}`
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
