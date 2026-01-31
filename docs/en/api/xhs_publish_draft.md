# xhs_publish_draft

Publish a draft to Xiaohongshu.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draftId` | string | Yes | Draft ID |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account publishing |
| `scheduleTime` | string | No | Scheduled publish time (ISO 8601) |

## Response

### Single account

```json
{
  "success": true,
  "draftId": "draft-uuid",
  "noteId": "published-note-id"
}
```

### Multi-account

```json
[
  {
    "account": "account1",
    "success": true,
    "noteId": "note-id-1"
  },
  {
    "account": "account2",
    "success": true,
    "noteId": "note-id-2"
  }
]
```

## Examples

### Publish immediately

```
xhs_publish_draft({
  draftId: "draft-uuid"
})
```

### Multi-account publish

```
xhs_publish_draft({
  draftId: "draft-uuid",
  accounts: ["account1", "account2"]
})
```

### Scheduled publish

```
xhs_publish_draft({
  draftId: "draft-uuid",
  scheduleTime: "2024-01-15T10:00:00Z"
})
```

## Notes

- Draft is marked as published after successful publish
- Multi-account publish uses identical content
