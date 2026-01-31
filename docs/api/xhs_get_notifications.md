# xhs_get_notifications

获取账号通知（评论提醒、点赞通知、新增关注）。

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 否 | 使用的账号 |
| `type` | string | 否 | 通知类型（默认 all） |
| `limit` | number | 否 | 每类通知数量（默认 20，最大 100） |

### type 通知类型

| 值 | 说明 |
|----|------|
| `all` | 全部通知（默认） |
| `mentions` | 评论和回复 |
| `likes` | 点赞通知 |
| `connections` | 新增关注 |

## 返回值

```json
{
  "account": "账号名",
  "success": true,
  "unreadCount": 5,
  "counts": {
    "mentions": 3,
    "likes": 10,
    "connections": 2
  },
  "mentions": [
    {
      "id": "notification-id",
      "type": "comment",
      "title": "通知标题",
      "time": "2024-01-01T00:00:00Z",
      "user": {
        "userId": "user-id",
        "nickname": "用户名",
        "avatar": "头像URL"
      },
      "noteId": "note-id",
      "xsecToken": "token",
      "commentId": "comment-id",
      "commentContent": "评论内容"
    }
  ],
  "likes": [...],
  "connections": [...]
}
```

## 示例

### 获取所有通知

```
xhs_get_notifications()
```

### 仅获取评论通知

```
xhs_get_notifications({
  type: "mentions",
  limit: 50
})
```

## 注意事项

- 返回的 `noteId` 和 `xsecToken` 可用于回复评论
- `commentId` 可用于 `xhs_reply_comment` 回复
