# xhs_like_feed

点赞或取消点赞笔记。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `unlike` | boolean | 否 | 是否取消点赞（默认 false） |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号操作 |

## 返回值

### 单账号

```json
{
  "success": true,
  "action": "like",
  "noteId": "xxx"
}
```

### 多账号

```json
[
  {
    "account": "账号1",
    "success": true,
    "result": { "action": "like", "noteId": "xxx" },
    "durationMs": 2500
  }
]
```

## 示例

### 点赞

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token"
})
```

### 取消点赞

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  unlike: true
})
```

### 多账号点赞

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: ["账号1", "账号2"]
})
```
