# 安装配置

## 前置要求

- [Node.js](https://nodejs.org/) 18+ 或 [Bun](https://bun.sh/)
- 小红书账号

## Claude Desktop

编辑配置文件：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加以下配置：

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

重启 Claude Desktop 即可使用。

## Claude Code

### 命令行安装（推荐）

```bash
claude mcp add xhs -- npx -y @sillyl12324/xhs-mcp@latest
```

使用 `--scope` 指定作用域：

```bash
# 用户级别（所有项目可用）
claude mcp add xhs --scope user -- npx -y @sillyl12324/xhs-mcp@latest

# 项目级别（当前项目）
claude mcp add xhs --scope project -- npx -y @sillyl12324/xhs-mcp@latest
```

### 手动配置

在项目根目录创建 `.mcp.json` 文件：

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

或者添加到全局配置 `~/.claude/settings.json`：

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

### 管理命令

```bash
claude mcp list          # 查看已安装的 MCP 服务器
claude mcp remove xhs    # 移除服务器
claude mcp get xhs       # 查看服务器详情
```

## Cursor

打开 Cursor 设置，找到 MCP 配置部分，添加：

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

在 Cline 扩展设置中配置 MCP 服务器：

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

## 其他 MCP 客户端

任何支持 MCP 协议的客户端都可以使用。配置方式：

- **命令**: `npx`
- **参数**: `["-y", "@sillyl12324/xhs-mcp@latest"]`

## HTTP 模式

对于需要 HTTP 传输的客户端：

```bash
npx @sillyl12324/xhs-mcp@latest --http
npx @sillyl12324/xhs-mcp@latest --http --port 8080  # 自定义端口
```

端点：
- `POST /mcp` - MCP 协议端点
- `GET /health` - 健康检查
- `GET /` - 服务器信息

## 数据目录

所有数据存储在 `~/.xhs-mcp/` 目录（可通过 `XHS_MCP_DATA_DIR` 环境变量自定义）：

```
~/.xhs-mcp/
├── data.db          # SQLite 数据库
├── logs/            # 日志文件
│   └── xhs-mcp.log
└── downloads/       # 下载的图片和视频
    ├── images/
    └── videos/
```

## 环境变量

可通过环境变量自定义服务器行为：

| 变量 | 默认值 | 说明 |
|-----|-------|------|
| `XHS_MCP_PORT` | `18060` | HTTP 服务端口 |
| `XHS_MCP_DATA_DIR` | `~/.xhs-mcp` | 数据目录路径 |
| `XHS_MCP_LOG_LEVEL` | `debug` | 日志级别 (debug/info/warn/error) |
| `XHS_MCP_HEADLESS` | `true` | 浏览器无头模式，调试时设为 `false` |
| `XHS_MCP_REQUEST_INTERVAL` | `2000` | 请求间隔(毫秒)，用于速率限制 |
| `XHS_MCP_TIMEOUT_PAGE_LOAD` | `30000` | 页面加载超时(毫秒) |
| `XHS_MCP_TIMEOUT_VIDEO_UPLOAD` | `300000` | 视频上传超时(毫秒) |

在 MCP 配置中设置环境变量：

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

## 验证安装

配置完成后，在 MCP 客户端中调用：

```
xhs_list_accounts
```

如果返回空列表，说明安装成功。接下来请查看[快速开始](./quick-start)添加你的第一个账号。
