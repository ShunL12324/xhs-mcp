# Xiaohongshu MCP Server

## Project Overview

A Model Context Protocol (MCP) server that provides tools for interacting with Xiaohongshu (小红书/RedNote). Uses Playwright for browser automation with anti-detection measures. **Version 2.0 adds multi-account support with SQLite database storage.**

## Tech Stack

- **Runtime**: Bun (also compatible with Node.js)
- **Language**: TypeScript (ESNext, strict mode)
- **Browser Automation**: Playwright
- **HTTP Framework**: Hono (for HTTP transport mode)
- **Database**: SQLite (better-sqlite3)
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod v4

## Project Structure

```
~/.xhs-mcp/                   # Data directory
├── data.db                   # SQLite database (accounts, logs, etc.)
└── downloads/
    ├── images/{noteId}/
    └── videos/{noteId}/

src/
├── index.ts                  # Entry point with stdio/http mode switch
├── server.ts                 # MCP Server configuration and tool registration
├── http-server.ts            # HTTP transport server (StreamableHTTP)
├── core/
│   ├── paths.ts              # Path constants (~/.xhs-mcp)
│   ├── account-pool.ts       # Multi-account client pool
│   ├── account-lock.ts       # Concurrent access prevention
│   └── multi-account.ts      # Multi-account operation helpers
├── db/
│   ├── index.ts              # Database class (better-sqlite3)
│   └── schema.ts             # Table definitions
├── tools/
│   ├── account.ts            # xhs_list_accounts, xhs_add_account, xhs_remove_account, xhs_set_account_config
│   ├── auth.ts               # xhs_check_login (+account parameter)
│   ├── content.ts            # xhs_search, xhs_get_note, xhs_user_profile, xhs_list_feeds (+account parameter)
│   ├── publish.ts            # xhs_publish_content, xhs_publish_video (+account/accounts parameter)
│   ├── interaction.ts        # xhs_like_feed, xhs_favorite_feed, xhs_post_comment, xhs_reply_comment, xhs_delete_cookies (+account/accounts)
│   ├── stats.ts              # xhs_get_account_stats, xhs_get_operation_logs
│   └── download.ts           # xhs_download_images, xhs_download_video
└── xhs/
    ├── index.ts              # XhsClient facade class (supports account options)
    ├── types.ts              # TypeScript interfaces
    ├── clients/
    │   └── browser.ts        # BrowserClient - Playwright automation (supports state/proxy options)
    └── utils/
        ├── index.ts          # Utilities (sleep, humanScroll, generateWebId)
        └── stealth.js        # Anti-detection script
```

## Available MCP Tools

### Account Management (New in v2.0)
| Tool | Description |
|------|-------------|
| `xhs_list_accounts` | List all registered accounts with status |
| `xhs_add_account` | Add new account or re-login existing account via QR code URL |
| `xhs_remove_account` | Remove an account and its data |
| `xhs_set_account_config` | Update proxy or status for an account |

### Authentication
| Tool | Description |
|------|-------------|
| `xhs_check_login` | Check login status (supports `account` param) |
| `xhs_delete_cookies` | Delete session for an account |

### Headless Login with QR Code URL

Login operations now run in headless mode and return a temporary QR code URL:

1. Call `xhs_add_account` with the account name
2. The tool captures the QR code from the page (no local file saved)
3. Uploads to a temporary image hosting service (litterbox.catbox.moe or 0x0.st)
4. Returns the URL - scan from any device, including mobile
5. Waits for login completion and saves session to database

If the account already exists, `xhs_add_account` will trigger a re-login process.

This enables remote login without requiring visual access to the browser.

### Content Query
| Tool | Description |
|------|-------------|
| `xhs_search` | Search notes with filters (supports `account` param) |
| `xhs_get_note` | Get note details including comments |
| `xhs_user_profile` | Get user profile and published notes |
| `xhs_list_feeds` | Get homepage recommended feeds |

### Publishing
| Tool | Description |
|------|-------------|
| `xhs_publish_content` | Publish image/text note (supports `account`/`accounts` params) |
| `xhs_publish_video` | Publish video note (supports `account`/`accounts` params) |

### Interaction
| Tool | Description |
|------|-------------|
| `xhs_like_feed` | Like/unlike a note (supports `account`/`accounts` params) |
| `xhs_favorite_feed` | Favorite/unfavorite a note |
| `xhs_post_comment` | Post a comment on a note |
| `xhs_reply_comment` | Reply to a comment |

### Statistics (New in v2.0)
| Tool | Description |
|------|-------------|
| `xhs_get_account_stats` | Get operation statistics for an account |
| `xhs_get_operation_logs` | Query operation history |

### Download (New in v2.0)
| Tool | Description |
|------|-------------|
| `xhs_download_images` | Download all images from a note |
| `xhs_download_video` | Download video from a note |

## Multi-Account Usage

All operation tools support `account` (single) or `accounts` (multiple) parameters:

```typescript
// Single account
xhs_search({ keyword: "美食", account: "main" })

// Multiple accounts
xhs_like_feed({ noteId: "xxx", xsecToken: "yyy", accounts: ["acc-1", "acc-2"] })

// All active accounts
xhs_publish_content({ title: "...", content: "...", images: [...], accounts: "all" })
```

If no account is specified and only one account exists, it will be used automatically.

## Key Commands

```bash
# Development
bun run dev              # Watch mode with auto-reload

# Build
bun run build            # Build to dist/

# Run
bun run start            # Start MCP server (stdio transport)
bun run start:http       # Start MCP server (HTTP transport on port 18060)

# Testing
bun run test:login       # Test login flow
bun run test:search <keyword>  # Test search
bun run test:note <noteId>     # Test get note
```

## Transport Modes

### stdio (default)
Standard MCP stdio transport for use with Claude Desktop and other MCP clients.

```bash
bun run start
```

### HTTP (StreamableHTTP)
HTTP transport for web-based clients and custom integrations.

```bash
bun run start:http              # Default port 18060
bun run start:http --port 8080  # Custom port
```

Endpoints:
- `POST /mcp` - MCP protocol endpoint
- `GET /health` - Health check
- `GET /` - Server info

## Important Files

- `~/.xhs-mcp/data.db` - SQLite database with accounts, sessions, operation logs
- `~/.xhs-mcp/downloads/` - Downloaded images and videos
- `src/xhs/utils/stealth.js` - Anti-detection script, large file (~50k tokens)

## Database Schema

Key tables:
- `accounts` - Account info, proxy config, session state (JSON)
- `account_profiles` - Cached user profile info
- `operation_logs` - All operation history with timing and results
- `published_notes` - Record of published content
- `interactions` - Like/favorite/comment history
- `downloads` - Download records
- `config` - Key-value configuration

## Architecture Notes

1. **Multi-Account**: AccountPool manages multiple XhsClient instances, each with its own session
2. **Session Persistence**: Login state stored in SQLite database, loaded per-account
3. **Account Locking**: Prevents concurrent operations on the same account
4. **Operation Logging**: All operations are logged with timing and results
5. **Anti-Detection**:
   - Stealth script injection
   - Human-like scrolling with easing functions
   - Custom User-Agent matching Playwright's Chrome version
   - webId cookie generation to bypass slider verification
6. **Data Extraction**: Uses `window.__INITIAL_STATE__` from page (Vue state)
7. **xsecToken**: Required for reliable note access - obtained from search results
8. **Dual Transport**: Supports both stdio (default) and HTTP transport modes

## Development Guidelines

- All source in `src/`, compiled output in `dist/`
- Use absolute imports with `.js` extension (e.g., `'./xhs/index.js'`)
- Handle Vue reactive objects (`_rawValue`, `_value`, `.value`)
- Respect rate limits - 2 second delay between requests (`REQUEST_INTERVAL`)
- Publishing operations require a visible browser window
- All database operations are synchronous (better-sqlite3)
- Login runs in headless mode with QR code uploaded to temp image hosting
