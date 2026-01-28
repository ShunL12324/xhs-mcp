# XHS MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)

A Model Context Protocol (MCP) server for Xiaohongshu (Little Red Book), enabling AI assistants to search, browse, and retrieve content from the platform.

## Features

- **Search Notes** - Search Xiaohongshu notes with keyword, supports pagination via scrolling
- **Note Details** - Get full note content including images, videos, stats, and comments
- **User Profiles** - Retrieve user information and their published notes
- **Homepage Feeds** - Browse recommended content
- **QR Code Login** - Secure authentication via mobile app scanning
- **Anti-Detection** - Stealth mode with human-like scrolling behavior

## Requirements

- Node.js 18+
- Playwright (auto-downloads Chromium)

## Installation

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
npm install
npm run build
```

## Configuration

Add to your Claude Desktop or MCP client config:

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

## Available Tools

| Tool | Description |
|------|-------------|
| `xhs_check_login` | Check current login status |
| `xhs_login` | Login via QR code (opens browser window) |
| `xhs_search` | Search notes by keyword |
| `xhs_get_note` | Get note details by ID |
| `xhs_user_profile` | Get user profile and notes |
| `xhs_list_feeds` | Get homepage recommendations |

## Usage Examples

### Login

```
1. Call xhs_check_login to verify status
2. If not logged in, call xhs_login
3. Scan the QR code with Xiaohongshu app
4. Session is saved for future use
```

### Search Notes

```json
{
  "keyword": "travel",
  "count": 50,
  "timeout": 120000
}
```

### Get Note Details

```json
{
  "noteId": "note_id_from_search",
  "xsecToken": "token_from_search"
}
```

## Technical Details

### Anti-Detection Features

- Stealth script injection
- WebId cookie generation
- Human-like scrolling with easing
- Random delays and mouse movements
- Occasional scroll-back behavior

### Session Persistence

Login state is saved to `xhs-state.json` and automatically restored on restart.

## Development

```bash
# Build
npm run build

# Run directly with TypeScript
npx tsx src/index.ts

# Test scripts
npm run test:login
npm run test:search
npm run test:note
```

## License

MIT
