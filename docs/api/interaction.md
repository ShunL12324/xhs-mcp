# Interactions

Tools for interacting with notes on Xiaohongshu.

## xhs_like_feed

Like or unlike a note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token from search |
| `unlike` | boolean | No | If true, unlike the note (default: false) |
| `account` | string | No | Single account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Example

Like a note:
```json
{
  "noteId": "abc123",
  "xsecToken": "token-from-search"
}
```

Unlike a note:
```json
{
  "noteId": "abc123",
  "xsecToken": "token-from-search",
  "unlike": true
}
```

### Response

```json
{
  "success": true,
  "action": "like",
  "noteId": "abc123"
}
```

---

## xhs_favorite_feed

Favorite (collect) or unfavorite a note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token from search |
| `unfavorite` | boolean | No | If true, unfavorite (default: false) |
| `account` | string | No | Single account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Example

```json
{
  "noteId": "abc123",
  "xsecToken": "token-from-search"
}
```

### Response

```json
{
  "success": true,
  "action": "favorite",
  "noteId": "abc123"
}
```

---

## xhs_post_comment

Post a comment on a note.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token from search |
| `content` | string | Yes | Comment content |
| `account` | string | No | Single account to use |
| `accounts` | string[] \| "all" | No | Multiple accounts |

### Example

```json
{
  "noteId": "abc123",
  "xsecToken": "token-from-search",
  "content": "Great post! 👍"
}
```

### Response

```json
{
  "success": true,
  "commentId": "comment-id-123"
}
```

---

## xhs_reply_comment

Reply to an existing comment.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `noteId` | string | Yes | Note ID |
| `xsecToken` | string | Yes | Security token from search |
| `commentId` | string | Yes | Comment ID to reply to |
| `content` | string | Yes | Reply content |
| `account` | string | No | Account to use |

### Example

```json
{
  "noteId": "abc123",
  "xsecToken": "token-from-search",
  "commentId": "comment-456",
  "content": "Thanks for your feedback!"
}
```

### Response

```json
{
  "success": true,
  "commentId": "reply-id-789"
}
```

---

## xhs_delete_cookies

Delete saved session cookies for an account.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account` | string | No | Account name or ID |

### Response

```json
{
  "success": true
}
```

---

## Multi-Account Interactions

All interaction tools support the `accounts` parameter for batch operations:

```json
{
  "noteId": "abc123",
  "xsecToken": "token",
  "accounts": ["account1", "account2", "account3"]
}
```

Or use all active accounts:

```json
{
  "noteId": "abc123",
  "xsecToken": "token",
  "accounts": "all"
}
```

### Multi-Account Response

```json
[
  {
    "account": "account1",
    "success": true,
    "result": { "success": true, "action": "like", "noteId": "abc123" },
    "durationMs": 2500
  },
  {
    "account": "account2",
    "success": true,
    "result": { "success": true, "action": "like", "noteId": "abc123" },
    "durationMs": 2300
  },
  {
    "account": "account3",
    "success": false,
    "error": "Rate limited",
    "durationMs": 1500
  }
]
```

---

## Error Handling

Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| `Not logged in` | Session expired | Re-login with `xhs_add_account` |
| `Rate limited` | Too many requests | Wait before retrying |
| `Note not found` | Invalid noteId or token | Get fresh token from search |
| `Already liked` | Note was already liked | Check `interactInfo` in note details |
