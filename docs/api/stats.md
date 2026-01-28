# Statistics

Tools for viewing operation statistics and logs.

## xhs_get_account_stats

Get aggregated statistics for an account's operations.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |

### Response

```json
{
  "totalOperations": 150,
  "successfulOperations": 145,
  "failedOperations": 5,
  "successRate": 96.67,
  "operationsByAction": {
    "search": 50,
    "get_note": 40,
    "like": 30,
    "favorite": 15,
    "comment": 10,
    "publish_content": 5
  },
  "lastOperation": "2024-01-15T12:30:00Z"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalOperations` | number | Total operations performed |
| `successfulOperations` | number | Number of successful operations |
| `failedOperations` | number | Number of failed operations |
| `successRate` | number | Success rate percentage |
| `operationsByAction` | object | Breakdown by action type |
| `lastOperation` | string | Timestamp of last operation |

---

## xhs_get_operation_logs

Query operation history for an account.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | Yes | Account name or ID |
| `action` | string | No | Filter by action type |
| `limit` | number | No | Max results (default: 50, max: 500) |
| `offset` | number | No | Skip first N results |

### Example

Get all operations:
```json
{
  "account": "my-account",
  "limit": 100
}
```

Get only search operations:
```json
{
  "account": "my-account",
  "action": "search",
  "limit": 20
}
```

Paginate results:
```json
{
  "account": "my-account",
  "limit": 50,
  "offset": 50
}
```

### Response

```json
{
  "logs": [
    {
      "id": 1234,
      "accountId": "uuid",
      "action": "search",
      "targetId": null,
      "params": { "keyword": "美食" },
      "result": { "count": 20 },
      "success": true,
      "error": null,
      "durationMs": 3500,
      "createdAt": "2024-01-15T12:30:00Z"
    },
    {
      "id": 1233,
      "accountId": "uuid",
      "action": "like",
      "targetId": "note-123",
      "params": { "noteId": "note-123" },
      "result": { "action": "like", "noteId": "note-123" },
      "success": true,
      "error": null,
      "durationMs": 2100,
      "createdAt": "2024-01-15T12:28:00Z"
    },
    {
      "id": 1232,
      "accountId": "uuid",
      "action": "publish_content",
      "targetId": null,
      "params": { "title": "My Post" },
      "result": null,
      "success": false,
      "error": "Upload failed",
      "durationMs": 15000,
      "createdAt": "2024-01-15T12:25:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

### Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Log entry ID |
| `accountId` | string | Account UUID |
| `action` | string | Action type |
| `targetId` | string? | Target resource ID (e.g., note ID) |
| `params` | object | Operation parameters |
| `result` | object? | Operation result |
| `success` | boolean | Whether operation succeeded |
| `error` | string? | Error message if failed |
| `durationMs` | number | Operation duration in milliseconds |
| `createdAt` | string | Timestamp |

---

## Action Types

| Action | Description |
|--------|-------------|
| `search` | Search for notes |
| `get_note` | Fetch note details |
| `user_profile` | Fetch user profile |
| `list_feeds` | Get homepage feeds |
| `like` | Like a note |
| `unlike` | Unlike a note |
| `favorite` | Favorite a note |
| `unfavorite` | Unfavorite a note |
| `comment` | Post a comment |
| `reply` | Reply to a comment |
| `publish_content` | Publish image note |
| `publish_video` | Publish video note |
| `download_images` | Download images |
| `download_video` | Download video |

---

## Use Cases

### Monitor Success Rate

Track account health:
```json
xhs_get_account_stats({ account: "my-account" })
```

A declining success rate may indicate:
- Session expiration
- Rate limiting
- Platform changes

### Debug Failed Operations

Find failed operations:
```json
xhs_get_operation_logs({
  account: "my-account",
  limit: 100
})
```

Then filter for `success: false` to investigate errors.

### Audit Activity

Review all interactions with a specific note:
```json
xhs_get_operation_logs({
  account: "my-account",
  action: "like"
})
```
