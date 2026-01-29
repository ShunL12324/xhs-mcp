# 简介

小红书 MCP 服务器是一个基于 [Model Context Protocol](https://modelcontextprotocol.io/) 的自动化工具，让 AI 助手（如 Claude）能够直接操作小红书平台。

## 主要功能

- **多账号管理** - 支持多个账号同时登录和操作
- **内容查询** - 搜索笔记、获取详情、查看用户资料
- **内容发布** - 发布图文和视频笔记
- **互动功能** - 点赞、收藏、评论、回复
- **数据统计** - 记录操作日志和成功率

## 技术特点

- 基于 Playwright 的浏览器自动化
- SQLite 数据库存储会话和日志
- 支持 stdio 和 HTTP 两种传输模式

## 下一步

- [安装指南](/guide/installation) - 安装和配置 MCP 服务器
- [快速开始](/guide/quick-start) - 5 分钟上手使用
- [API 文档](/api/) - 查看所有可用工具
