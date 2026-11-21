# SMOS · X

SMOS（Social Media Only Search）是一个减少信息流干扰的油猴脚本系列。

本仓库是 SMOS 的 X（原 Twitter）版本：保留 X 首页的左侧导航，隐藏时间线，在内容区中央提供搜索框。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 使用下方链接安装脚本：

**GitHub Raw（推荐）**

https://raw.githubusercontent.com/mintonight/smos/main/smos-x/smos-x.user.js

**jsDelivr**

https://cdn.jsdelivr.net/gh/mintonight/smos/smos-x/smos-x.user.js

3. 打开 https://x.com/ 或 https://x.com/home。

## 功能

- 支持 X 首页（`/`、`/home`）。
- 保留 X 原生左侧导航。
- 隐藏首页时间线、右侧栏和推荐内容。
- 在内容区显示中央搜索框。
- 搜索后进入 X 原生搜索页。
- 不处理搜索、通知、私信、个人主页、帖子详情等页面。
- 适配亮色 / 深色主题。

## 设置

油猴菜单 → **SMOS · X**：

| 设置 | 说明 |
|------|------|
| SMOS · X：已开启（点击关闭） | 开关本平台脚本，关闭前会确认 |

## 文件

- `smos-x.user.js` — 油猴脚本。

## SMOS 其它版本

- [SMOS · Bilibili](https://github.com/mintonight/smos/tree/main/smos-bilibili)
- [SMOS · Douyin](https://github.com/mintonight/smos/tree/main/smos-douyin)
- [SMOS · Zhihu](https://github.com/mintonight/smos/tree/main/smos-zhihu)
- [SMOS · Xiaohongshu](https://github.com/mintonight/smos/tree/main/smos-xiaohongshu)
- [SMOS · YouTube](https://github.com/mintonight/smos/tree/main/smos-youtube)

## License

MIT
