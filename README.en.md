<div align="center">

# Xiaohongshu MCP Server

[![npm version](https://img.shields.io/npm/v/@sillyl12324/xhs-mcp?style=flat-square&color=CB3837&logo=npm)](https://www.npmjs.com/package/@sillyl12324/xhs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-8B5CF6?style=flat-square)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[中文](./README.md) | **English**

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Xiaohongshu (小红书/RedNote), enabling AI assistants to search, browse, publish, and interact with content.

**v2.0: Multi-account support + SQLite database storage**

[Documentation](https://shunl12324.github.io/xhs-mcp/en/) · [Issues](https://github.com/ShunL12324/xhs-mcp/issues)

</div>

---

## Features

- **Multi-Account** - Account pool, concurrent protection, session persistence
- **Content Query** - Search notes, get details, user profiles, homepage feeds
- **Publishing** - Image/video notes, scheduled posting
- **Interactions** - Like, favorite, comment, reply
- **Statistics** - Operation logs, success rate tracking
- **Anti-Detection** - Stealth scripts, human-like scrolling, webId bypass

## Quick Start

### Install to MCP Client

<details>
<summary><b>Claude Desktop</b></summary>

Edit configuration file:
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

Create `.mcp.json` in your project root:

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
<summary><b>Cursor / Cline / Others</b></summary>

Add the same configuration to MCP settings:

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

> For detailed setup instructions, see [Installation Guide](https://shunl12324.github.io/xhs-mcp/en/guide/installation)

### Login

```
1. Call xhs_add_account({ name: "my-account" })
2. Scan the QR code (or visit the returned remote URL)
3. Done! Session is saved automatically
```

## Available Tools

| Category | Tools |
|----------|-------|
| Account | `xhs_list_accounts`, `xhs_add_account`, `xhs_remove_account`, `xhs_set_account_config` |
| Content | `xhs_search`, `xhs_get_note`, `xhs_user_profile`, `xhs_list_feeds` |
| Publish | `xhs_publish_content`, `xhs_publish_video` |
| Interact | `xhs_like_feed`, `xhs_favorite_feed`, `xhs_post_comment`, `xhs_reply_comment` |
| Stats | `xhs_get_account_stats`, `xhs_get_operation_logs` |
| Download | `xhs_download_images`, `xhs_download_video` |
| Auth | `xhs_check_login`, `xhs_delete_cookies` |

> Full API documentation at [Documentation](https://shunl12324.github.io/xhs-mcp/en/api/)

## Multi-Account Operations

```javascript
// Single account
xhs_search({ keyword: "food", account: "main" })

// Multiple accounts
xhs_like_feed({ noteId: "xxx", xsecToken: "yyy", accounts: ["acc1", "acc2"] })

// All active accounts
xhs_publish_content({ title: "...", content: "...", images: [...], accounts: "all" })
```

## Development

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
bun install
bun run dev      # Development mode
bun run build    # Build
```

## Credits

- [xpzouying/xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) - Go implementation that inspired the publishing and interaction features

## License

MIT
