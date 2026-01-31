<div align="center">

# 小红书 MCP 服务器

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![Downloads](https://img.shields.io/npm/dm/@sillyl12324/xhs-mcp?style=flat-square&color=blue)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**中文** | [English](./README.en.md)

小红书 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器，让 AI 助手能够搜索、浏览、发布和互动小红书内容。

[完整文档](https://shunl12324.github.io/xhs-mcp/) · [问题反馈](https://github.com/ShunL12324/xhs-mcp/issues)

</div>

---

## 功能概览

### 多账号管理

账号池管理，支持同时登录多个账号。会话持久化存储，重启后无需重新登录。内置并发保护，防止同一账号同时操作冲突。

| 工具 | 说明 |
|------|------|
| `xhs_add_account` | 开始登录流程，返回二维码 URL |
| `xhs_check_login_session` | 检查登录状态（扫码后调用） |
| `xhs_submit_verification` | 提交短信验证码 |
| `xhs_list_accounts` | 列出所有账号及状态 |
| `xhs_check_auth_status` | 检查账号是否已登录 |
| `xhs_remove_account` | 删除账号 |
| `xhs_set_account_config` | 修改账号配置（名称、代理、状态） |
| `xhs_get_account_prompt` | 获取账号 Prompt（人设/选择/评论） |
| `xhs_set_account_prompt` | 更新账号 Prompt |
| `xhs_delete_cookies` | 清除账号会话 |

### 内容查询

关键词搜索，支持多种排序和筛选条件。获取笔记详情，包括图片、评论、互动数据。查看用户资料和发布的笔记列表。

| 工具 | 说明 |
|------|------|
| `xhs_search` | 搜索笔记，支持排序和筛选 |
| `xhs_get_note` | 获取笔记详情和评论 |
| `xhs_user_profile` | 获取用户资料和笔记列表 |
| `xhs_list_feeds` | 获取首页推荐 |

### 内容发布

发布图文/视频笔记，支持多图、话题标签、封面设置。支持定时发布和多账号批量发布。

| 工具 | 说明 |
|------|------|
| `xhs_publish_content` | 发布图文笔记 |
| `xhs_publish_video` | 发布视频笔记 |

### 互动功能

点赞、收藏、评论、回复，支持多账号批量互动。

| 工具 | 说明 |
|------|------|
| `xhs_like_feed` | 点赞/取消点赞笔记 |
| `xhs_favorite_feed` | 收藏/取消收藏笔记 |
| `xhs_post_comment` | 发表评论 |
| `xhs_reply_comment` | 回复评论 |
| `xhs_like_comment` | 点赞/取消点赞评论 |

### AI 创作

Gemini AI 图片生成，支持多种风格参数（构图、光线、色调、氛围）。草稿管理系统，保存和编辑创作内容。

| 工具 | 说明 |
|------|------|
| `xhs_generate_image` | AI 生成图片（Gemini） |
| `xhs_create_draft` | 创建笔记草稿 |
| `xhs_list_drafts` | 列出所有草稿 |
| `xhs_get_draft` | 获取草稿详情 |
| `xhs_update_draft` | 更新草稿内容 |
| `xhs_delete_draft` | 删除草稿 |
| `xhs_publish_draft` | 发布草稿到小红书 |

### 创作者工具

获取已发布笔记的数据统计（浏览、点赞、收藏、评论）。通知管理：评论提醒、点赞通知、新增关注。

| 工具 | 说明 |
|------|------|
| `xhs_get_my_notes` | 获取已发布笔记列表和数据 |
| `xhs_query_my_notes` | 查询已缓存的笔记（支持多条件筛选） |
| `xhs_get_notifications` | 获取通知（评论、点赞、关注） |

### 自动浏览

AI 驱动的探索页自动浏览，根据兴趣关键词智能选择笔记，概率控制的点赞和评论行为。

| 工具 | 说明 |
|------|------|
| `xhs_explore` | AI 驱动的自动浏览探索页 |

### 数据统计

操作日志查询和成功率分析。

| 工具 | 说明 |
|------|------|
| `xhs_get_account_stats` | 获取账号操作统计 |
| `xhs_get_operation_logs` | 查询操作历史日志 |

### 下载

| 工具 | 说明 |
|------|------|
| `xhs_download_images` | 下载笔记图片 |
| `xhs_download_video` | 下载笔记视频 |

> 详细 API 文档请访问 [完整文档](https://shunl12324.github.io/xhs-mcp/api/)

---

## 快速开始

### 安装

**Claude Code（推荐）**

```bash
claude mcp add xhs -- npx -y @sillyl12324/xhs-mcp@latest
```

**Claude Desktop**

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp@latest"]
    }
  }
}
```

<details>
<summary><b>Cursor / Cline / 其他 MCP 客户端</b></summary>

在 MCP 设置中添加相同配置：

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp@latest"]
    }
  }
}
```

</details>

> 详细配置说明请查看 [安装文档](https://shunl12324.github.io/xhs-mcp/guide/installation)

### 登录

```
1. 调用 xhs_add_account() → 获取 sessionId 和二维码 URL
2. 扫描二维码（或访问返回的 qrCodeUrl）
3. 调用 xhs_check_login_session({ sessionId }) 检查状态
4. 如需短信验证，调用 xhs_submit_verification({ sessionId, code })
5. 完成！会话自动保存到本地数据库
```

---

## 多账号操作

所有操作工具都支持 `account`（单账号）或 `accounts`（多账号）参数：

```javascript
// 单账号操作
xhs_search({ keyword: "美食", account: "主账号" })

// 指定多个账号同时操作
xhs_like_feed({ noteId: "xxx", xsecToken: "yyy", accounts: ["账号1", "账号2"] })

// 所有活跃账号同时操作
xhs_publish_content({ title: "...", content: "...", images: [...], accounts: "all" })
```

如果只有一个账号且未指定 `account` 参数，会自动使用该账号。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GEMINI_API_KEY` | - | Gemini API 密钥（AI 图片生成必需） |
| `GEMINI_IMAGE_GENERATE_MODEL` | `gemini-3-pro-image` | 图片生成模型 |
| `XHS_MCP_DATA_DIR` | `~/.xhs-mcp` | 数据存储目录 |
| `XHS_MCP_HEADLESS` | `true` | 是否使用无头浏览器 |
| `XHS_MCP_KEEP_OPEN` | `false` | 操作完成后保持浏览器打开 |
| `XHS_MCP_REQUEST_INTERVAL` | `2000` | 请求间隔（毫秒） |

---

## 数据存储

所有数据存储在 `~/.xhs-mcp/` 目录：

```
~/.xhs-mcp/
├── data.db              # SQLite 数据库（账号、会话、日志）
├── logs/
│   └── xhs-mcp.log      # 应用日志
└── downloads/
    ├── images/{noteId}/ # 下载的图片
    └── videos/{noteId}/ # 下载的视频
```

---

## 开发

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
bun install
bun run dev      # 开发模式（watch）
bun run build    # 构建
```

### 技术栈

- **运行时**: Bun / Node.js
- **语言**: TypeScript (ESNext, strict mode)
- **浏览器自动化**: Playwright
- **数据库**: SQLite (better-sqlite3)
- **MCP SDK**: @modelcontextprotocol/sdk
- **AI**: Google Gemini API

---

## 致谢

- [xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) - Go 语言实现，本项目的发布和互动功能参考了其优秀工作

## Star History

<a href="https://star-history.com/#ShunL12324/xhs-mcp&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date" />
 </picture>
</a>

## 许可证

MIT
