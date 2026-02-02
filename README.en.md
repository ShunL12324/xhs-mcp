<div align="center">

# Xiaohongshu MCP Server

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![Downloads](https://img.shields.io/npm/dm/@sillyl12324/xhs-mcp?style=flat-square&color=blue)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[中文](./README.md) | **English**

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Xiaohongshu (小红书/RedNote), enabling AI assistants to search, browse, publish, and interact with content.

[Documentation](https://shunl12324.github.io/xhs-mcp/en/) · [Issues](https://github.com/ShunL12324/xhs-mcp/issues)

</div>

---

## Features

### Multi-Account Management

Account pool management with multiple simultaneous logins. Session persistence across restarts. Built-in concurrent operation protection.

| Tool | Description |
|------|-------------|
| `xhs_add_account` | Start login flow, returns QR code URL |
| `xhs_check_login_session` | Check login status (call after QR scan) |
| `xhs_submit_verification` | Submit SMS verification code |
| `xhs_list_accounts` | List all accounts with status |
| `xhs_check_auth_status` | Check if account is logged in |
| `xhs_remove_account` | Remove an account |
| `xhs_set_account_config` | Update account config (name, proxy, status) |
| `xhs_get_account_prompt` | Get account prompt (persona/select/comment) |
| `xhs_set_account_prompt` | Update account prompt |
| `xhs_delete_cookies` | Clear account session |

### Content Query

Keyword search with sorting and filtering options. Get note details including images, comments, and engagement data. View user profiles and published notes.

| Tool | Description |
|------|-------------|
| `xhs_search` | Search notes with sorting and filters |
| `xhs_get_note` | Get note details and comments |
| `xhs_user_profile` | Get user profile and notes |
| `xhs_list_feeds` | Get homepage recommendations |

### Publishing

Publish image/video notes with multiple images, topic tags, and cover settings. Supports scheduled publishing and multi-account batch publishing.

| Tool | Description |
|------|-------------|
| `xhs_publish_content` | Publish image/text note |
| `xhs_publish_video` | Publish video note |

### Interactions

Like, favorite, comment, and reply. Supports multi-account batch interactions.

| Tool | Description |
|------|-------------|
| `xhs_like_feed` | Like/unlike a note |
| `xhs_favorite_feed` | Favorite/unfavorite a note |
| `xhs_post_comment` | Post a comment |
| `xhs_reply_comment` | Reply to a comment |
| `xhs_like_comment` | Like/unlike a comment |

### AI Creation

AI-powered image generation pipeline that automatically creates Xiaohongshu-style images from screenshots (covers, annotated screenshots, text slides). Draft management system for saving and editing content.

| Tool | Description |
|------|-------------|
| `xhs_create_draft` | Create a note draft (AI auto-processes screenshots) |
| `xhs_list_drafts` | List all drafts |
| `xhs_get_draft` | Get draft details |
| `xhs_update_draft` | Update draft content |
| `xhs_delete_draft` | Delete a draft |
| `xhs_publish_draft` | Publish draft to Xiaohongshu |

### Creator Tools

Get published notes analytics (views, likes, favorites, comments). Notification management: comment alerts, likes, new followers.

| Tool | Description |
|------|-------------|
| `xhs_get_my_notes` | Get published notes list with analytics |
| `xhs_query_my_notes` | Query cached notes (multi-field filtering) |
| `xhs_get_notifications` | Get notifications (comments, likes, follows) |

### Auto Browse

AI-driven explore page browsing. Interest-based note selection with smart like targeting (post vs comment) and probability-controlled commenting.

| Tool | Description |
|------|-------------|
| `xhs_explore` | AI-driven auto browse explore page |

### Statistics

Operation logs and success rate analysis.

| Tool | Description |
|------|-------------|
| `xhs_get_account_stats` | Get account operation statistics |
| `xhs_get_operation_logs` | Query operation history |

### Download

| Tool | Description |
|------|-------------|
| `xhs_download_images` | Download note images |
| `xhs_download_video` | Download note video |

> Full API documentation at [Documentation](https://shunl12324.github.io/xhs-mcp/en/api/)

---

## Quick Start

### Installation

**Claude Code (Recommended)**

```bash
claude mcp add xhs -- npx -y @sillyl12324/xhs-mcp@latest
```

**Claude Desktop**

Edit configuration file:
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
<summary><b>Cursor / Cline / Other MCP Clients</b></summary>

Add the same configuration to MCP settings:

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

> For detailed setup instructions, see [Installation Guide](https://shunl12324.github.io/xhs-mcp/en/guide/installation)

### Login

```
1. Call xhs_add_account() → Get sessionId and QR code URL
2. Scan the QR code (or visit the returned qrCodeUrl)
3. Call xhs_check_login_session({ sessionId }) to check status
4. If SMS verification needed, call xhs_submit_verification({ sessionId, code })
5. Done! Session is saved to local database
```

---

## Multi-Account Operations

All operation tools support `account` (single) or `accounts` (multiple) parameters:

```javascript
// Single account
xhs_search({ keyword: "food", account: "main" })

// Multiple specific accounts
xhs_like_feed({ noteId: "xxx", xsecToken: "yyy", accounts: ["acc1", "acc2"] })

// All active accounts
xhs_publish_content({ title: "...", content: "...", images: [...], accounts: "all" })
```

If only one account exists and no `account` parameter is specified, it will be used automatically.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | - | Gemini API key (required for AI image generation) |
| `GEMINI_IMAGE_GENERATE_MODEL` | `gemini-3-pro-image` | Image generation model |
| `XHS_MCP_DATA_DIR` | `~/.xhs-mcp` | Data storage directory |
| `XHS_MCP_HEADLESS` | `true` | Use headless browser |
| `XHS_MCP_KEEP_OPEN` | `false` | Keep browser open after operation |
| `XHS_MCP_REQUEST_INTERVAL` | `2000` | Request interval (ms) |

---

## Data Storage

All data is stored in `~/.xhs-mcp/`:

```
~/.xhs-mcp/
├── data.db              # SQLite database (accounts, sessions, logs)
├── logs/
│   └── xhs-mcp.log      # Application log
└── downloads/
    ├── images/{noteId}/ # Downloaded images
    └── videos/{noteId}/ # Downloaded videos
```

---

## Development

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
bun install
bun run dev      # Development mode (watch)
bun run build    # Build
```

### Tech Stack

- **Runtime**: Bun / Node.js
- **Language**: TypeScript (ESNext, strict mode)
- **Browser Automation**: Playwright
- **Database**: SQLite (better-sqlite3)
- **MCP SDK**: @modelcontextprotocol/sdk
- **AI**: Google Gemini API

---

## Credits

- [xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) - Go implementation that inspired the publishing and interaction features

## Star History

<a href="https://star-history.com/#ShunL12324/xhs-mcp&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ShunL12324/xhs-mcp&type=Date" />
 </picture>
</a>

## License

MIT
