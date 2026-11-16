# CLAUDE.md

本仓库的统一开发规范维护在 [Agent.md](./Agent.md)。

在开始任何修改前，请先完整阅读 `Agent.md`，并遵循其中的架构、单一事实来源、构建、测试、发布和隐私约定。本文件只做入口索引，不重复规范，避免两份规则漂移；需要修改规范时请改 `Agent.md`。

## 快速记忆

- 平台逻辑只改 `smos-*/smos-*.user.js`，然后运行 `npm run build` 生成 `smos.user.js` 平台代码段和 `extension/content/[1-4]0-*.js`，不要手改它们。
- 提交前运行（首次先 `npm ci`）：

```bash
npm run verify
```

- 扩展发版：改 `extension/manifest.json` 的 `version` 并合入 `main` 后，推送匹配的 `v<version>` tag 才会触发 `release.yml`；push `main` 本身不会发布。只在用户明确要求时发版。
- 不要提交 `.keys/`、`*.pem`、`dist/`、`*.crx`，不要引入个人绝对路径、邮箱或截图隐私。
- 浏览器回归使用 ego-browser；测试扩展前先停用 Tampermonkey 里的 SMOS 脚本，避免重复注入。
