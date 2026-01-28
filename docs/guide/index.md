# Introduction

XHS-MCP is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides tools for interacting with Xiaohongshu (小红书/RedNote). It uses Playwright for browser automation with anti-detection measures.

## Key Features

- **Multi-Account Management**: Register and manage multiple Xiaohongshu accounts with SQLite persistence
- **Headless QR Login**: Login via QR code URL without needing visual access to the browser
- **Content Operations**: Search notes, fetch details, get user profiles, browse feeds
- **Publishing**: Post image/text and video notes with scheduling support
- **Interactions**: Like, favorite, comment, and reply across accounts
- **Statistics**: Track operations and view account analytics

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MCP Client                          │
│         (Claude Desktop, Claude Code, etc.)          │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                   XHS-MCP Server                     │
│              (stdio or HTTP transport)               │
└─────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     SQLite Database     │   │     Browser Automation  │
│  (accounts, sessions,   │   │      (Playwright)       │
│   logs, interactions)   │   │                         │
└─────────────────────────┘   └─────────────────────────┘
```

## Data Storage

All data is stored in `~/.xhs-mcp/`:

```
~/.xhs-mcp/
├── data.db              # SQLite database
└── downloads/
    ├── images/{noteId}/ # Downloaded images
    └── videos/{noteId}/ # Downloaded videos
```

## Next Steps

- [Installation](/guide/installation) - Install and configure XHS-MCP
- [Quick Start](/guide/quick-start) - Get up and running in minutes
- [API Reference](/api/) - Explore all available MCP tools
