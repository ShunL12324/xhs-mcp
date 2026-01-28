# Xiaohongshu MCP Server

## Project Overview

A Model Context Protocol (MCP) server that provides tools for interacting with Xiaohongshu (小红书/RedNote). Uses Playwright for browser automation with anti-detection measures.

## Tech Stack

- **Runtime**: Bun (also compatible with Node.js)
- **Language**: TypeScript (ESNext, strict mode)
- **Browser Automation**: Playwright
- **HTTP Framework**: Hono (for HTTP transport mode)
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod v4

## Project Structure

```
src/
├── index.ts              # Entry point with stdio/http mode switch
├── server.ts             # MCP Server configuration and tool registration
├── http-server.ts        # HTTP transport server (StreamableHTTP)
├── tools/
│   ├── auth.ts           # xhs_check_login, xhs_login
│   ├── content.ts        # xhs_search, xhs_get_note, xhs_user_profile, xhs_list_feeds
│   ├── publish.ts        # xhs_publish_content, xhs_publish_video
│   └── interaction.ts    # xhs_like_feed, xhs_favorite_feed, xhs_post_comment, xhs_reply_comment, xhs_delete_cookies
└── xhs/
    ├── index.ts          # XhsClient facade class
    ├── types.ts          # TypeScript interfaces (XhsNote, XhsSearchItem, etc.)
    ├── clients/
    │   └── browser.ts    # BrowserClient - Playwright automation logic
    └── utils/
        ├── index.ts      # Utilities (sleep, humanScroll, generateWebId)
        └── stealth.js    # Anti-detection script injected into browser
```

## Available MCP Tools

### Authentication
| Tool | Description |
|------|-------------|
| `xhs_check_login` | Check login status |
| `xhs_login` | Login via QR code (opens visible browser) |
| `xhs_delete_cookies` | Delete saved login session |

### Content Query
| Tool | Description |
|------|-------------|
| `xhs_search` | Search notes with keyword, filters, pagination via scrolling |
| `xhs_get_note` | Get note details including comments (requires xsecToken) |
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
| `xhs_like_feed` | Like/unlike a note |
| `xhs_favorite_feed` | Favorite/unfavorite a note |
| `xhs_post_comment` | Post a comment on a note |
| `xhs_reply_comment` | Reply to a comment |

### Search Filters (for xhs_search)
- `sortBy`: general, latest, most_liked, most_commented, most_collected
- `noteType`: all, video, image
- `publishTime`: all, day, week, half_year
- `searchScope`: all, viewed, not_viewed, following

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

- `xhs-state.json` - Browser session state (cookies). **DO NOT commit** - contains sensitive data.
- `src/xhs/utils/stealth.js` - Anti-detection script, large file (~50k tokens)

## Architecture Notes

1. **Session Persistence**: Login state saved to `xhs-state.json`, reloaded on startup
2. **Anti-Detection**:
   - Stealth script injection to bypass automation detection
   - Human-like scrolling with easing functions and random delays
   - Custom User-Agent matching Playwright's Chrome version
   - webId cookie generation to bypass slider verification
3. **Data Extraction**: Uses `window.__INITIAL_STATE__` from page (Vue state) rather than API calls
4. **xsecToken**: Required for reliable note access - obtained from search results
5. **Dual Transport**: Supports both stdio (default) and HTTP transport modes

## Development Guidelines

- All source in `src/`, compiled output in `dist/`
- Use absolute imports with `.js` extension (e.g., `'./xhs/index.js'`)
- Handle Vue reactive objects (`_rawValue`, `_value`, `.value`)
- Respect rate limits - 2 second delay between requests (`REQUEST_INTERVAL`)
- Publishing operations require a visible browser window
