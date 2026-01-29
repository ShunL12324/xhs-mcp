# 互动功能

所有互动功能都支持单账号和多账号操作。

## 点赞

### 点赞

```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

### 取消点赞

```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  unlike: true
})
```

## 收藏

### 收藏

```
xhs_favorite_feed({
  noteId: "xxx",
  xsecToken: "yyy"
})
```

### 取消收藏

```
xhs_favorite_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  unfavorite: true
})
```

## 评论

### 发表评论

```
xhs_post_comment({
  noteId: "xxx",
  xsecToken: "yyy",
  content: "这篇笔记太棒了！"
})
```

### 回复评论

```
xhs_reply_comment({
  noteId: "xxx",
  xsecToken: "yyy",
  commentId: "comment-id",
  content: "谢谢你的喜欢！"
})
```

::: tip 获取评论 ID
评论 ID 可以从 `xhs_get_note` 返回的评论列表中获取。
:::

## 多账号互动

所有互动工具都支持 `accounts` 参数：

```
xhs_like_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  accounts: ["账号1", "账号2"]
})
```

使用所有活跃账号：

```
xhs_favorite_feed({
  noteId: "xxx",
  xsecToken: "yyy",
  accounts: "all"
})
```

## 返回结果

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
  },
  {
    "account": "账号2",
    "success": false,
    "error": "Already liked",
    "durationMs": 1200
  }
]
```

## 常见错误

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| `Not logged in` | 会话过期 | 用 `xhs_add_account` 重新登录 |
| `Rate limited` | 请求过于频繁 | 等待后重试 |
| `Note not found` | noteId 或 token 无效 | 重新搜索获取新 token |
| `Already liked` | 已经点赞过 | 无需操作 |
