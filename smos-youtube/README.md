# SMOS · YouTube

SMOS（Social Media Only Search）是一个减少信息流干扰的油猴脚本系列。

本仓库是 SMOS 的 YouTube 版本：保留 YouTube 顶部导航，隐藏首页推荐网格，在内容区中央提供搜索框。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 使用下方链接安装脚本：

**GitHub Raw（推荐）**

https://raw.githubusercontent.com/mintonight/smos/main/smos-youtube/smos-youtube.user.js

**jsDelivr**

https://cdn.jsdelivr.net/gh/mintonight/smos/smos-youtube/smos-youtube.user.js

3. 打开 https://www.youtube.com/。

## 功能

- 支持 YouTube 首页与 Shorts（`/`、`/shorts/*`）。
- 保留 YouTube 顶部 masthead 与左侧导航。
- 隐藏首页推荐网格与 Shorts 视频流。
- 在内容区显示中央搜索框。
- 搜索后进入 YouTube 原生搜索结果页。
- 不处理观看页、搜索结果、订阅、频道、播放列表等页面。
- 适配亮色 / 深色主题。

## 设置

油猴菜单 → **SMOS · YouTube**：

| 设置 | 说明 |
|------|------|
| SMOS · YouTube：已开启（点击关闭） | 开关本平台脚本，关闭前会确认 |

## 文件

- `smos-youtube.user.js` — 油猴脚本。

## SMOS 其它版本

- [SMOS · Bilibili](https://github.com/mintonight/smos/tree/main/smos-bilibili)
- [SMOS · Douyin](https://github.com/mintonight/smos/tree/main/smos-douyin)
- [SMOS · Zhihu](https://github.com/mintonight/smos/tree/main/smos-zhihu)
- [SMOS · Xiaohongshu](https://github.com/mintonight/smos/tree/main/smos-xiaohongshu)
- [SMOS · X](https://github.com/mintonight/smos/tree/main/smos-x)

## License

MIT
