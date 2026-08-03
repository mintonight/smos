# SMOS · Bilibili

SMOS（Social Media Only Search）是一个减少信息流干扰的油猴脚本系列。

本仓库是 SMOS 的 Bilibili 版本：B 站首页只保留顶栏和居中搜索框，视频页可隐藏相关推荐并设置默认播放器模式。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 使用下方链接安装脚本：

**GitHub Raw（推荐）**

https://raw.githubusercontent.com/mintonight/smos/main/smos-bilibili/smos-bilibili.user.js

**jsDelivr**

https://cdn.jsdelivr.net/gh/mintonight/smos/smos-bilibili/smos-bilibili.user.js

3. 打开 https://www.bilibili.com/ 或任意视频页。

## 功能

### 首页

- 隐藏推荐流、频道栏和横幅装饰。
- 保留 B 站原生顶栏。
- 显示居中搜索框。
- 支持关键词、BV 号、av 号和纯数字视频号搜索。
- 支持自定义背景颜色和背景图片。

### 视频页

- 隐藏右侧相关推荐、播放列表推荐和播放结束推荐。
- 默认播放器模式支持：常规、宽屏、网页全屏、全屏。
- 可选择在视频开始播放后再应用播放器模式。

## 设置

油猴菜单 → **SMOS · Bilibili**：

| 设置 | 说明 |
|------|------|
| 设置背景颜色 | 修改首页背景颜色 |
| 设置背景图片 URL | 修改首页背景图片 |
| 隐藏视频推荐 | 开关视频页相关推荐隐藏 |
| 默认播放器模式 | 循环切换播放器模式 |
| 播放时再应用模式 | 是否等待视频播放后切换 |

## 文件

- `smos-bilibili.user.js` — 油猴脚本。
- `assert/b学首页.png` — 首页效果截图。

## SMOS 其它版本

- [SMOS · Bilibili](https://github.com/mintonight/smos/tree/main/smos-bilibili)
- [SMOS · Douyin](https://github.com/mintonight/smos/tree/main/smos-douyin)
- [SMOS · Zhihu](https://github.com/mintonight/smos/tree/main/smos-zhihu)
- [SMOS · Xiaohongshu](https://github.com/mintonight/smos/tree/main/smos-xiaohongshu)

## License

MIT
