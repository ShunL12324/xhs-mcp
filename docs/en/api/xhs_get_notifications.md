# xhs_get_notifications

Get account notifications (comments, likes, new followers).

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account to use |
| `type` | string | No | Notification type (default: all) |
| `limit` | number | No | Per-type limit (default: 20, max: 100) |

### type options

| Value | Description |
|-------|-------------|
| `all` | All notifications (default) |
| `mentions` | Comments and replies |
| `likes` | Like notifications |
| `connections` | New followers |

## Response

```json
{
  "account": "account-name",
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
      "title": "Notification title",
      "time": "2024-01-01T00:00:00Z",
      "user": {
        "userId": "user-id",
        "nickname": "Username",
        "avatar": "avatar-url"
      },
      "noteId": "note-id",
      "xsecToken": "token",
      "commentId": "comment-id",
      "commentContent": "Comment content"
    }
  ],
  "likes": [...],
  "connections": [...]
}
```

## Examples

### Get all notifications

```
xhs_get_notifications()
```

### Get only comment notifications

```
xhs_get_notifications({
  type: "mentions",
  limit: 50
})
```

## Notes

- Returned `noteId` and `xsecToken` can be used for replying
- `commentId` can be used with `xhs_reply_comment`
