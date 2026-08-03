// ==UserScript==
// @name         SMOS · Bilibili
// @namespace    https://github.com/mintonight/smos
// @version      1.2.1
// @description  SMOS Bilibili：B站仅搜索首页、隐藏相关推荐并默认宽屏
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-bilibili/smos-bilibili.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-bilibili/smos-bilibili.user.js
// @match        *://www.bilibili.com/
// @match        *://www.bilibili.com/index.html
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/bangumi/play/*
// @match        *://www.bilibili.com/list/*
// @match        *://www.bilibili.com/medialist/play/*
// @match        *://www.bilibili.com/cheese/*
// @match        *://www.bilibili.com/festival/*
// @icon         https://www.bilibili.com/favicon.ico
// @icon64       https://www.bilibili.com/favicon.ico
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

;(() => {
  'use strict'

  const STORAGE = {
    bgColor: 'searchOnlyHome.bgColor',
    bgImage: 'searchOnlyHome.bgImage',
    hideRelated: 'searchOnlyHome.hideRelated',
    playerMode: 'searchOnlyHome.playerMode',
    applyOnPlay: 'searchOnlyHome.applyOnPlay',
  }

  const DEFAULTS = {
    bgColor: '#000000',
    bgImage:
      'https://i1.hdslb.com/bfs/archive/1442a56890d91c3e2fec8a5ae4e4d9a66b67230f.jpg',
    hideRelated: true,
    /** normal | wide | web | full */
    playerMode: 'wide',
    applyOnPlay: false,
  }

  /** 播放器模式中文标签（菜单展示用） */
  const PLAYER_MODE_LABELS = {
    normal: '常规',
    wide: '宽屏',
    web: '网页全屏',
    full: '全屏',
  }

  const PLAYER_MODE_KEYS = Object.keys(PLAYER_MODE_LABELS)

  const getBgColor = () => GM_getValue(STORAGE.bgColor, DEFAULTS.bgColor) || DEFAULTS.bgColor
  const getBgImage = () => (GM_getValue(STORAGE.bgImage, DEFAULTS.bgImage) || '').trim()
  const getHideRelated = () => Boolean(GM_getValue(STORAGE.hideRelated, DEFAULTS.hideRelated))
  const getPlayerMode = () => {
    const mode = String(GM_getValue(STORAGE.playerMode, DEFAULTS.playerMode) || DEFAULTS.playerMode)
    return PLAYER_MODE_KEYS.includes(mode) ? mode : DEFAULTS.playerMode
  }
  const getApplyOnPlay = () => Boolean(GM_getValue(STORAGE.applyOnPlay, DEFAULTS.applyOnPlay))

  const addStyle = css => {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css)
    } else {
      const style = document.createElement('style')
      style.textContent = css
      ;(document.head || document.documentElement).appendChild(style)
    }
  }

  const isHomePage = () => {
    const { hostname, pathname } = location
    if (hostname !== 'www.bilibili.com') {
      return false
    }
    return pathname === '/' || pathname === '/index.html'
  }

  /** 与 Bilibili Evolved 的 allVideoUrls 对齐的视频类页面 */
  const isVideoPage = () => {
    const { hostname, pathname } = location
    if (hostname !== 'www.bilibili.com') {
      return false
    }
    return (
      pathname.startsWith('/video/') ||
      pathname.startsWith('/bangumi/play/') ||
      pathname.startsWith('/list/') ||
      pathname.startsWith('/medialist/play/') ||
      pathname.startsWith('/cheese/') ||
      pathname.startsWith('/festival/')
    )
  }

  const isEmbeddedPlayer = () => {
    try {
      return window.top !== window.self
    } catch {
      return true
    }
  }

  // ---------------------------------------------------------------------------
  // 首页：仅搜索
  // ---------------------------------------------------------------------------

  const HIDE_HOME_CSS = `
/* layout-shift：移出视口，降低懒加载触发 */
#i_cecream > main,
.bili-feed4 > main,
.palette-button-outer,
.bili-header__channel,
.header-channel,
.header-channel-fixed,
.bili-footer,
.international-footer,
.palette-button-wrap,
.animated-banner,
.header-banner__inner,
#bili-header-banner-img,
picture.banner-img {
  position: fixed !important;
  visibility: hidden !important;
  top: 200vh !important;
  left: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

html, body {
  height: 100% !important;
  overflow: hidden !important;
  margin: 0 !important;
}

body {
  min-height: 100% !important;
  background-color: var(--soh-bg-color, #000) !important;
  background-image: var(--soh-bg-image, none) !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
}

/* 搜索层：铺满视口，z-index 低于顶栏 */
#soh-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 24px 16px 48px;
  pointer-events: none;
  background-color: var(--soh-bg-color, #000);
  background-image: var(--soh-bg-image, none);
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
}

#soh-panel {
  pointer-events: auto;
  width: min(640px, 92vw);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

#soh-form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 24px;
  border: 1px solid rgba(136, 136, 136, 0.35);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: border-color 0.2s ease-out, box-shadow 0.2s ease-out;
}

#soh-form:focus-within {
  border-color: #00a1d6;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
}

#soh-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  line-height: 1.4;
  padding: 8px 4px;
  color: #111;
}

#soh-input::placeholder {
  color: #888;
  opacity: 0.9;
}

#soh-submit {
  flex: 0 0 auto;
  border: none;
  border-radius: 16px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
  color: #fff;
  background: #00a1d6;
  transition: opacity 0.15s ease-out;
}

#soh-submit:hover {
  opacity: 0.9;
}
`

  const applyBackgroundVars = () => {
    const color = getBgColor()
    const image = getBgImage()
    document.documentElement.style.setProperty('--soh-bg-color', color)
    document.documentElement.style.setProperty(
      '--soh-bg-image',
      image ? `url(${JSON.stringify(image)})` : 'none',
    )
  }

  const resolveSearchTarget = keyword => {
    const q = keyword.trim()
    if (!q) {
      return 'https://search.bilibili.com/'
    }

    if (/^BV[\w]+$/i.test(q)) {
      return `https://www.bilibili.com/video/${q}/`
    }
    if (/^av(\d+)$/i.test(q)) {
      return `https://www.bilibili.com/video/${q}/`
    }
    if (/^\d{1,12}$/.test(q)) {
      return `https://www.bilibili.com/video/av${q}/`
    }
    if (/^https?:\/\/(www\.)?bilibili\.com\/video\//i.test(q)) {
      return q
    }

    return `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`
  }

  const doSearch = keyword => {
    location.href = resolveSearchTarget(keyword)
  }

  const mountSearchUI = () => {
    if (document.getElementById('soh-root')) {
      return
    }

    const root = document.createElement('div')
    root.id = 'soh-root'

    const panel = document.createElement('div')
    panel.id = 'soh-panel'

    const form = document.createElement('form')
    form.id = 'soh-form'
    form.setAttribute('role', 'search')
    form.addEventListener('submit', e => {
      e.preventDefault()
      doSearch(input.value)
    })

    const input = document.createElement('input')
    input.id = 'soh-input'
    input.type = 'search'
    input.autocomplete = 'off'
    input.spellcheck = false
    input.placeholder = '搜索视频、番剧、UP 主，或输入 BV / av 号'
    input.setAttribute('aria-label', '搜索')

    const submit = document.createElement('button')
    submit.id = 'soh-submit'
    submit.type = 'submit'
    submit.textContent = '搜索'

    form.appendChild(input)
    form.appendChild(submit)
    panel.appendChild(form)
    root.appendChild(panel)

    const attach = () => {
      if (!document.body) {
        return false
      }
      document.body.appendChild(root)
      setTimeout(() => {
        try {
          input.focus({ preventScroll: true })
        } catch {
          input.focus()
        }
      }, 300)
      return true
    }

    if (!attach()) {
      const observer = new MutationObserver(() => {
        if (attach()) {
          observer.disconnect()
        }
      })
      observer.observe(document.documentElement, { childList: true, subtree: true })
    }
  }

  const initHome = () => {
    addStyle(HIDE_HOME_CSS)
    applyBackgroundVars()

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountSearchUI, { once: true })
    } else {
      mountSearchUI()
    }
  }

  // ---------------------------------------------------------------------------
  // 视频页：隐藏相关推荐
  // 来源：Bilibili Evolved hideRelatedVideos + 新版页面补充选择器
  // ---------------------------------------------------------------------------

  /**
   * 隐藏番剧/视频右侧相关推荐、连播列表旁推荐、播放结束相关推荐。
   * 样式对齐 Evolved registry/lib/components/style/hide/video/related-videos，
   * 并补充新版播放页可能出现的节点。
   */
  const HIDE_RELATED_CSS = `
/* ---- 经典 / v1 视频页 ---- */
#recom_module,
#reco_list,
.r-con .rcmd-list,
.video-container-v1 .recommend-list-v1,
.recommend-list-v1,
/* ---- 稍后再看 / 收藏夹 / 列表页 ---- */
.playlist-container .recommend-list-container,
.recommend-list-container,
/* ---- 番剧 plp 右侧 ---- */
.plp-r [class*="recommend_wrap"],
.plp-r .recom-wrapper,
.recom-wrapper,
/* ---- bpx 结束面板相关推荐 ---- */
.bilibili-player-ending-panel-box-videos,
.bpx-player-ending-related,
/* ---- 其它常见相关块 ---- */
.video-page-operator-card-small,
.next-play .next-play-tip,
#right-bottom-banner,
.ad-report.video-card-ad-small,
.video-page-game-card-small,
.slide-ad-exp {
  display: none !important;
}

/* 结束面板居中（隐藏推荐后避免布局偏一侧） */
.bilibili-player-ending-panel-box-functions .bilibili-player-upinfo-spans {
  position: static !important;
}
.bilibili-player-ending-panel-box,
.bpx-player-ending-content {
  display: flex !important;
  justify-content: center !important;
  flex-direction: column !important;
}
`

  let hideRelatedStyleEl = null

  const applyHideRelated = enabled => {
    if (enabled) {
      if (!hideRelatedStyleEl) {
        hideRelatedStyleEl = document.createElement('style')
        hideRelatedStyleEl.id = 'soh-hide-related'
        hideRelatedStyleEl.textContent = HIDE_RELATED_CSS
        ;(document.head || document.documentElement).appendChild(hideRelatedStyleEl)
      }
    } else if (hideRelatedStyleEl) {
      hideRelatedStyleEl.remove()
      hideRelatedStyleEl = null
    }
  }

  // ---------------------------------------------------------------------------
  // 视频页：默认播放器模式
  // 来源：Bilibili Evolved defaultPlayerMode —— 等待控制栏按钮后模拟点击
  // bpx 真实状态在 .bpx-player-container[data-screen=normal|wide|web|full]
  // ---------------------------------------------------------------------------

  const PLAYER_BUTTONS = {
    wide: ['.bpx-player-ctrl-wide', '.bilibili-player-video-btn-widescreen'],
    web: ['.bpx-player-ctrl-web', '.bilibili-player-video-web-fullscreen'],
    full: ['.bpx-player-ctrl-full', '.bilibili-player-video-btn-fullscreen'],
  }

  /** 脚本 mode → bpx data-screen */
  const MODE_TO_SCREEN = {
    normal: 'normal',
    wide: 'wide',
    web: 'web',
    full: 'full',
  }

  const VIDEO_SELECTORS = [
    '.bpx-player-video-wrap video',
    '.bilibili-player-video video',
    'bwp-video',
    'video',
  ]

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  const queryFirst = selectors => {
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        return el
      }
    }
    return null
  }

  const waitFor = (check, { timeout = 15000, interval = 200 } = {}) =>
    new Promise(resolve => {
      const start = Date.now()
      const tick = () => {
        const value = check()
        if (value) {
          resolve(value)
          return
        }
        if (Date.now() - start >= timeout) {
          resolve(null)
          return
        }
        setTimeout(tick, interval)
      }
      tick()
    })

  /** 读取播放器 localStorage 配置里的自动播放开关 */
  const isAutoPlay = () => {
    try {
      for (const key of ['bpx_player_profile', 'bilibili_player_settings']) {
        const raw = localStorage.getItem(key)
        if (!raw) {
          continue
        }
        const data = JSON.parse(raw)
        const autoplay = data?.video_status?.autoplay
        if (typeof autoplay === 'boolean') {
          return autoplay
        }
      }
    } catch {
      // ignore
    }
    return false
  }

  /**
   * 读取当前播放器模式。优先 bpx data-screen（Evolved polyfill 同源），
   * 再回退 body class / 按钮高亮，避免误判导致二次点击把宽屏关掉。
   */
  const getCurrentScreenMode = () => {
    const container = document.querySelector('.bpx-player-container')
    if (container) {
      const screen = container.getAttribute('data-screen')
      if (screen === 'wide' || screen === 'web' || screen === 'full' || screen === 'mini') {
        return screen
      }
      if (screen === 'normal' || screen === '' || screen == null) {
        // 继续用按钮状态兜底：data-screen 有时初始化稍晚
      }
    }

    const body = document.body
    if (body) {
      if (
        body.classList.contains('player-mode-web') ||
        body.classList.contains('player-full-win') ||
        body.classList.contains('mode-webscreen')
      ) {
        return 'web'
      }
      if (
        body.classList.contains('player-mode-full') ||
        body.classList.contains('player-fullscreen-fix') ||
        body.classList.contains('mode-fullscreen')
      ) {
        return 'full'
      }
      if (
        body.classList.contains('player-mode-wide') ||
        body.classList.contains('player-mode-widescreen') ||
        body.classList.contains('mode-widescreen')
      ) {
        return 'wide'
      }
    }

    const isActiveBtn = el =>
      !!el &&
      (el.classList.contains('bpx-state-entered') ||
        el.classList.contains('active') ||
        el.getAttribute('data-active') === 'true' ||
        el.getAttribute('aria-checked') === 'true')

    if (isActiveBtn(queryFirst(PLAYER_BUTTONS.web))) {
      return 'web'
    }
    if (isActiveBtn(queryFirst(PLAYER_BUTTONS.full))) {
      return 'full'
    }
    if (isActiveBtn(queryFirst(PLAYER_BUTTONS.wide))) {
      return 'wide'
    }

    if (container && container.getAttribute('data-screen') === 'normal') {
      return 'normal'
    }
    return 'normal'
  }

  const isModeAlreadyApplied = mode => {
    if (mode === 'normal') {
      return getCurrentScreenMode() === 'normal'
    }
    return getCurrentScreenMode() === MODE_TO_SCREEN[mode]
  }

  /**
   * 宽屏切换时播放器会 scrollTo 顶，短暂屏蔽 window.scrollTo
   * 对齐 Evolved disableWindowScroll
   */
  const withScrollBlocked = async action => {
    const original = window.scrollTo
    window.scrollTo = () => {}
    try {
      await action()
    } finally {
      await sleep(80)
      window.scrollTo = original
    }
  }

  /**
   * 仅在当前不是目标模式时点击一次按钮。
   * 禁止“检测失败就再点一次”——宽屏按钮是 toggle，二次点击会退回常规。
   */
  const clickPlayerButtonOnce = async mode => {
    if (mode === 'normal') {
      return true
    }
    if (isModeAlreadyApplied(mode)) {
      return true
    }

    const selectors = PLAYER_BUTTONS[mode]
    if (!selectors) {
      return false
    }

    const button = await waitFor(() => queryFirst(selectors), { timeout: 12000, interval: 150 })
    if (!button) {
      console.warn('[SMOS/Bilibili] 未找到播放器模式按钮:', mode)
      return false
    }

    // 按钮自身已处于按下态时不要再点
    if (
      button.classList.contains('bpx-state-entered') ||
      button.classList.contains('active')
    ) {
      return true
    }

    const doClick = () => {
      button.click()
    }

    if (mode === 'wide') {
      await withScrollBlocked(doClick)
    } else if (mode === 'full') {
      const video = await waitFor(
        () => {
          const v = queryFirst(VIDEO_SELECTORS)
          if (v && (v.readyState >= 2 || v.tagName === 'BWP-VIDEO') && document.readyState === 'complete') {
            return v
          }
          return null
        },
        { timeout: 10000, interval: 200 },
      )
      if (!video) {
        console.warn('[SMOS/Bilibili] 全屏模式等待视频就绪超时')
      }
      if (!document.hasFocus()) {
        try {
          window.focus()
        } catch {
          // ignore
        }
      }
      doClick()
    } else {
      doClick()
    }

    // 只等待确认，不再盲目二次点击
    await sleep(400)
    return isModeAlreadyApplied(mode)
  }

  let playerModeToken = 0
  let modeGuardObserver = null
  let modeGuardTimer = null
  let lastModeClickAt = 0

  const stopModeGuard = () => {
    if (modeGuardObserver) {
      modeGuardObserver.disconnect()
      modeGuardObserver = null
    }
    if (modeGuardTimer) {
      clearTimeout(modeGuardTimer)
      modeGuardTimer = null
    }
  }

  /**
   * 播放器初始化后期可能把 data-screen 刷回 normal。
   * 在 3 秒窗口内若目标模式被打回，最多再确保一次（带冷却，避免 toggle 抖动）。
   */
  const startModeGuard = (mode, token) => {
    stopModeGuard()
    if (mode === 'normal') {
      return
    }

    const target = MODE_TO_SCREEN[mode]
    const guardUntil = Date.now() + 3000
    let reapplyCount = 0

    const tryFix = async () => {
      if (token !== playerModeToken) {
        return
      }
      if (Date.now() > guardUntil || reapplyCount >= 1) {
        stopModeGuard()
        return
      }
      if (isModeAlreadyApplied(mode)) {
        return
      }
      // 冷却：避免和刚完成的点击叠在一起
      if (Date.now() - lastModeClickAt < 600) {
        return
      }
      reapplyCount += 1
      lastModeClickAt = Date.now()
      await clickPlayerButtonOnce(mode)
    }

    const container = document.querySelector('.bpx-player-container')
    if (container && typeof MutationObserver !== 'undefined') {
      modeGuardObserver = new MutationObserver(() => {
        const screen = container.getAttribute('data-screen')
        if (screen && screen !== target && screen !== 'mini') {
          tryFix()
        }
      })
      modeGuardObserver.observe(container, {
        attributes: true,
        attributeFilter: ['data-screen', 'class'],
      })
    }

    // 定时兜底（部分场景 data-screen 不触发或节点被替换）
    const poll = async () => {
      if (token !== playerModeToken || Date.now() > guardUntil) {
        stopModeGuard()
        return
      }
      if (!isModeAlreadyApplied(mode)) {
        await tryFix()
      }
      modeGuardTimer = setTimeout(poll, 800)
    }
    modeGuardTimer = setTimeout(poll, 800)
  }

  const applyPlayerMode = async () => {
    if (isEmbeddedPlayer()) {
      return
    }

    const mode = getPlayerMode()
    if (mode === 'normal') {
      stopModeGuard()
      return
    }

    const token = ++playerModeToken

    const video = await waitFor(() => queryFirst(VIDEO_SELECTORS), { timeout: 20000, interval: 200 })
    if (!video || token !== playerModeToken) {
      return
    }

    // 等控制栏/容器出现，减少“点太早被播放器初始化冲掉”
    await waitFor(
      () =>
        document.querySelector('.bpx-player-container') ||
        queryFirst(PLAYER_BUTTONS.wide) ||
        queryFirst(PLAYER_BUTTONS.web),
      { timeout: 12000, interval: 150 },
    )
    if (token !== playerModeToken) {
      return
    }

    const run = async () => {
      if (token !== playerModeToken) {
        return
      }
      if (isModeAlreadyApplied(mode)) {
        startModeGuard(mode, token)
        return
      }
      lastModeClickAt = Date.now()
      await clickPlayerButtonOnce(mode)
      if (token !== playerModeToken) {
        return
      }
      // 若首次被初始化冲掉，稍后只再尝试有限次（每次仍先检查是否已宽屏）
      for (let i = 0; i < 2 && token === playerModeToken; i += 1) {
        if (isModeAlreadyApplied(mode)) {
          break
        }
        await sleep(700)
        if (token !== playerModeToken || isModeAlreadyApplied(mode)) {
          break
        }
        lastModeClickAt = Date.now()
        await clickPlayerButtonOnce(mode)
      }
      startModeGuard(mode, token)
    }

    // 对齐 Evolved：开启「播放时应用」且未自动播放时，等到 play 再切换
    if (getApplyOnPlay() && !isAutoPlay()) {
      if (!video.paused && !video.ended) {
        await run()
      } else {
        const onPlay = () => {
          video.removeEventListener('play', onPlay)
          run()
        }
        video.addEventListener('play', onPlay)
      }
      return
    }

    await run()
  }

  /** 监听 SPA / 切 P 后的路径变化，重新应用播放器模式 */
  const watchVideoNavigation = () => {
    let lastKey = `${location.pathname}${location.search}${location.hash}`

    const maybeReapply = () => {
      if (!isVideoPage()) {
        return
      }
      const key = `${location.pathname}${location.search}${location.hash}`
      if (key === lastKey) {
        return
      }
      lastKey = key
      stopModeGuard()
      // 等新播放器挂载
      setTimeout(() => {
        applyPlayerMode()
      }, 500)
    }

    const wrapHistory = method => {
      const original = history[method]
      history[method] = function wrapped(...args) {
        const ret = original.apply(this, args)
        maybeReapply()
        return ret
      }
    }
    wrapHistory('pushState')
    wrapHistory('replaceState')
    window.addEventListener('popstate', maybeReapply)

    // 部分列表页只改 hash 或内部状态；用轻量轮询兜底
    setInterval(() => {
      maybeReapply()
    }, 1500)
  }

  const initVideoPage = () => {
    applyHideRelated(getHideRelated())
    applyPlayerMode()
    watchVideoNavigation()
  }

  // ---------------------------------------------------------------------------
  // 菜单
  // ---------------------------------------------------------------------------

  const registerMenus = () => {
    if (typeof GM_registerMenuCommand !== 'function') {
      return
    }

    if (isHomePage()) {
      GM_registerMenuCommand('设置背景颜色（默认 #000000）', () => {
        const next = window.prompt('背景颜色（CSS 颜色值）', getBgColor())
        if (next === null) {
          return
        }
        const value = next.trim() || DEFAULTS.bgColor
        GM_setValue(STORAGE.bgColor, value)
        applyBackgroundVars()
      })

      GM_registerMenuCommand('设置背景图片 URL（留空清除）', () => {
        const next = window.prompt('背景图片 URL（http/https，留空清除）', getBgImage())
        if (next === null) {
          return
        }
        const value = next.trim()
        if (value && !/^https?:\/\//i.test(value) && !/^data:image\//i.test(value)) {
          window.alert('仅支持 http(s) 或 data:image/ 链接')
          return
        }
        GM_setValue(STORAGE.bgImage, value)
        applyBackgroundVars()
      })

      GM_registerMenuCommand('恢复默认背景', () => {
        GM_setValue(STORAGE.bgColor, DEFAULTS.bgColor)
        GM_setValue(STORAGE.bgImage, DEFAULTS.bgImage)
        applyBackgroundVars()
      })
    }

    if (isVideoPage()) {
      GM_registerMenuCommand(
        `隐藏视频推荐：${getHideRelated() ? '开' : '关'}（点击切换）`,
        () => {
          const next = !getHideRelated()
          GM_setValue(STORAGE.hideRelated, next)
          applyHideRelated(next)
        },
      )

      GM_registerMenuCommand(
        `默认播放器模式：${PLAYER_MODE_LABELS[getPlayerMode()]}（点击切换）`,
        () => {
          const current = getPlayerMode()
          const idx = PLAYER_MODE_KEYS.indexOf(current)
          const next = PLAYER_MODE_KEYS[(idx + 1) % PLAYER_MODE_KEYS.length]
          GM_setValue(STORAGE.playerMode, next)
          window.alert(
            `已切换为「${PLAYER_MODE_LABELS[next]}」\n刷新或下一次进入视频页生效（宽屏/网页全屏一般会立即尝试应用）。`,
          )
          if (next !== 'normal') {
            applyPlayerMode()
          }
        },
      )

      GM_registerMenuCommand(
        `播放时再应用模式：${getApplyOnPlay() ? '开' : '关'}（点击切换）`,
        () => {
          const next = !getApplyOnPlay()
          GM_setValue(STORAGE.applyOnPlay, next)
          window.alert(
            next
              ? '已开启：非自动播放时，将在视频开始播放后再切换模式。'
              : '已关闭：进入页面后尽快应用模式。',
          )
        },
      )
    }

    // 全局也能配置视频相关选项，方便在首页先设好
    if (isHomePage()) {
      GM_registerMenuCommand(
        `隐藏视频推荐（进视频页生效）：${getHideRelated() ? '开' : '关'}`,
        () => {
          const next = !getHideRelated()
          GM_setValue(STORAGE.hideRelated, next)
          window.alert(`隐藏视频推荐已${next ? '开启' : '关闭'}，进入视频页后生效。`)
        },
      )

      GM_registerMenuCommand(
        `默认播放器模式（进视频页生效）：${PLAYER_MODE_LABELS[getPlayerMode()]}`,
        () => {
          const current = getPlayerMode()
          const idx = PLAYER_MODE_KEYS.indexOf(current)
          const next = PLAYER_MODE_KEYS[(idx + 1) % PLAYER_MODE_KEYS.length]
          GM_setValue(STORAGE.playerMode, next)
          window.alert(`默认播放器模式已设为「${PLAYER_MODE_LABELS[next]}」，进入视频页后生效。`)
        },
      )
    }
  }

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------

  if (isHomePage()) {
    initHome()
  } else if (isVideoPage()) {
    initVideoPage()
  }

  registerMenus()
})()
