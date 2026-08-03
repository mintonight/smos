// ==UserScript==
// @name         SMOS · Xiaohongshu
// @namespace    https://github.com/mintonight/smos
// @version      1.0.0
// @description  SMOS Xiaohongshu：小红书首页和发现页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js
// @match        *://www.xiaohongshu.com/
// @match        *://www.xiaohongshu.com/explore
// @icon         https://www.xiaohongshu.com/favicon.ico
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

;(() => {
  'use strict'

  if (location.pathname !== '/' && location.pathname !== '/explore') {
    return
  }

  const style = document.createElement('style')
  style.textContent = `
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
  inset: 72px 0 0 239px;
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
`
  document.documentElement.appendChild(style)

  const mount = () => {
    if (!document.body || document.getElementById('smos-root')) {
      return Boolean(document.body)
    }

    const root = document.createElement('main')
    root.id = 'smos-root'
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

  if (document.body) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }
})()
