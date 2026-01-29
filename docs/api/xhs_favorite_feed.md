# xhs_favorite_feed

收藏或取消收藏笔记。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteId` | string | 是 | 笔记 ID |
| `xsecToken` | string | 是 | 安全令牌 |
| `unfavorite` | boolean | 否 | 是否取消收藏（默认 false） |
| `account` | string | 否 | 使用的账号 |
| `accounts` | string[] \| "all" | 否 | 多账号操作 |

## 返回值

### 单账号

```json
{
  "success": true,
  "action": "favorite",
  "noteId": "xxx"
}
```

### 多账号

```json
[
  {
    "account": "账号1",
    "success": true,
    "result": { "action": "favorite", "noteId": "xxx" },
    "durationMs": 2500
  }
]
```

## 示例

### 收藏

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token"
})
```

### 取消收藏

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token",
  unfavorite: true
})
```

### 多账号收藏

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: "all"
})
```
