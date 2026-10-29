// ==UserScript==
// @name         SMOS · Douyin
// @namespace    https://github.com/mintonight/smos
// @version      1.2.1
// @description  SMOS Douyin：抖音精选页和推荐页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js
// @match        *://www.douyin.com/*
// @icon         https://raw.githubusercontent.com/mintonight/smos/main/extension/icons/icon48.png
// @icon64       https://raw.githubusercontent.com/mintonight/smos/main/extension/icons/icon128.png
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_addStyle
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

  const PLATFORM_KEY = 'smos.enabled.douyin'
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
    if (!next && !window.confirm('关闭 SMOS · 抖音 后，搜索界面和自动静音会停用。确定关闭吗？')) {
      return
    }
    setPlatformEnabled(next)
    setTimeout(() => location.reload(), 50)
  }
  const registerPlatformToggle = () => {
    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand(
          isPlatformEnabled() ? 'SMOS · 抖音：已开启（点击关闭）' : 'SMOS · 抖音：已关闭（点击开启）',
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
    if (location.hostname !== 'www.douyin.com') {
      return false
    }
    const path = location.pathname.replace(/\/+$/, '') || '/'
    const isJingxuan = path === '/jingxuan' || path.startsWith('/jingxuan/')
    const isRecommendHome =
      path === '/' && new URLSearchParams(location.search).has('recommend')
    return isJingxuan || isRecommendHome
  }

  let styleEl = null

  const DEFAULTS = {
    bgColor: '',
    bgImage: '',
  }

  const getBgColor = () => (GM_getValue('douyinstudy.bgColor', DEFAULTS.bgColor) || '').trim()
  const getBgImage = () => (GM_getValue('douyinstudy.bgImage', DEFAULTS.bgImage) || '').trim()

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

  const applyBackground = () => {
    const root = document.documentElement
    if (!root) {
      const observer = new MutationObserver(() => {
        if (document.documentElement) {
          observer.disconnect()
          applyBackground()
        }
      })
      observer.observe(document, { childList: true, subtree: true })
      return
    }
    const image = getBgImage()
    const color = getBgColor()
    if (color) {
      root.style.setProperty('--dys-bg-color', color)
    } else {
      root.style.removeProperty('--dys-bg-color')
    }
    root.style.setProperty(
      '--dys-bg-image',
      image ? `url(${JSON.stringify(image)})` : 'none',
    )
  }

  const CSS = `
:root {
  --smos-page-bg: #0f0f12;
  --smos-surface: rgba(255, 255, 255, 0.96);
  --smos-border: rgba(255, 255, 255, 0.16);
  --smos-text: #161616;
  --smos-muted: #777777;
  --smos-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
  --smos-overlay: rgba(15, 15, 18, 0.18);
}

[data-smos-theme="light"] {
  --smos-page-bg: #f5f5f7;
  --smos-surface: #ffffff;
  --smos-border: rgba(0, 0, 0, 0.08);
  --smos-text: #161616;
  --smos-muted: #777777;
  --smos-shadow: 0 18px 60px rgba(0, 0, 0, 0.18);
  --smos-overlay: rgba(255, 255, 255, 0.1);
}

html, body {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
}

/* 原生顶栏是稳定的 #douyin-header；它的同级节点就是精选/推荐内容区。 */
#douyin-right-container > :not(#douyin-header) {
  display: none !important;
}

#dys-root {
  position: fixed;
  top: 56px;
  right: 0;
  bottom: 0;
  left: 160px;
  z-index: 1;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 24px 20px 40px;
  pointer-events: auto;
  background-color: var(--dys-bg-color, var(--smos-page-bg));
  background-image:
    linear-gradient(var(--smos-overlay), var(--smos-overlay)),
    var(--dys-bg-image, none);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

video,
audio {
  visibility: hidden !important;
  pointer-events: none !important;
}

#dys-form {
  display: flex;
  width: min(640px, 92vw);
  padding: 8px;
  border: 1px solid var(--smos-border);
  border-radius: 16px;
  background: var(--smos-surface);
  box-shadow: var(--smos-shadow);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

#dys-form:focus-within {
  border-color: rgba(254, 44, 85, 0.72);
  box-shadow: var(--smos-shadow), 0 0 0 3px rgba(254, 44, 85, 0.15);
}

#dys-input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--smos-text);
  font: 16px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
}

#dys-input::placeholder {
  color: var(--smos-muted);
}

#dys-submit {
  flex: 0 0 auto;
  padding: 0 24px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #fe2c55;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

#dys-submit:hover {
  background: #e9254d;
}

#dys-submit:focus-visible {
  outline: 3px solid rgba(254, 44, 85, 0.28);
  outline-offset: 2px;
}

@media (max-width: 600px) {
  #dys-root {
    left: 0;
  }

  #dys-form {
    border-radius: 14px;
  }

  #dys-submit {
    padding: 0 18px;
  }
}
`

  // 记录被 SMOS 静音的媒体，离开目标页时恢复，避免播放器图标显示有声但实际静音
  const mutedBySmos = new WeakSet()

  const stopMedia = media => {
    media.autoplay = false
    if (!media.muted) {
      mutedBySmos.add(media)
    }
    media.muted = true
    media.removeAttribute('autoplay')
    media.pause()
  }

  const blockMedia = root => {
    if (root instanceof HTMLMediaElement) {
      stopMedia(root)
    }
    root.querySelectorAll?.('video, audio').forEach(stopMedia)
  }

  // 只在目标页（精选 / 推荐首页）启用；合并脚本在其他站点、抖音视频页等都不能静音
  let mediaBlockingActive = isTargetPage()

  const muteMedia = media => {
    if (!media.muted) {
      mutedBySmos.add(media)
      media.muted = true
    }
  }

  const restoreMedia = () => {
    document.querySelectorAll('video, audio').forEach(media => {
      if (mutedBySmos.has(media)) {
        mutedBySmos.delete(media)
        media.muted = false
      }
    })
  }

  const ensureMuted = () => {
    if (!mediaBlockingActive) {
      return
    }
    document.querySelectorAll('video, audio').forEach(muteMedia)
  }

  const preventPlayback = event => {
    if (!mediaBlockingActive) {
      return
    }
    if (event.target instanceof HTMLMediaElement) {
      stopMedia(event.target)
    }
  }

  const preventSound = event => {
    if (!mediaBlockingActive) {
      return
    }
    if (event.target instanceof HTMLMediaElement) {
      muteMedia(event.target)
    }
  }

  const watchMedia = () => {
    if (mediaBlockingActive) {
      blockMedia(document)
    }
    document.addEventListener('play', preventPlayback, true)
    document.addEventListener('volumechange', preventSound, true)
    document.addEventListener('loadedmetadata', preventSound, true)
    document.addEventListener('canplay', preventSound, true)

    const observer = new MutationObserver(records => {
      if (!mediaBlockingActive) {
        return
      }
      for (const record of records) {
        if (record.type === 'attributes') {
          blockMedia(record.target)
          continue
        }
        record.addedNodes.forEach(blockMedia)
      }
    })
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['autoplay'],
    })
  }

  const mount = () => {
    if (!document.body || document.getElementById('dys-root')) {
      return Boolean(document.body)
    }

    const root = document.createElement('main')
    root.id = 'dys-root'

    const form = document.createElement('form')
    form.id = 'dys-form'
    form.setAttribute('role', 'search')

    const input = document.createElement('input')
    input.id = 'dys-input'
    input.type = 'search'
    input.required = true
    input.autocomplete = 'off'
    input.placeholder = '搜索你感兴趣的内容'
    input.setAttribute('aria-label', '搜索抖音')

    const button = document.createElement('button')
    button.id = 'dys-submit'
    button.type = 'submit'
    button.textContent = '搜索'

    form.addEventListener('submit', event => {
      event.preventDefault()
      const keyword = input.value.trim()
      if (keyword) {
        location.href = `https://www.douyin.com/search/${encodeURIComponent(keyword)}`
      }
    })

    form.append(input, button)
    root.appendChild(form)
    document.body.appendChild(root)
    setTimeout(() => input.focus({ preventScroll: true }), 200)
    return true
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
      : true
    root.dataset.smosTheme = dark ? 'dark' : 'light'
  }

  const deactivate = () => {
    if (mediaBlockingActive) {
      restoreMedia()
    }
    mediaBlockingActive = false
    document.getElementById('dys-root')?.remove()
    if (styleEl) {
      styleEl.disabled = true
    }
  }

  const sync = () => {
    applyTheme()
    if (isTargetPage()) {
      if (!mediaBlockingActive) {
        mediaBlockingActive = true
        blockMedia(document)
      }
      if (styleEl) {
        styleEl.disabled = false
      }
      mount()
      ensureMuted()
    } else {
      deactivate()
    }
  }

  const init = () => {
    addStyle(CSS)
    applyBackground()

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
  }

  const registerMenus = () => {
    if (typeof GM_registerMenuCommand !== 'function') {
      return
    }

    GM_registerMenuCommand('设置背景颜色', () => {
      const value = prompt('背景颜色（CSS 颜色值）', getBgColor())
      if (value !== null) {
        GM_setValue('douyinstudy.bgColor', value.trim() || DEFAULTS.bgColor)
        applyBackground()
      }
    })

    GM_registerMenuCommand('设置背景图片 URL（留空清除）', () => {
      const value = prompt('背景图片 URL（http/https，留空清除）', getBgImage())
      if (value === null) {
        return
      }
      const next = value.trim()
      if (next && !/^https?:\/\//i.test(next) && !/^data:image\//i.test(next)) {
        alert('仅支持 http(s) 或 data:image/ 链接')
        return
      }
      GM_setValue('douyinstudy.bgImage', next)
      applyBackground()
    })

    GM_registerMenuCommand('恢复默认背景', () => {
      GM_setValue('douyinstudy.bgColor', DEFAULTS.bgColor)
      GM_setValue('douyinstudy.bgImage', DEFAULTS.bgImage)
      applyBackground()
    })
  }

  init()
  watchMedia()
  registerMenus()
})()
