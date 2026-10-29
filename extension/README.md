# SMOS 浏览器扩展

把 Bilibili、抖音、知乎、小红书的首页变成“仅搜索”界面的 Manifest V3 扩展。

## 安装（开发者模式）

1. 打开 `chrome://extensions`。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录（`SMOS/extension`）。
5. 在工具栏的扩展菜单中固定 SMOS，点击图标即可打开平台开关。

Edge 使用 `edge://extensions`，步骤相同。Firefox 需要另行处理 MV3 差异，当前版本未做 Firefox 适配。

GitHub Releases 也会提供已签名的 `.crx` 和 `.zip`。Chrome 默认只允许从 Web Store 安装 CRX，普通安装建议直接使用本目录加载，或解压 ZIP 后加载。

## 功能

- 平台开关：Bilibili、抖音、知乎、小红书分别启用/停用。
- 关闭平台后，对应网站恢复原生首页；已打开页面会自动刷新。
- Bilibili：播放器模式、隐藏相关推荐、播放时应用播放器模式。
- 抖音、知乎、小红书：保留原生导航和搜索框，适配亮色/深色模式。
- 知乎支持 `/`、`/explore`、`/hot`；小红书支持 `/`、`/explore`；抖音支持 `/jingxuan`、`/?recommend=*`。
- 自定义背景功能暂未加入扩展版本。

## 目录

```text
extension/
├─ manifest.json
├─ content/
│  ├─ 00-core.js          # 扩展存储适配层和 GM_* 兼容层
│  ├─ 10-bilibili.js      # 由分平台油猴脚本生成
│  ├─ 20-douyin.js
│  ├─ 30-zhihu.js
│  └─ 40-xiaohongshu.js
├─ popup/                 # 工具栏弹窗
├─ options/               # 完整设置页
└─ icons/
```

## 开发

平台内容脚本由 `tools/build-extension.mjs` 从分平台油猴脚本生成：

```bash
node tools/build-extension.mjs
node tools/verify-extension.mjs
```

修改平台行为时，优先修改对应的 `smos-*/smos-*.user.js`，再重新生成扩展内容脚本，避免两份逻辑漂移。

## 构建 CRX / ZIP

首次使用先生成签名密钥（会写入 `.keys/smos-extension.pem`，该文件已加入 `.gitignore`，不要提交）：

```bash
node tools/setup-crx-key.mjs
```

然后构建：

```bash
node tools/pack-crx.mjs
```

产物在 `dist/`：

- `smos-extension-<version>.crx`
- `smos-extension-<version>.zip`
- `SHA256SUMS.txt`（GitHub Actions 生成）

`pack-crx.mjs` 会校验 `manifest.json` 中的公钥与签名密钥一致，并验证生成的 CRX3 签名。

## 自动发布

- `.github/workflows/verify.yml`：每次 push 和 pull request 都运行，不需要 secret，检查生成的 content scripts 是否最新、油猴脚本、扩展结构和版本号（`tools/verify-versions.mjs`）。
- `.github/workflows/release.yml`：只在推送 `v*` tag 或手动触发时运行：
  1. 未配置 `CRX_PRIVATE_KEY` 时直接报错退出；
  2. 校验 tag 与 `manifest.json` 版本一致（手动触发时要求版本高于最新 tag）；
  3. 打包 CRX/ZIP 并生成 `SHA256SUMS.txt`；
  4. 如果 `v<manifest.version>` 还没有 Release，则创建 GitHub Release。

发版：修改 `extension/manifest.json` 的 `version` 并提交，然后 `git tag v<version> && git push origin v<version>`。仓库需要配置 `CRX_PRIVATE_KEY` secret（值为 `.keys/smos-extension.pem` 的 base64）：

```bash
base64 -w0 .keys/smos-extension.pem | gh secret set CRX_PRIVATE_KEY
```

## License

MIT
