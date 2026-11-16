import globals from 'globals'
import smos from './tools/eslint-plugin-smos.mjs'

const PLATFORM_FILES = ['bilibili', 'douyin', 'zhihu', 'xiaohongshu'].map(key => `smos-${key}/smos-${key}.user.js`)
const each = (entry) => PLATFORM_FILES.map(file => ({ file, ...entry }))

// Known violations of smos/no-timer-patch and smos/no-global-patch. Each entry is a TODO:
// fix the root cause, then delete the entry (lint fails on entries that are no longer needed).
const TIMER_ALLOW = [
  ...each({
    inside: 'watchRoute',
    what: 'setInterval',
    todo: '3s URL-compare poll on top of the page-world history hook, navigatesuccess, popstate and hashchange. ' +
      'Remove once real-browser runs on all four sites show those signals catch every SPA navigation (shared-runtime follow-up).',
  }),
  ...each({
    inside: 'togglePlatform',
    what: 'setTimeout',
    todo: 'Reloads 50ms after GM_setValue because Tampermonkey persists GM_setValue asynchronously. ' +
      'Replace with `await GM.setValue(...)` then location.reload() (needs @grant GM.setValue) and verify in real Tampermonkey; jsdom cannot prove persistence.',
  }),
  {
    file: 'smos-bilibili/smos-bilibili.user.js',
    inside: 'mountSearchUI',
    what: 'setTimeout',
    todo: 'Focuses the search box 300ms after mount because the page takes focus during load. Find the page event that steals focus and refocus on it; needs a real-browser check.',
  },
  {
    file: 'smos-douyin/smos-douyin.user.js',
    inside: 'mount',
    what: 'setTimeout',
    todo: 'Focuses the search box 200ms after mount, same cause as Bilibili. Needs a real-browser check before replacing.',
  },
  ...[
    'sleep',
    'waitFor',
    'startModeGuard',
    'watchVideoNavigation',
  ].map(inside => ({
    file: 'smos-bilibili/smos-bilibili.user.js',
    inside,
    what: 'setTimeout',
    todo: 'Bilibili player-mode timing (sleep 80/400/700ms, 600ms cool-down, 800ms poll, 3s guard window, 500ms after route change). ' +
      'Rewrite as one reconcile(desired, observed) driven by a MutationObserver on .bpx-player-container[data-screen]. ' +
      'Invariants to keep and test: the mode buttons are toggles, so never click when observed === desired; at most one corrective click per page.',
  })),
]

const GLOBAL_PATCH_ALLOW = [
  ...each({
    inside: 'hookPageHistory',
    what: 'pageWindow.history[…]',
    todo: 'Intentional: pageWindow is unsafeWindow, the real page window, so this hook works. Moves into the shared runtime follow-up.',
  }),
  {
    file: 'smos-bilibili/smos-bilibili.user.js',
    inside: 'withScrollBlocked',
    what: 'window.scrollTo',
    todo: 'Overrides scrollTo from the sandbox/isolated world, which probably never reaches the player\'s own scrollTo call. ' +
      'Verify in a real browser; then move the override to the page world or delete it.',
  },
]

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'assets/**', 'smos.user.js', 'extension/content/[1-4]0-*.js'],
  },
  {
    files: ['smos-*/*.user.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        GM_getValue: 'readonly',
        GM_setValue: 'readonly',
        GM_addStyle: 'readonly',
        GM_registerMenuCommand: 'readonly',
        unsafeWindow: 'readonly',
      },
    },
    plugins: { smos },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'smos/no-timer-patch': ['error', { allow: TIMER_ALLOW }],
      'smos/no-global-patch': ['error', { allow: GLOBAL_PATCH_ALLOW }],
      'smos/guarded-gm': 'error',
    },
  },
  {
    files: ['extension/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.browser, chrome: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
]
