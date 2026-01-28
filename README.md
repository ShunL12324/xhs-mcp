<div align="center">

# Xiaohongshu MCP Server

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![Playwright](https://img.shields.io/badge/Playwright-1.57+-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**English** | [中文](#中文文档)

A Model Context Protocol (MCP) server for [Xiaohongshu](https://www.xiaohongshu.com) (小红书/RedNote), enabling AI assistants to search, browse, publish, and interact with content on the platform.

</div>

---

## Features

| Category | Features |
|----------|----------|
| **Content Query** | Search notes with filters, get note details with comments, user profiles, homepage feeds |
| **Publishing** | Publish image/text notes, publish video notes with scheduled posting support |
| **Interaction** | Like/unlike, favorite/unfavorite, post comments, reply to comments |
| **Authentication** | QR code login, session persistence, cookie management |
| **Transport** | Stdio (default) and HTTP (StreamableHTTP) transport modes |
| **Anti-Detection** | Stealth script injection, human-like scrolling, webId bypass |

## Quick Start

### Using npx (Recommended)

No installation required - run directly:

```bash
npx @sillyl12324/xhs-mcp
```

### Global Installation

```bash
npm install -g @sillyl12324/xhs-mcp

# Then run
xhs-mcp
```

### From Source

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop / Claude Code

Add to your MCP client configuration (`~/.claude/settings.json` or Claude Desktop config):

**Using npx (no installation needed):**

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

**Using global installation:**

```json
{
  "mcpServers": {
    "xhs": {
      "command": "xhs-mcp"
    }
  }
}
```

**Using local installation:**

```json
{
  "mcpServers": {
    "xhs": {
      "command": "node",
      "args": ["/path/to/xhs-mcp/dist/index.js"]
    }
  }
}
```

### HTTP Mode

For web-based clients or custom integrations:

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp", "--http", "--port", "18060"]
    }
  }
}
```

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `xhs_check_login` | Check current login status |
| `xhs_login` | Login via QR code (opens visible browser) |
| `xhs_delete_cookies` | Delete saved session for re-authentication |

### Content Query

| Tool | Description |
|------|-------------|
| `xhs_search` | Search notes with keyword and filters |
| `xhs_get_note` | Get note details including comments |
| `xhs_user_profile` | Get user profile and published notes |
| `xhs_list_feeds` | Get homepage recommended feeds |

### Publishing

| Tool | Description |
|------|-------------|
| `xhs_publish_content` | Publish image/text note |
| `xhs_publish_video` | Publish video note |

### Interaction

| Tool | Description |
|------|-------------|
| `xhs_like_feed` | Like or unlike a note |
| `xhs_favorite_feed` | Favorite or unfavorite a note |
| `xhs_post_comment` | Post a comment on a note |
| `xhs_reply_comment` | Reply to an existing comment |

### Search Filters

The `xhs_search` tool supports the following filter parameters:

| Parameter | Options |
|-----------|---------|
| `sortBy` | `general`, `latest`, `most_liked`, `most_commented`, `most_collected` |
| `noteType` | `all`, `video`, `image` |
| `publishTime` | `all`, `day`, `week`, `half_year` |
| `searchScope` | `all`, `viewed`, `not_viewed`, `following` |

## Usage Examples

### Login Flow

```
1. Call xhs_check_login to verify status
2. If not logged in, call xhs_login
3. Scan the QR code with Xiaohongshu mobile app
4. Session is automatically saved for future use
```

### Search with Filters

```json
{
  "keyword": "travel",
  "count": 50,
  "sortBy": "latest",
  "noteType": "video",
  "publishTime": "week"
}
```

### Publish Content

```json
{
  "title": "My Travel Story",
  "content": "Amazing experience at...",
  "images": ["/path/to/image1.jpg", "/path/to/image2.jpg"],
  "tags": ["travel", "photography"]
}
```

## Development

```bash
# Development with hot reload
bun run dev

# Build
bun run build

# Run in stdio mode
bun run start

# Run in HTTP mode
bun run start:http

# Test scripts
bun run test:login
bun run test:search <keyword>
bun run test:note <noteId>
```

## Architecture

```
src/
├── index.ts              # Entry point (stdio/http switch)
├── server.ts             # MCP server configuration
├── http-server.ts        # HTTP transport (Hono + StreamableHTTP)
├── tools/
│   ├── auth.ts           # Authentication tools
│   ├── content.ts        # Content query tools
│   ├── publish.ts        # Publishing tools
│   └── interaction.ts    # Interaction tools
└── xhs/
    ├── index.ts          # XhsClient facade
    ├── types.ts          # TypeScript interfaces
    ├── clients/
    │   └── browser.ts    # Playwright automation
    └── utils/
        ├── index.ts      # Utilities
        └── stealth.js    # Anti-detection script
```

## Technical Details

### Anti-Detection

- Stealth script injection to bypass automation detection
- WebId cookie generation to bypass slider verification
- Human-like scrolling with easing functions and random delays
- Random mouse movements and occasional scroll-back behavior
- Custom User-Agent matching Playwright's Chrome version

### Session Persistence

Login state is saved to `xhs-state.json` and automatically restored on restart. Use `xhs_delete_cookies` to clear the session.

### Data Extraction

Content is extracted from `window.__INITIAL_STATE__` (Vue state) rather than API calls, ensuring reliability and avoiding rate limits.

## Credits

This implementation is inspired by and references:

- **[xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)** - Go implementation of Xiaohongshu MCP server. The publishing, interaction, and comment features in this TypeScript version are based on their excellent work.

## License

MIT

---

<div align="center">

# 中文文档

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![Playwright](https://img.shields.io/badge/Playwright-1.57+-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[English](#xiaohongshu-mcp-server) | **中文**

小红书 MCP 服务器 - 让 AI 助手能够搜索、浏览、发布和互动小红书内容

</div>

---

## 功能特性

| 类别 | 功能 |
|------|------|
| **内容查询** | 带过滤器的笔记搜索、获取笔记详情和评论、用户资料、首页推荐 |
| **内容发布** | 发布图文笔记、发布视频笔记、支持定时发布 |
| **互动功能** | 点赞/取消点赞、收藏/取消收藏、发表评论、回复评论 |
| **身份认证** | 二维码登录、会话持久化、Cookie 管理 |
| **传输模式** | 标准输入输出 (stdio) 和 HTTP (StreamableHTTP) 双模式 |
| **反检测** | Stealth 脚本注入、人类模拟滚动、webId 绕过验证 |

## 快速开始

### 使用 npx（推荐）

无需安装，直接运行：

```bash
npx @sillyl12324/xhs-mcp
```

### 全局安装

```bash
npm install -g @sillyl12324/xhs-mcp

# 然后运行
xhs-mcp
```

### 从源码安装

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
npm install
npm run build
```

## 配置

### Claude Desktop / Claude Code

在 MCP 客户端配置中添加（`~/.claude/settings.json` 或 Claude Desktop 配置）：

**使用 npx（无需安装）：**

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

**使用全局安装：**

```json
{
  "mcpServers": {
    "xhs": {
      "command": "xhs-mcp"
    }
  }
}
```

**使用本地安装：**

```json
{
  "mcpServers": {
    "xhs": {
      "command": "node",
      "args": ["/path/to/xhs-mcp/dist/index.js"]
    }
  }
}
```

### HTTP 模式

用于 Web 客户端或自定义集成：

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp", "--http", "--port", "18060"]
    }
  }
}
```

## 可用工具

### 身份认证

| 工具 | 描述 |
|------|------|
| `xhs_check_login` | 检查当前登录状态 |
| `xhs_login` | 通过二维码登录（打开可见浏览器） |
| `xhs_delete_cookies` | 删除已保存的会话以重新认证 |

### 内容查询

| 工具 | 描述 |
|------|------|
| `xhs_search` | 使用关键词和过滤器搜索笔记 |
| `xhs_get_note` | 获取笔记详情，包含评论 |
| `xhs_user_profile` | 获取用户资料和发布的笔记 |
| `xhs_list_feeds` | 获取首页推荐内容 |

### 内容发布

| 工具 | 描述 |
|------|------|
| `xhs_publish_content` | 发布图文笔记 |
| `xhs_publish_video` | 发布视频笔记 |

### 互动功能

| 工具 | 描述 |
|------|------|
| `xhs_like_feed` | 点赞或取消点赞笔记 |
| `xhs_favorite_feed` | 收藏或取消收藏笔记 |
| `xhs_post_comment` | 在笔记下发表评论 |
| `xhs_reply_comment` | 回复已有评论 |

### 搜索过滤器

`xhs_search` 工具支持以下过滤参数：

| 参数 | 选项 |
|------|------|
| `sortBy` | `general` (综合), `latest` (最新), `most_liked` (最多点赞), `most_commented` (最多评论), `most_collected` (最多收藏) |
| `noteType` | `all` (不限), `video` (视频), `image` (图文) |
| `publishTime` | `all` (不限), `day` (一天内), `week` (一周内), `half_year` (半年内) |
| `searchScope` | `all` (不限), `viewed` (已看过), `not_viewed` (未看过), `following` (已关注) |

## 使用示例

### 登录流程

```
1. 调用 xhs_check_login 验证状态
2. 如未登录，调用 xhs_login
3. 使用小红书 App 扫描二维码
4. 会话自动保存供后续使用
```

### 带过滤器搜索

```json
{
  "keyword": "旅行",
  "count": 50,
  "sortBy": "latest",
  "noteType": "video",
  "publishTime": "week"
}
```

### 发布内容

```json
{
  "title": "我的旅行故事",
  "content": "在...的美好体验",
  "images": ["/path/to/image1.jpg", "/path/to/image2.jpg"],
  "tags": ["旅行", "摄影"]
}
```

## 开发

```bash
# 开发模式（热重载）
bun run dev

# 构建
bun run build

# 以 stdio 模式运行
bun run start

# 以 HTTP 模式运行
bun run start:http

# 测试脚本
bun run test:login
bun run test:search <关键词>
bun run test:note <笔记ID>
```

## 架构

```
src/
├── index.ts              # 入口点（stdio/http 切换）
├── server.ts             # MCP 服务器配置
├── http-server.ts        # HTTP 传输（Hono + StreamableHTTP）
├── tools/
│   ├── auth.ts           # 认证工具
│   ├── content.ts        # 内容查询工具
│   ├── publish.ts        # 发布工具
│   └── interaction.ts    # 互动工具
└── xhs/
    ├── index.ts          # XhsClient 门面类
    ├── types.ts          # TypeScript 接口
    ├── clients/
    │   └── browser.ts    # Playwright 自动化
    └── utils/
        ├── index.ts      # 工具函数
        └── stealth.js    # 反检测脚本
```

## 技术细节

### 反检测措施

- Stealth 脚本注入绕过自动化检测
- WebId Cookie 生成绕过滑块验证
- 带缓动函数的人类模拟滚动和随机延迟
- 随机鼠标移动和偶尔的回滚行为
- 自定义 User-Agent 匹配 Playwright Chrome 版本

### 会话持久化

登录状态保存在 `xhs-state.json` 文件中，重启后自动恢复。使用 `xhs_delete_cookies` 清除会话。

### 数据提取

内容从 `window.__INITIAL_STATE__`（Vue 状态）提取，而非 API 调用，确保可靠性并避免速率限制。

## 致谢

本实现参考了以下优秀项目：

- **[xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)** - 小红书 MCP 服务器的 Go 语言实现。本 TypeScript 版本中的发布、互动和评论功能均基于其出色的工作。

## 许可证

MIT
