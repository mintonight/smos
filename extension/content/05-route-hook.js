// Runs in the page's MAIN world (see manifest "world": "MAIN").
// Isolated-world content scripts cannot observe the page's own history.pushState
// calls, so this hook re-broadcasts SPA navigations as a DOM event that every
// world can listen to.
;(() => {
  'use strict'
  if (window.__smosRouteHooked) {
    return
  }
  window.__smosRouteHooked = true
  const EVENT = 'smos:locationchange'
  const notify = () => window.dispatchEvent(new CustomEvent(EVENT))
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      notify()
      return result
    }
  }
  window.addEventListener('popstate', notify)
})()
