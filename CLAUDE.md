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
├── logs/                     # Log files
│   └── xhs-mcp.log           # Application log
└── downloads/
    ├── images/{noteId}/
    └── videos/{noteId}/

src/
├── index.ts                  # Entry point with stdio/http mode switch
├── server.ts                 # MCP Server configuration and tool registration
├── http-server.ts            # HTTP transport server (StreamableHTTP)
├── core/
│   ├── config.ts             # Unified configuration with environment variables
│   ├── paths.ts              # Path utilities (re-exports from config)
│   ├── logger.ts             # Structured logging (console + file)
│   ├── account-pool.ts       # Multi-account client pool (池化管理)
│   ├── account-lock.ts       # Concurrent access prevention (互斥锁)
│   ├── multi-account.ts      # Multi-account operation helpers (并行/串行执行)
│   └── login-session.ts      # Multi-step login session manager
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
    │   └── browser.ts        # BrowserClient - Playwright automation (with constants config)
    └── utils/
        ├── index.ts          # Utilities (sleep, humanScroll, generateWebId)
        └── stealth.js        # Anti-detection script
```

## Available MCP Tools

### Account Management (New in v2.0)
| Tool | Description |
|------|-------------|
| `xhs_list_accounts` | List all registered accounts with status |
| `xhs_add_account` | Start login process, returns sessionId and QR code URL |
| `xhs_check_login` | Check login status after QR scan (may need verification) |
| `xhs_submit_verification` | Submit SMS verification code (if required) |
| `xhs_remove_account` | Remove an account and its data |
| `xhs_set_account_config` | Update proxy or status for an account |

### Multi-Step Login Flow

Login is now a multi-step process for better control:

```
1. xhs_add_account           → Returns { sessionId, qrCodeUrl, status: 'waiting_scan' }
   ↓
2. User scans QR code
   ↓
3. xhs_check_login(sessionId) → Returns status:
   - 'waiting_scan': Not scanned yet, call again
   - 'scanned': Processing, call again
   - 'verification_required': Need SMS code → call xhs_submit_verification
   - 'success': Login complete, account created
   - 'expired': QR expired (2 min), start over
   ↓
4. xhs_submit_verification(sessionId, code) → If verification needed
   - Code expires in 1 minute
   - Returns 'success' or error
```

Each response includes `nextAction` field guiding the next step.

QR code is generated via api.qrserver.com - works remotely without local file access.

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

## Environment Variables

All configuration can be controlled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `XHS_MCP_PORT` | `18060` | HTTP server port |
| `XHS_MCP_DATA_DIR` | `~/.xhs-mcp` | Data directory path |
| `XHS_MCP_LOG_LEVEL` | `debug` | Log level: debug, info, warn, error |
| `XHS_MCP_HEADLESS` | `true` | Browser headless mode (set `false` for debugging) |
| `XHS_MCP_REQUEST_INTERVAL` | `2000` | Request interval in ms (rate limiting) |
| `XHS_MCP_TIMEOUT_PAGE_LOAD` | `30000` | Page load timeout in ms |
| `XHS_MCP_TIMEOUT_VIDEO_UPLOAD` | `300000` | Video upload timeout in ms (5 min) |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com` | Gemini API base URL |
| `GEMINI_API_KEY` | - | Gemini API key (for future AI features) |

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
- `~/.xhs-mcp/logs/xhs-mcp.log` - Application log file (structured logging)
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
3. **Account Locking**: Prevents concurrent operations on the same account (FIFO queue)
4. **Operation Logging**: All operations are logged with timing and results
5. **Structured Logging**: Uses `createLogger()` from `core/logger.ts`, outputs to stderr and file
6. **Anti-Detection**:
   - Stealth script injection
   - Human-like scrolling with easing functions (configurable via `SCROLL_CONFIG`)
   - Custom User-Agent matching Playwright's Chrome version
   - webId cookie generation to bypass slider verification
7. **Data Extraction**: Uses `window.__INITIAL_STATE__` from page (Vue state)
8. **xsecToken**: Required for reliable note access - obtained from search results
9. **Dual Transport**: Supports both stdio (default) and HTTP transport modes
10. **Configurable Constants**: Timeouts, delays, and limits defined in constant objects (`TIMEOUTS`, `SEARCH_DEFAULTS`, `SCROLL_CONFIG`, `DELAYS`)
11. **Environment Configuration**: All major settings controllable via environment variables (see `core/config.ts`)

## Development Guidelines

- All source in `src/`, compiled output in `dist/`
- Use absolute imports with `.js` extension (e.g., `'./xhs/index.js'`)
- Handle Vue reactive objects (`_rawValue`, `_value`, `.value`)
- Respect rate limits - configurable via `XHS_MCP_REQUEST_INTERVAL` (default 2s)
- Publishing operations may require visible browser (`XHS_MCP_HEADLESS=false`)
- All database operations are synchronous (better-sqlite3)
- Login runs in headless mode by default (controllable via `XHS_MCP_HEADLESS`)
- Use `createLogger('module-name')` for logging instead of `console.error/log`
- Extract magic numbers to constant objects with Chinese comments
- All code comments should be in Chinese for consistency
