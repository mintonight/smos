// ==UserScript==
// @name         SMOS · Douyin
// @namespace    https://github.com/mintonight/smos
// @version      1.0.1
// @description  SMOS Douyin：抖音精选页和推荐页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js
// @match        *://www.douyin.com/
// @match        *://www.douyin.com/jingxuan*
// @icon         https://www.douyin.com/favicon.ico
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

;(() => {
  'use strict'

  const isJingxuan = location.pathname === '/jingxuan'
  const isRecommendHome =
    location.pathname === '/' && new URLSearchParams(location.search).has('recommend')

  if (!isJingxuan && !isRecommendHome) {
    return
  }

  const DEFAULTS = {
    bgColor: '#0f0f12',
    bgImage: '',
  }

  const getBgColor = () => GM_getValue('douyinstudy.bgColor', DEFAULTS.bgColor) || DEFAULTS.bgColor
  const getBgImage = () => (GM_getValue('douyinstudy.bgImage', DEFAULTS.bgImage) || '').trim()

  const addStyle = css => {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css)
      return
    }
    const style = document.createElement('style')
    style.textContent = css
    ;(document.head || document.documentElement).appendChild(style)
  }

  const applyBackground = () => {
    const image = getBgImage()
    document.documentElement.style.setProperty('--dys-bg-color', getBgColor())
    document.documentElement.style.setProperty(
      '--dys-bg-image',
      image ? `url(${JSON.stringify(image)})` : 'none',
    )
  }

  const CSS = `
html, body {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  background: var(--dys-bg-color, #0f0f12) !important;
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
  background-color: var(--dys-bg-color, #0f0f12);
  background-image:
    linear-gradient(rgba(15, 15, 18, 0.18), rgba(15, 15, 18, 0.18)),
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
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

#dys-form:focus-within {
  border-color: rgba(254, 44, 85, 0.72);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32), 0 0 0 3px rgba(254, 44, 85, 0.15);
}

#dys-input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #161616;
  font: 16px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
}

#dys-input::placeholder {
  color: #777;
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

  const stopMedia = media => {
    media.autoplay = false
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

  const preventPlayback = event => {
    if (event.target instanceof HTMLMediaElement) {
      stopMedia(event.target)
    }
  }

  const watchMedia = () => {
    blockMedia(document)
    document.addEventListener('play', preventPlayback, true)

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') {
          blockMedia(record.target)
          continue
        }
        record.addedNodes.forEach(blockMedia)
      }
    })
    observer.observe(document.documentElement, {
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

  const init = () => {
    addStyle(CSS)
    applyBackground()

    if (mount()) {
      return
    }
    const observer = new MutationObserver(() => {
      if (mount()) {
        observer.disconnect()
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
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
