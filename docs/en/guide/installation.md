# Installation

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- A Xiaohongshu account

## Claude Desktop

Edit the configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:

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

Restart Claude Desktop to use.

## Claude Code

### CLI Installation (Recommended)

```bash
claude mcp add xhs -- npx -y @sillyl12324/xhs-mcp@latest
```

Use `--scope` to specify the scope:

```bash
# User level (available in all projects)
claude mcp add xhs --scope user -- npx -y @sillyl12324/xhs-mcp@latest

# Project level (current project only)
claude mcp add xhs --scope project -- npx -y @sillyl12324/xhs-mcp@latest
```

### Manual Configuration

Create a `.mcp.json` file in your project root:

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

Or add to global settings `~/.claude/settings.json`:

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

### Management Commands

```bash
claude mcp list          # List installed MCP servers
claude mcp remove xhs    # Remove a server
claude mcp get xhs       # View server details
```

## Cursor

Open Cursor settings, find the MCP configuration section, and add:

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

## Cline (VS Code)

Configure MCP server in Cline extension settings:

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

## Other MCP Clients

Any MCP-compatible client can use this server. Configuration:

- **Command**: `npx`
- **Arguments**: `["-y", "@sillyl12324/xhs-mcp@latest"]`

## HTTP Mode

For clients that require HTTP transport:

```bash
npx @sillyl12324/xhs-mcp@latest --http
npx @sillyl12324/xhs-mcp@latest --http --port 8080  # Custom port
```

Endpoints:
- `POST /mcp` - MCP protocol endpoint
- `GET /health` - Health check
- `GET /` - Server info

## Data Directory

All data is stored in `~/.xhs-mcp/` (customizable via `XHS_MCP_DATA_DIR` environment variable):

```
~/.xhs-mcp/
├── data.db          # SQLite database
├── logs/            # Log files
│   └── xhs-mcp.log
└── downloads/       # Downloaded images and videos
    ├── images/
    └── videos/
```

## Environment Variables

Customize server behavior via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `XHS_MCP_PORT` | `18060` | HTTP server port |
| `XHS_MCP_DATA_DIR` | `~/.xhs-mcp` | Data directory path |
| `XHS_MCP_LOG_LEVEL` | `debug` | Log level (debug/info/warn/error) |
| `XHS_MCP_HEADLESS` | `true` | Browser headless mode, set `false` for debugging |
| `XHS_MCP_REQUEST_INTERVAL` | `2000` | Request interval in ms (rate limiting) |
| `XHS_MCP_TIMEOUT_PAGE_LOAD` | `30000` | Page load timeout in ms |
| `XHS_MCP_TIMEOUT_VIDEO_UPLOAD` | `300000` | Video upload timeout in ms |

Set environment variables in MCP configuration:

```json
{
  "mcpServers": {
    "xhs": {
      "command": "npx",
      "args": ["-y", "@sillyl12324/xhs-mcp@latest"],
      "env": {
        "XHS_MCP_LOG_LEVEL": "info",
        "XHS_MCP_HEADLESS": "false"
      }
    }
  }
}
```

## Verify Installation

After configuration, call in your MCP client:

```
xhs_list_accounts
```

If it returns an empty list, the installation is successful. Proceed to [Quick Start](./quick-start) to add your first account.
