# SMOS Agent 开发规范

> 本文件适用于本仓库的所有自动化 Agent、贡献者和维护者。开始修改前先完整阅读；如果本文件与 README 的安装说明有冲突，以 README 的用户侧说明为准，但开发流程以本文件为准。

## 1. 项目定位

SMOS（Social Media Only Search）把社交媒体首页变成“只有搜索”的界面。

项目同时维护两套交付物：

- **油猴脚本**：可单独安装的平台脚本，以及一个统一脚本 `smos.user.js`。
- **浏览器扩展**：`extension/` 下的 Manifest V3 扩展，支持 Chrome/Edge 的开发者模式加载，并由 CI 发布 CRX/ZIP。

当前覆盖平台与目标页面：

| 平台 | 目标页面 | 非目标页面 |
| --- | --- | --- |
| Bilibili | `/`、`/index.html`、`/video/*`、`/bangumi/play/*`、`/list/*`、`/medialist/play/*`、`/cheese/*`、`/festival/*` | 其他 B 站页面 |
| Douyin | `/jingxuan`、`/jingxuan/*`、`/?recommend=*` | 搜索、用户、视频详情等 |
| Zhihu | `/`、`/explore`、`/hot` | 搜索、专栏、关注、通知等 |
| Xiaohongshu | `/`、`/explore` | 搜索、详情等 |
| X（Twitter） | `/`、`/home`、`/explore` | 搜索、通知、私信、个人主页、帖子详情等 |
| YouTube | `/`、`/shorts`、`/shorts/*` | 搜索结果、观看页、订阅、频道、播放列表等 |

**不要擅自扩大目标页面范围。** 新增或修改目标路由时，必须同步更新平台脚本、统一脚本、扩展内容脚本、README 和测试。

## 2. 仓库结构与职责

```text
smos.user.js                     统一油猴脚本：头部手写，平台代码段由 tools/sync-userscripts.mjs 生成
smos-bilibili/                    Bilibili 独立油猴脚本 + README + LICENSE
smos-douyin/                      Douyin 独立油猴脚本 + README + LICENSE
smos-zhihu/                       Zhihu 独立油猴脚本 + README + LICENSE
smos-xiaohongshu/                 Xiaohongshu 独立油猴脚本 + README + LICENSE
smos-x/                           X（Twitter）独立油猴脚本 + README + LICENSE
smos-youtube/                     YouTube 独立油猴脚本 + README + LICENSE
extension/
├─ manifest.json                  MV3 清单、权限、content_scripts、图标
├─ content/05-route-hook.js       手写：MAIN world 钩住 history，派发 smos:locationchange
├─ content/00-core.js             手写：chrome.storage 适配、GM_* 兼容层
├─ content/10-bilibili.js         生成文件：来自独立油猴脚本
├─ content/20-douyin.js           生成文件
├─ content/30-zhihu.js            生成文件
├─ content/40-xiaohongshu.js      生成文件
├─ content/50-x.js                生成文件
├─ content/60-youtube.js          生成文件
├─ popup/                         手写：工具栏平台开关
├─ options/                       手写：平台开关 + Bilibili 播放器设置
└─ icons/                         16/32/48/128 扩展图标
tools/
├─ build-extension.mjs            从独立油猴脚本生成扩展内容脚本（--check 只校验）
├─ sync-userscripts.mjs           从独立油猴脚本生成 smos.user.js 的平台代码段（--check 只校验）
├─ verify-userscripts.mjs         校验油猴脚本语法、元数据和统一脚本同步
├─ verify-extension.mjs           校验扩展清单、资源、语法和生成文件是否最新
├─ verify-versions.mjs            校验版本号一致性
├─ verify-runtime.mjs             功能地图 + jsdom：在每个目标/非目标页面实际运行三种产物并断言
├─ eslint-plugin-smos.mjs         项目自定义 lint 规则（定时器、页面全局补丁、未保护的 GM_*）
├─ pack-crx.mjs                   生成 CRX3 + ZIP
├─ setup-crx-key.mjs              首次生成/轮换签名密钥
└─ make-concept-sheet.py          可选的品牌概念图拼图工具
assets/
├─ brand/                         品牌图标与概念图
└─ readme/                        README Hero 和预览
.github/workflows/verify.yml      每次 push / PR：生成检查、校验、lint、测试、运行时验证
.github/workflows/release.yml     推送 v* tag（或手动触发）时：校验、打包 CRX/ZIP、创建 Release
test/                             node:test 单元测试和属性测试
eslint.config.mjs                 ESLint 配置；已知违例的白名单和 TODO 都在这里
package.json                      仅开发依赖（eslint、jsdom），产物不引入任何运行时依赖
```

## 3. 单一事实来源（最重要）

平台行为只允许在**独立油猴脚本**中修改：

- `smos-bilibili/smos-bilibili.user.js`
- `smos-douyin/smos-douyin.user.js`
- `smos-zhihu/smos-zhihu.user.js`
- `smos-xiaohongshu/smos-xiaohongshu.user.js`
- `smos-x/smos-x.user.js`
- `smos-youtube/smos-youtube.user.js`

然后按顺序同步：

1. 修改独立平台脚本。
2. 运行 `npm run build`（= `build-extension.mjs` + `sync-userscripts.mjs`），重新生成 `extension/content/[1-4]0-*.js` 和 `smos.user.js` 的平台代码段。
3. 运行 `npm run verify`。

规则：

- **不要手改** `extension/content/10-bilibili.js`、`20-douyin.js`、`30-zhihu.js`、`40-xiaohongshu.js` 和 `smos.user.js` 的平台代码段，它们会被覆盖（CI 用 `--check` 检查）。
- `extension/content/00-core.js` 是手写文件，可以直接修改；它负责 `chrome.storage` 和 `GM_*` 兼容。
- `extension/popup/`、`extension/options/` 是手写文件，可以直接修改。
- 如果平台逻辑没有变化，不要无故重写生成文件或改变版本号。

## 4. 运行模型与实现约定

### 4.1 注入时机

所有平台脚本和扩展内容脚本都应在 `document-start` 运行：

- 油猴：`@run-at document-start`
- 扩展：`content_scripts.run_at: "document_start"`

`document-start` 时 `document.head` 或 `document.body` 可能还不存在，任何创建 style、挂载 DOM 的代码都必须有空值保护或 `MutationObserver` 等待逻辑。

### 4.2 平台脚本结构

每个平台脚本是一个 IIFE。IIFE 第一条语句必须是 hostname 守卫（`if (location.hostname !== 'www.<site>.com') return`），这样它在 `smos.user.js` 里也只会在自己的站点运行；`verify-runtime.mjs` 会断言统一脚本在每个站点的菜单和定时器与该站点的独立脚本完全一致。

知乎、小红书、抖音、X、YouTube 的脚本包含：

1. 平台开关读取：`smos.enabled.<platform>`。
2. 目标页面判断 `isTargetPage()`。
3. 样式注入 `addStyle()`。
4. 挂载/卸载 `mount()` / `deactivate()`。
5. `sync()`：根据当前 URL 启用或停用。
6. SPA 路由监听：扩展用 `content/05-route-hook.js`（MAIN world），油猴用 `unsafeWindow` 钩住页面自己的 `history`，再加 `navigatesuccess` / `popstate` / `hashchange`。现有的 3 秒轮询是 `eslint.config.mjs` 里登记的待清理项，不要再新增。
7. 油猴菜单开关注册（扩展中由 `GM_registerMenuCommand` 空实现兼容，不要依赖它）。

**hostname 守卫之外，不要因为当前不是目标页面就提前 `return` 整个脚本。** 否则 SPA 路由返回目标页面时无法恢复。样式可以默认禁用，但路由监听必须继续运行。

Bilibili 脚本结构不同（按首页/视频页一次性初始化），在共享运行时重构前保持现状。

### 4.3 平台所有权保护

Zhihu/XHS/X/YouTube 都使用 `#smos-root`，Douyin 使用 `#dys-root`，Bilibili 使用 `#soh-root`。有了 hostname 守卫，不同平台的代码不会在同一页面运行；知乎/小红书仍保留 `window.__smosMountedPlatform` 标记，等共享运行时为每个平台分配独立根节点 id 后再删除。

### 4.4 主题适配

- 抖音、小红书搜索框使用 CSS 变量：`--smos-page-bg`、`--smos-surface`、`--smos-border`、`--smos-text`、`--smos-muted`、`--smos-shadow`；抖音另有 `--smos-overlay` 用于背景图叠加。
- 通过读取页面背景亮度设置 `document.documentElement.dataset.smosTheme = "dark" | "light"`。
- 小红书在读不到页面背景色时，用 `matchMedia('(prefers-color-scheme: dark)')` 兜底（在 `applyTheme()` 里，不在 CSS 里）。
- 知乎目前使用固定浅色样式，不要无故引入主题变量。
- 主题切换后必须重新计算，不要只在首次加载时读取一次。

### 4.5 抖音媒体限制

抖音的自动静音/媒体阻断只能在目标页面生效：

- 使用 `mediaBlockingActive` 之类的状态控制。
- 离开目标路由时解除限制。
- 监听 `play`、`volumechange`、`loadedmetadata`、`canplay` 时不要影响非目标页面。

### 4.6 Bilibili

Bilibili 已相对稳定，非必要不做重构。修改时必须至少回归：

- 首页搜索框。
- 视频页播放器模式。
- 隐藏相关推荐。
- 油猴菜单中的播放器模式/背景设置（扩展版本没有自定义背景）。

扩展里的 Bilibili 设置由 options 页面管理：播放器模式、隐藏相关推荐、播放时应用播放器模式。

## 5. 设置与存储

### 5.1 油猴

使用 `GM_getValue` / `GM_setValue`。调用必须在 `typeof GM_x === 'function'` 保护之下，或者走脚本里的 `readSetting` / `writeSetting`；lint 规则 `smos/guarded-gm` 会拦截。

### 5.2 扩展

`extension/content/00-core.js` 提供：

- `window.__SMOS_EXT__.ready`：存储读取完成。
- `GM_getValue`、`GM_setValue`、`GM_addStyle`、`GM_registerMenuCommand` 兼容层。
- `chrome.storage.onChanged` 监听，设置变化后自动刷新页面。

平台生成脚本通过 `window.__SMOS_EXT__.ready.then(boot)` 启动，不要在 `ready` 之前读取设置。

### 5.3 关键存储键

| 键 | 类型 | 用途 |
| --- | --- | --- |
| `smos.enabled.bilibili` | boolean | Bilibili 开关 |
| `smos.enabled.douyin` | boolean | 抖音开关 |
| `smos.enabled.zhihu` | boolean | 知乎开关 |
| `smos.enabled.xiaohongshu` | boolean | 小红书开关 |
| `smos.enabled.x` | boolean | X（Twitter）开关 |
| `smos.enabled.youtube` | boolean | YouTube 开关 |
| `searchOnlyHome.playerMode` | string | Bilibili 播放器模式：`normal` / `wide` / `web` / `full` |
| `searchOnlyHome.hideRelated` | boolean | Bilibili 隐藏相关推荐 |
| `searchOnlyHome.applyOnPlay` | boolean | Bilibili 播放时应用模式 |
| `searchOnlyHome.bgColor` | string | Bilibili 油猴背景色 |
| `searchOnlyHome.bgImage` | string | Bilibili 油猴背景图 |
| `douyinstudy.bgColor` | string | 抖音油猴背景色 |
| `douyinstudy.bgImage` | string | 抖音油猴背景图 |

新增存储键时必须同步：

- 平台脚本读取逻辑。
- 扩展 `00-core.js` 的重载前缀（如 `smos.enabled.`、`searchOnlyHome.`、`douyinstudy.`）。
- popup/options UI。
- README 或扩展 README。

## 6. 开发工作流

1. 先读本文件，确认改动属于哪个平台、哪套交付物。
2. 首次运行 `npm ci` 安装开发工具。
3. 修改独立油猴脚本。
4. 运行 `npm run build`。
5. 运行 `npm run verify`（生成检查、四个 verify 脚本、lint、测试、运行时验证）。
6. 做浏览器回归测试。
7. 更新相关 README / 版本号。
8. 只有用户明确要求时才 commit / push / 发版。

### 版本号

- 独立油猴脚本：修改哪个平台就 bump 对应 `@version`。
- 统一脚本：如果修改了 `smos.user.js` 中的平台代码段，bump `smos.user.js` 的 `@version`。
- 扩展：只有需要发布新扩展版本时才 bump `extension/manifest.json` 的 `version`。
- 不要为了让 CI 通过而随意 bump 版本。

## 7. 测试规范

### 7.1 自动校验

每次改动运行 `npm run verify`，CI（`verify.yml`）跑的是同一组检查：

- `build-extension.mjs --check`、`sync-userscripts.mjs --check`：生成文件是否最新；失败就运行 `npm run build`。
- `verify-userscripts.mjs`、`verify-extension.mjs`、`verify-versions.mjs`。
- `npm run lint`：`no-undef`、`no-unused-vars`，以及 `smos/no-timer-patch`、`smos/no-global-patch`、`smos/guarded-gm`。lint 报错时按报错信息修根因；确实无法避免时，在 `eslint.config.mjs` 的白名单里加一条带 TODO 的条目，不要写行内注释解释。
- `npm test`：`resolveSearchTarget`、各平台目标路由判断、`@match` 与 manifest 一致性。
- `npm run verify:runtime`：按 `tools/verify-runtime.mjs` 里的功能地图，在 jsdom 中运行独立脚本、统一脚本和扩展内容脚本，断言搜索框是否挂载、抖音静音、菜单和定时器不跨平台。新增目标页面时先在功能地图里加一行。

### 7.2 浏览器回归

本项目当前约定使用 **ego-browser** 做浏览器验证，不使用 Playwright 或另开浏览器。

测试扩展时：

1. 先在 Tampermonkey 中停用 SMOS 相关脚本，避免油猴脚本和扩展重复注入。
2. 加载/刷新 `extension/`。
3. 检查 popup、options 和 `chrome://extensions` 无报错。
4. 测试目标页面、刷新、SPA 前进/后退、非目标页面移除、平台开关。

关键选择器：

- Zhihu / Xiaohongshu：`#smos-root`、`#smos-form`、`#smos-input`。
- Douyin：`#dys-root`、`#dys-form`、`#dys-input`。

### 7.3 最小回归矩阵

| 改动 | 至少验证 |
| --- | --- |
| Zhihu | `/`、`/explore`、`/hot`；刷新；进入 `/search` 后根节点移除；返回后恢复 |
| Xiaohongshu | `/`、`/explore`；刷新；进入 `/search_result` 后移除；亮/暗色主题 |
| Douyin | `/jingxuan`；刷新；进入搜索/用户页后移除；亮/暗色主题；目标页自动静音 |
| X（Twitter） | `/`、`/home`、`/explore`；刷新；进入 `/search` 后移除；返回后恢复；亮/暗色主题 |
| YouTube | `/`、`/shorts/*`；刷新；进入 `/watch`、`/results` 后移除；返回后恢复；亮/暗色主题 |
| Bilibili | 首页搜索框；视频页播放器模式；隐藏相关推荐 |
| 平台开关 | 关闭后当前页面恢复原生首页，重新开启后搜索框恢复 |
| 扩展 UI | popup 与 options 状态一致；Bilibili 设置能写入存储 |

测试时还要检查浏览器控制台是否有异常；扩展的 content script 错误可在 `chrome://extensions` 的错误面板查看。

## 8. 版本发布与 CI

### 8.1 自动发布流程

- `.github/workflows/verify.yml`：每次 push 和 PR 都运行，不需要 secret，不发布。
- `.github/workflows/release.yml`：**只在推送 `v*` tag 或手动触发（workflow_dispatch）时运行**；push `main` 不会发布。它会检查生成文件和两个 verify 脚本，校验 tag 等于 `v<manifest.version>`（手动触发时要求 manifest 版本大于最新 tag），用 secret `CRX_PRIVATE_KEY` 打包 CRX/ZIP、生成 `SHA256SUMS.txt`，若该版本还没有 Release 就创建 Release（手动触发时由 CI 打 tag）。

发布新扩展版本（仅在用户明确要求时）：

1. 修改 `extension/manifest.json` 的 `version`，合入 `main`，等 `verify.yml` 通过。
2. 在该提交上推送匹配的 tag：`git tag v<version> && git push origin v<version>`；或在 Actions 页面手动触发 release。
3. 等待 release 完成，检查 Release 中的 CRX、ZIP 和校验和。

### 8.2 签名密钥

- 私钥：`.keys/smos-extension.pem`，已被 `.gitignore` 忽略，**永远不要提交**。
- GitHub Actions secret：`CRX_PRIVATE_KEY`，值为私钥文件的 base64。
- `extension/manifest.json` 中的 `key` 是**公钥**，用于固定扩展 ID，不是私钥。
- 不要随意轮换密钥：轮换会改变扩展 ID，并影响已有安装和 Release。
- 如果确实要轮换，必须同时更新 `manifest.json` 的公钥、GitHub secret，并重建 Release；操作前先备份。

## 9. 安全与隐私

- 不要提交任何 API Key、Token、密码、Cookie、私钥、`.env` 文件。
- 不要在脚本或文档里写个人绝对路径；Python 用 `Path(__file__).resolve().parent.parent`，Node 用 `fileURLToPath(import.meta.url)`。
- 不要提交个人邮箱；git 提交使用 GitHub noreply 地址。
- 截图如果包含账号头像、用户名、邮箱、手机号、通知内容，必须打码或裁剪；提交前检查图片元数据。
- README/品牌 SVG 使用系统字体、纯 SVG，不引用远程图片、不包含脚本或 `foreignObject`。
- 仓库是公开的，任何提交都可能被永久缓存；不要依赖“之后删除”来保护敏感信息。
- 发现隐私泄露时先报告，不要自行 force-push 或重写历史；历史重写必须得到用户明确同意并先做备份。

## 10. 代码风格

- 使用原生 JavaScript，不引入打包器、框架或运行时依赖。
- 保持现有风格：2 空格缩进、单引号、无分号、`'use strict'`、IIFE。
- 优先使用 `const`，避免全局变量；跨平台共享状态放在 `window.__smos*` 命名空间。
- DOM 选择器使用稳定的平台原生类名/属性，并准备兜底；不要依赖易变的哈希类名。
- `unsafeWindow` 只用于 `hookPageHistory` 钩住页面自己的 `history`（沙箱里的包装对页面无效）；不要用它读写页面的其他状态。不要注入远程脚本。
- 扩展内容脚本不要依赖 DOM 加载完成才执行；保持 `document-start` 兼容。
- 生成文件不手改；手写文件改动后运行构建和校验。
- 新增/修改 README 图片时，保持 `assets/readme/hero.svg` 为白底主版本，深色版本保留在 `assets/readme/hero-dark.svg`。

## 11. 常见陷阱

以下陷阱已由检查覆盖，不再单列：跨站运行和跨平台互删（`verify-runtime`）、生成文件过期（`--check`）、未保护的 `GM_*`（lint）。

1. **非目标页面提前 return**：会导致 SPA 返回目标页面时脚本不恢复。保留路由监听。
2. **document-start 空节点**：创建 style/root 前等待 `head`/`body`。
3. **扩展存储异步**：平台脚本必须等待 `__SMOS_EXT__.ready`（生成器已经包好）。
4. **扩展菜单命令无效**：扩展中 `GM_registerMenuCommand` 是空实现，平台开关由 popup/options 负责。
5. **扩展版本号误 bump**：docs-only 改动不要触发新 Release，除非用户要求。
6. **自定义背景**：扩展版本暂未实现自定义背景，不要声称已支持。
7. **Bilibili 改动**：改动必须回归首页和视频页；播放器模式逻辑的重写已列为后续工作，不要在上面继续叠加 sleep/重试。
8. **隐私路径**：不要重新引入本地用户名路径或旧邮箱；历史已经被重写。

## 12. Definition of Done

提交前确认：

- [ ] 平台逻辑只改在独立油猴脚本，已运行 `npm run build`。
- [ ] `npm run verify` 通过。
- [ ] 受影响的平台完成浏览器回归，无控制台异常。
- [ ] 扩展 popup/options 与存储状态一致（如涉及）。
- [ ] 相关 README / 版本号已更新（如涉及）。
- [ ] 没有提交 `.keys/`、`*.pem`、`dist/`、`*.crx` 或个人信息。
- [ ] 用户明确要求时才 commit / push / 发布。

## 13. 快速命令

```bash
# 安装开发工具（首次）
npm ci

# 生成扩展内容脚本 + smos.user.js 平台代码段
npm run build

# 全部校验（与 CI 相同）
npm run verify

# 单独运行
npm run lint
npm test
npm run verify:runtime -- --verbose

# 本地打包 CRX/ZIP（需要 .keys/smos-extension.pem）
node tools/pack-crx.mjs

# 首次生成或轮换签名密钥（谨慎）
node tools/setup-crx-key.mjs
```
