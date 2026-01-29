# xhs_get_operation_logs

Query operation logs.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `action` | string | No | Filter by action type |
| `limit` | number | No | Result count (default 50, max 500) |
| `offset` | number | No | Skip first N records |

### Action Types

| Type | Description |
|------|-------------|
| `search` | Search |
| `get_note` | Get note |
| `user_profile` | Get user profile |
| `list_feeds` | Get feeds |
| `like` | Like |
| `unlike` | Unlike |
| `favorite` | Favorite |
| `unfavorite` | Unfavorite |
| `comment` | Comment |
| `reply` | Reply |
| `publish_content` | Publish image note |
| `publish_video` | Publish video note |
| `download_images` | Download images |
| `download_video` | Download video |

## Response

```json
{
  "logs": [
    {
      "id": 1234,
      "accountId": "uuid",
      "action": "search",
      "targetId": null,
      "params": { "keyword": "food" },
      "result": { "count": 20 },
      "success": true,
      "error": null,
      "durationMs": 3500,
      "createdAt": "2024-01-15T12:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

## Example

### Get all logs

```
xhs_get_operation_logs({
  account: "main",
  limit: 100
})
```

### Filter by type

```
xhs_get_operation_logs({
  account: "main",
  action: "like"
})
```

### Pagination

```
xhs_get_operation_logs({
  account: "main",
  limit: 50,
  offset: 50
})
```

## Use Cases

- View operation history
- Debug failed operations
- Audit account activity
