# 安装

## 使用 npx（推荐）

无需安装，直接运行：

```bash
npx @sillyl12324/xhs-mcp
```

## 全局安装

```bash
npm install -g @sillyl12324/xhs-mcp
```

安装后运行：

```bash
xhs-mcp
```

## 配置 MCP 客户端

### Claude Desktop

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

添加以下内容：

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

### Claude Code

在项目根目录创建 `.mcp.json`：

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

## HTTP 模式

如需 HTTP 传输模式：

```bash
npx @sillyl12324/xhs-mcp --http
npx @sillyl12324/xhs-mcp --http --port 8080  # 自定义端口
```

## 数据目录

所有数据存储在 `~/.xhs-mcp/` 目录：

```
~/.xhs-mcp/
├── data.db          # SQLite 数据库
└── downloads/       # 下载的图片和视频
    ├── images/
    └── videos/
```
