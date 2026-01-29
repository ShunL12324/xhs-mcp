# xhs_favorite_feed

Favorite or unfavorite a note.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `unfavorite` | boolean | No | Unfavorite (default false) |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account |

## Response

### Single account

```json
{
  "success": true,
  "action": "favorite",
  "noteId": "xxx"
}
```

### Multi-account

```json
[
  {
    "account": "acc1",
    "success": true,
    "result": { "action": "favorite", "noteId": "xxx" },
    "durationMs": 2500
  }
]
```

## Example

### Favorite

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token"
})
```

### Unfavorite

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token",
  unfavorite: true
})
```

### Multi-account favorite

```
xhs_favorite_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: "all"
})
```
