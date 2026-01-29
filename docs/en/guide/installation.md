# Installation

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) runtime
- A Xiaohongshu account

## Install from npm

```bash
npm install -g @anthropic/claude-code
npx @anthropic/mcp add @anthropic/xhs-mcp
```

Or with Bun:

```bash
bunx @anthropic/mcp add @anthropic/xhs-mcp
```

## Manual Installation

### Clone the Repository

```bash
git clone https://github.com/ShunL12324/xhs-mcp.git
cd xhs-mcp
```

### Install Dependencies

```bash
bun install
# or
npm install
```

### Build

```bash
bun run build
# or
npm run build
```

## Configure MCP Client

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xhs-mcp": {
      "command": "node",
      "args": ["/path/to/xhs-mcp/dist/index.js"]
    }
  }
}
```

### Claude Code

Add to your `.mcp.json`:

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

## HTTP Transport Mode

For web-based clients, you can run the server in HTTP mode:

```bash
bun run start:http
# or
node dist/index.js --http --port 18060
```

Endpoints:
- `POST /mcp` - MCP protocol endpoint
- `GET /health` - Health check
- `GET /` - Server info

## Verify Installation

After configuration, you should see XHS-MCP tools available in your MCP client. Try listing accounts:

```
xhs_list_accounts
```

If no accounts exist, proceed to [Quick Start](/guide/quick-start) to add your first account.
