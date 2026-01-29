<div align="center">

# 小红书 MCP 服务器

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**中文** | [English](./README.en.md)

小红书 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器，让 AI 助手能够搜索、浏览、发布和互动小红书内容。

**v2.0: 多账号支持 + SQLite 数据库存储**

[完整文档](https://shunl12324.github.io/xhs-mcp/) · [问题反馈](https://github.com/ShunL12324/xhs-mcp/issues)

</div>

---

## 功能特性

- **多账号管理** - 账号池、并发保护、会话持久化
- **内容查询** - 搜索笔记、获取详情、用户资料、首页推荐
- **内容发布** - 图文/视频笔记、定时发布
- **互动功能** - 点赞、收藏、评论、回复
- **数据统计** - 操作日志、成功率追踪
- **反检测** - Stealth 脚本、人类模拟滚动、webId 绕过

## 快速开始

### 安装到 MCP 客户端

<details>
<summary><b>Claude Desktop</b></summary>

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Claude Code</b></summary>

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Cursor / Cline / 其他</b></summary>

在 MCP 设置中添加相同配置：

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp"]
    }
  }
}
```
</details>

> 详细配置说明请查看 [安装文档](https://shunl12324.github.io/xhs-mcp/guide/installation)

### 登录

```
1. 调用 xhs_add_account({ name: "我的账号" })
2. 扫描弹出的二维码（或访问返回的远程URL）
3. 完成！会话自动保存
```

## 可用工具

| 类别 | 工具 |
|------|------|
| 账号管理 | `xhs_list_accounts`, `xhs_add_account`, `xhs_remove_account`, `xhs_set_account_config` |
| 内容查询 | `xhs_search`, `xhs_get_note`, `xhs_user_profile`, `xhs_list_feeds` |
| 内容发布 | `xhs_publish_content`, `xhs_publish_video` |
| 互动功能 | `xhs_like_feed`, `xhs_favorite_feed`, `xhs_post_comment`, `xhs_reply_comment` |
| 数据统计 | `xhs_get_account_stats`, `xhs_get_operation_logs` |
| 下载 | `xhs_download_images`, `xhs_download_video` |
| 认证 | `xhs_check_login`, `xhs_delete_cookies` |

> 详细 API 文档请访问 [完整文档](https://shunl12324.github.io/xhs-mcp/api/)

## 多账号操作

```javascript
// 单账号
xhs_search({ keyword: "美食", account: "主账号" })

// 多账号同时操作
xhs_like_feed({ noteId: "xxx", xsecToken: "yyy", accounts: ["账号1", "账号2"] })

// 所有活跃账号
xhs_publish_content({ title: "...", content: "...", images: [...], accounts: "all" })
```

## 开发

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
bun install
bun run dev      # 开发模式
bun run build    # 构建
```

## 致谢

- [xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) - Go 语言实现，本项目的发布和互动功能参考了其优秀工作

## 许可证

MIT
