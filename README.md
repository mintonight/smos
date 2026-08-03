# SMOS

SMOS（Social Media Only Search）是一组把社交媒体首页变成“仅搜索”界面的油猴脚本。

## 平台脚本

| 平台 | 支持页面 | 脚本 |
| --- | --- | --- |
| Bilibili | `/`、视频/番剧等内容页 | [`smos-bilibili`](./smos-bilibili) |
| Douyin | `/jingxuan`、`/?recommend=*` | [`smos-douyin`](./smos-douyin) |
| Zhihu | `/`、`/explore` | [`smos-zhihu`](./smos-zhihu) |
| Xiaohongshu | `/`、`/explore` | [`smos-xiaohongshu`](./smos-xiaohongshu) |

## 安装

先安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey，再选择对应平台的安装地址：

- Bilibili：[Raw](https://raw.githubusercontent.com/mintonight/smos/main/smos-bilibili/smos-bilibili.user.js) · [jsDelivr](https://cdn.jsdelivr.net/gh/mintonight/smos/smos-bilibili/smos-bilibili.user.js)
- Douyin：[Raw](https://raw.githubusercontent.com/mintonight/smos/main/smos-douyin/smos-douyin.user.js) · [jsDelivr](https://cdn.jsdelivr.net/gh/mintonight/smos/smos-douyin/smos-douyin.user.js)
- Zhihu：[Raw](https://raw.githubusercontent.com/mintonight/smos/main/smos-zhihu/smos-zhihu.user.js) · [jsDelivr](https://cdn.jsdelivr.net/gh/mintonight/smos/smos-zhihu/smos-zhihu.user.js)
- Xiaohongshu：[Raw](https://raw.githubusercontent.com/mintonight/smos/main/smos-xiaohongshu/smos-xiaohongshu.user.js) · [jsDelivr](https://cdn.jsdelivr.net/gh/mintonight/smos/smos-xiaohongshu/smos-xiaohongshu.user.js)

## 功能

- 保留平台原生顶栏、侧栏和导航。
- 隐藏首页推荐流，只显示可聚焦的中央搜索框。
- 使用平台原生搜索结果页，不处理详情页。
- Bilibili 保留播放器模式、背景设置等原有功能。

## 目录

每个平台目录都包含独立的油猴脚本、README 和 MIT License，不引入共享依赖。

## License

MIT
