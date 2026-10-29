# SMOS · Douyin

SMOS（Social Media Only Search）是一个减少信息流干扰的油猴脚本系列。

本仓库是 SMOS 的抖音版本：保留抖音原生顶栏和左侧导航，在精选页和推荐页内容区显示居中搜索框。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 使用下方链接安装脚本：

**GitHub Raw（推荐）**

https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js

**jsDelivr**

https://cdn.jsdelivr.net/gh/mintonight/smos/smos-douyin/smos-douyin.user.js

3. 打开以下页面：

   - https://www.douyin.com/jingxuan
   - `https://www.douyin.com/?recommend=*`

## 功能

- 保留抖音原生顶栏和侧栏。
- 隐藏精选页、推荐页信息流。
- 进入页面后自动静音并暂停视频/音频，避免突然外放。
- 自动跟随页面亮/暗主题调整搜索框配色。
- 在内容区显示中央搜索框。
- 搜索后进入 `/search/关键词` 结果页。
- 不处理视频详情页和搜索结果页。

## 设置

油猴菜单 → **SMOS · Douyin**：

| 设置 | 说明 |
|------|------|
| SMOS · 抖音：已开启（点击关闭） | 开关本平台脚本，关闭前会确认 |
| 设置背景颜色 | 修改搜索页背景颜色 |
| 设置背景图片 URL | 修改背景图片（留空清除） |
| 恢复默认背景 | 恢复默认背景颜色与图片 |

## 文件

- `smos-douyin.user.js` — 油猴脚本。

## SMOS 其它版本

- [SMOS · Bilibili](https://github.com/mintonight/smos/tree/main/smos-bilibili)
- [SMOS · Douyin](https://github.com/mintonight/smos/tree/main/smos-douyin)
- [SMOS · Zhihu](https://github.com/mintonight/smos/tree/main/smos-zhihu)
- [SMOS · Xiaohongshu](https://github.com/mintonight/smos/tree/main/smos-xiaohongshu)

## License

MIT
