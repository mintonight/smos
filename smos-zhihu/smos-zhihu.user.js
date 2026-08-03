// ==UserScript==
// @name         SMOS · Zhihu
// @namespace    https://github.com/mintonight/smos
// @version      1.0.0
// @description  SMOS Zhihu：知乎首页和发现页仅保留导航与居中搜索框
// @author       mintonight
// @homepageURL  https://github.com/mintonight/smos
// @supportURL   https://github.com/mintonight/smos/issues
// @downloadURL  https://raw.githubusercontent.com/mintonight/smos/main/smos-zhihu/smos-zhihu.user.js
// @updateURL    https://raw.githubusercontent.com/mintonight/smos/main/smos-zhihu/smos-zhihu.user.js
// @match        *://www.zhihu.com/
// @match        *://www.zhihu.com/explore
// @icon         https://www.zhihu.com/favicon.ico
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

  if (document.body) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }
})()
