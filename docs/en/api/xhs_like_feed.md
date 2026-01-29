# xhs_like_feed

Like or unlike a note.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token |
| `unlike` | boolean | No | Unlike (default false) |
| `account` | string | No | Account to use |
| `accounts` | string[] \| "all" | No | Multi-account |

## Response

### Single account

```json
{
  "success": true,
  "action": "like",
  "noteId": "xxx"
}
```

### Multi-account

```json
[
  {
    "account": "acc1",
    "success": true,
    "result": { "action": "like", "noteId": "xxx" },
    "durationMs": 2500
  }
]
```

## Example

### Like

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token"
})
```

### Unlike

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  unlike: true
})
```

### Multi-account like

```
xhs_like_feed({
  noteId: "abc123",
  xsecToken: "token",
  accounts: ["acc1", "acc2"]
})
```
