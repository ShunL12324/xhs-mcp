# Interactions

XHS-MCP provides tools for interacting with notes on Xiaohongshu.

## Like / Unlike

### Like a Note

```
xhs_like_feed({
  noteId: "note-id",
  xsecToken: "token-from-search"
})
```

### Unlike a Note

```
xhs_like_feed({
  noteId: "note-id",
  xsecToken: "token-from-search",
  unlike: true
})
```

## Favorite / Unfavorite

### Favorite (Collect) a Note

```
xhs_favorite_feed({
  noteId: "note-id",
  xsecToken: "token-from-search"
})
```

### Unfavorite a Note

```
xhs_favorite_feed({
  noteId: "note-id",
  xsecToken: "token-from-search",
  unfavorite: true
})
```

## Comments

### Post a Comment

```
xhs_post_comment({
  noteId: "note-id",
  xsecToken: "token-from-search",
  content: "Great post! 👍"
})
```

### Reply to a Comment

```
xhs_reply_comment({
  noteId: "note-id",
  xsecToken: "token-from-search",
  commentId: "comment-id",
  content: "Thanks for your comment!"
})
```

## Multi-Account Interactions

Run interactions across multiple accounts:

```
xhs_like_feed({
  noteId: "note-id",
  xsecToken: "token",
  accounts: ["account1", "account2", "account3"]
})
```

Or use all active accounts:

```
xhs_like_feed({
  noteId: "note-id",
  xsecToken: "token",
  accounts: "all"
})
```

### Response for Multi-Account

```json
[
  { "account": "account1", "success": true, "result": { "action": "like", "noteId": "..." } },
  { "account": "account2", "success": true, "result": { "action": "like", "noteId": "..." } },
  { "account": "account3", "success": false, "error": "Rate limited" }
]
```

## Response Types

### Interaction Result

```json
{
  "success": true,
  "action": "like",
  "noteId": "note-id"
}
```

### Comment Result

```json
{
  "success": true,
  "commentId": "new-comment-id"
}
```

## Session Management

### Delete Cookies

Clear the session for an account (forces re-login):

```
xhs_delete_cookies({ account: "my-account" })
```

## Best Practices

1. **Rate Limiting**: Don't interact too quickly - add delays between operations
2. **Natural Behavior**: Vary your interaction patterns to avoid detection
3. **xsecToken**: Always use the token from search results for reliable access
4. **Error Handling**: Check the `success` field and handle failures gracefully
5. **Account Rotation**: For bulk operations, rotate between multiple accounts
